import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import { TwilioVoiceAdapter } from './adapters/twilio-voice.adapter';
import { VoiceCallSessionService } from './voice-call-session.service';
import {
  TelephonyEventType,
  VoiceHandoverStatus,
  VoiceTransferStatus,
  VoiceSpeakerType,
} from '@matabai/shared';

@Injectable()
export class VoiceHandoverService {
  private readonly logger = new Logger(VoiceHandoverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly twilioAdapter: TwilioVoiceAdapter,
    private readonly sessionService: VoiceCallSessionService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Generates a concise summary from existing conversation messages
   */
  private generateCallSummary(messages: Array<{ speaker: string; messageText: string }>): string {
    if (!messages || messages.length === 0) return 'No conversation messages recorded before transfer.';
    const callerMessages = messages
      .filter((m) => m.speaker === 'CALLER')
      .map((m) => m.messageText)
      .slice(-3)
      .join(' | ');
    return callerMessages ? `Recent caller requests: ${callerMessages}` : 'Caller requested transfer immediately.';
  }

  /**
   * Initiates call transfer to human receptionist
   */
  async initiateHandover(params: {
    callSessionId: string;
    reason: string;
    assignedUserId?: string;
  }): Promise<string> {
    const session = await this.sessionService.getSession(params.callSessionId);

    // 1. Fetch clinic settings for transfer destination
    const settings = await this.prisma.voiceProviderSettings.findFirst({
      where: {
        OR: [{ clinicId: session.clinicId }, { organizationId: session.organizationId }],
      },
    });

    const targetNumber =
      settings?.humanTransferNumber ||
      session.clinic?.phone ||
      process.env.RECEPTIONIST_TRANSFER_NUMBER ||
      '+923001234567';

    // 2. Generate summary
    const summary = this.generateCallSummary(session.messages || []);

    // 3. Create VoiceHandoverRecord
    const handoverRecord = await this.prisma.voiceHandoverRecord.create({
      data: {
        callSessionId: session.id,
        transferTarget: targetNumber,
        handoverReason: params.reason,
        transferStatus: VoiceTransferStatus.PENDING,
        summary,
        assignedUserId: params.assignedUserId || null,
      },
    });

    // 4. Update session handover status
    await this.prisma.voiceCallSession.update({
      where: { id: session.id },
      data: {
        handoverStatus: VoiceHandoverStatus.TRANSFERRED,
        endReason: params.reason,
      },
    });

    // 5. Add system message
    await this.sessionService.addMessage(
      session.id,
      VoiceSpeakerType.SYSTEM,
      `Handover initiated to ${targetNumber}. Reason: ${params.reason}`,
      session.selectedLanguage || 'en'
    );

    // 6. Record handover event
    await this.sessionService.recordEvent(
      session.id,
      TelephonyEventType.HANDOVER_INITIATED,
      {
        handoverRecordId: handoverRecord.id,
        targetNumber,
        reason: params.reason,
      },
      session.providerCallId
    );

    // 7. Dispatch staff In-App alert so receptionist sees caller context before answering
    try {
      const staffMembers = await this.prisma.userProfile.findMany({
        where: {
          organizationMemberships: {
            some: {
              organizationId: session.organizationId,
              role: { in: ['RECEPTIONIST', 'CLINIC_ADMIN'] as any },
            },
          },
        },
      });

      for (const staff of staffMembers) {
        await this.prisma.inAppNotification.create({
          data: {
            organizationId: session.organizationId,
            clinicId: session.clinicId,
            recipientUserId: staff.id,
            title: 'Incoming Voice Call Transfer',
            message: `Caller ${session.callerPhone} transferred to ${targetNumber}. Reason: "${params.reason}". ${summary}`,
            category: 'OPERATIONAL',
            relatedEntityType: 'voice_call_session',
            relatedEntityId: session.id,
          },
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to dispatch staff handover alert: ${err.message}`);
    }

    // 8. Generate TwiML Dial response
    const baseUrl =
      this.configService.get<string>('VOICE_WEBHOOK_BASE_URL') ||
      'http://localhost:4000/api/v1';

    const actionUrl = `${baseUrl}/webhooks/voice/transfer-status?handoverId=${handoverRecord.id}`;

    return this.twilioAdapter.generateDialTransfer({
      transferNumber: targetNumber,
      actionUrl,
      timeoutSeconds: 25,
      whisperGreeting:
        session.selectedLanguage === 'ur'
          ? 'آپ کی کال استقبالیہ سے ملائی جا رہی ہے۔ برائے مہربانی انتظار فرمائیں۔'
          : session.selectedLanguage === 'ps'
          ? 'ستاسو اړیکه استوګنځي سره نښلول کیږي. مهرباني وکړئ انتظار وکړئ.'
          : 'Connecting your call to our receptionist. Please hold.',
    });
  }

  /**
   * Handles status callback after dial transfer completes or fails
   */
  async handleTransferStatus(params: {
    handoverId: string;
    DialCallStatus?: string;
    CallDuration?: number;
  }): Promise<string> {
    const { handoverId, DialCallStatus } = params;

    const handover = await this.prisma.voiceHandoverRecord.findUnique({
      where: { id: handoverId },
    });

    if (!handover) {
      this.logger.warn(`Handover record not found: ${handoverId}`);
      return this.twilioAdapter.generateSayAndHangup({
        text: 'Thank you for calling. Goodbye.',
        language: 'en',
      });
    }

    const isSuccess = DialCallStatus === 'completed' || DialCallStatus === 'answered';
    const status = isSuccess ? VoiceTransferStatus.COMPLETED : VoiceTransferStatus.FAILED;

    await this.prisma.voiceHandoverRecord.update({
      where: { id: handoverId },
      data: {
        transferStatus: status,
        completedAt: new Date(),
      },
    });

    await this.sessionService.recordEvent(
      handover.callSessionId,
      isSuccess ? TelephonyEventType.HANDOVER_COMPLETED : TelephonyEventType.HANDOVER_FAILED,
      { DialCallStatus, duration: params.CallDuration }
    );

    if (!isSuccess) {
      await this.prisma.voiceCallSession.update({
        where: { id: handover.callSessionId },
        data: { handoverStatus: VoiceHandoverStatus.FAILED },
      });

      return this.twilioAdapter.generateSayAndHangup({
        text: 'ہم معذرت خواہ ہیں، استقبالیہ اس وقت دستیاب نہیں۔ ہمارا عملہ آپ سے جلد رابطہ کرے گا۔ شکریہ۔',
        language: 'ur',
      });
    }

    return this.twilioAdapter.generateSayAndHangup({
      text: 'شکریہ۔ اللہ حافظ۔ Thank you. Goodbye.',
      language: 'ur',
    });
  }
}
