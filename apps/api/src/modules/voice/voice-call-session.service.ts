import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  CallStatus,
  CallDirection,
  VoiceSpeakerType,
  TelephonyEventType,
  CallerVerificationStatus,
} from '@matabai/shared';

@Injectable()
export class VoiceCallSessionService {
  private readonly logger = new Logger(VoiceCallSessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sanitizes phone number to E.164 without leading spaces or dashes
   */
  private sanitizePhone(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('03') && cleaned.length === 11) {
      cleaned = '+92' + cleaned.substring(1);
    }
    return cleaned;
  }

  /**
   * Finds or creates a voice call session from telephony webhook parameters
   */
  async findOrCreateSession(params: {
    providerCallId: string;
    callerPhone: string;
    calledPhone?: string;
    direction?: string;
    clinicId?: string;
    organizationId?: string;
  }) {
    const { providerCallId, callerPhone, calledPhone } = params;
    const sanitizedCaller = this.sanitizePhone(callerPhone);
    const sanitizedCalled = calledPhone ? this.sanitizePhone(calledPhone) : '';

    // 1. Check if session already exists
    const existing = await this.prisma.voiceCallSession.findFirst({
      where: { providerCallId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        clinic: true,
        patient: true,
      },
    });

    if (existing) {
      return existing;
    }

    // 2. Identify clinic & organization
    let clinicId = params.clinicId;
    let organizationId = params.organizationId;

    if (!clinicId && sanitizedCalled) {
      // Look up integration by phone number
      const integration = await this.prisma.voiceIntegration.findFirst({
        where: { phoneNumber: sanitizedCalled, enabled: true },
      });

      if (integration) {
        clinicId = integration.clinicId;
        organizationId = integration.organizationId;
      } else {
        // Fallback to clinic with matching phone number
        const clinic = await this.prisma.clinic.findFirst({
          where: { phone: sanitizedCalled },
        });

        if (clinic) {
          clinicId = clinic.id;
          organizationId = clinic.organizationId;
        }
      }
    }

    if (!clinicId) {
      // Fallback to any active clinic
      const defaultClinic = await this.prisma.clinic.findFirst();
      if (!defaultClinic) {
        throw new NotFoundException('No clinic found to associate voice call session');
      }
      clinicId = defaultClinic.id;
      organizationId = defaultClinic.organizationId;
    }

    // 3. Look up patient by caller phone number
    const patient = await this.prisma.patient.findFirst({
      where: {
        organizationId,
        phone: sanitizedCaller,
      },
    });

    // 4. Create new voice session
    const session = await this.prisma.voiceCallSession.create({
      data: {
        organizationId: organizationId!,
        clinicId: clinicId!,
        providerCallId,
        callerPhone: sanitizedCaller,
        patientId: patient?.id || null,
        callDirection: (params.direction as any) || CallDirection.INBOUND,
        callStatus: CallStatus.IN_PROGRESS,
        startedAt: new Date(),
        verificationStatus: patient ? CallerVerificationStatus.UNVERIFIED : CallerVerificationStatus.EXEMPT,
      },
      include: {
        messages: true,
        clinic: true,
        patient: true,
      },
    });

    // 5. Record initial event
    await this.recordEvent(
      session.id,
      TelephonyEventType.CALL_INITIATED,
      {
        callerPhone: sanitizedCaller,
        calledPhone: sanitizedCalled,
        patientFound: Boolean(patient),
      },
      providerCallId
    );

    this.logger.log(`Created voice call session ${session.id} for CallSid ${providerCallId}`);
    return session;
  }

  /**
   * Retrieves a voice call session by ID or CallSid
   */
  async getSession(idOrCallSid: string) {
    const session = await this.prisma.voiceCallSession.findFirst({
      where: {
        OR: [{ id: idOrCallSid }, { providerCallId: idOrCallSid }],
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        events: { orderBy: { occurredAt: 'asc' } },
        handovers: { include: { assignedUser: true } },
        clinic: true,
        patient: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Voice call session not found: ${idOrCallSid}`);
    }

    return session;
  }

  /**
   * Adds a speech turn message to the session transcript
   */
  async addMessage(
    callSessionId: string,
    speaker: VoiceSpeakerType | string,
    messageText: string,
    language: string = 'en',
    confidenceScore?: number,
    audioUrl?: string
  ) {
    return this.prisma.voiceConversationMessage.create({
      data: {
        callSessionId,
        speaker,
        messageText,
        language,
        confidenceScore,
        audioUrl,
      },
    });
  }

  /**
   * Records an audit telephony event for the session
   */
  async recordEvent(
    callSessionId: string,
    eventType: TelephonyEventType | string,
    payload: any = {},
    providerEventId?: string
  ) {
    return this.prisma.voiceCallEvent.create({
      data: {
        callSessionId,
        eventType,
        eventPayload: payload,
        providerEventId,
        occurredAt: new Date(),
      },
    });
  }

  /**
   * Sets the caller's chosen or detected language
   */
  async setLanguage(callSessionId: string, language: 'ur' | 'ps' | 'en') {
    return this.prisma.voiceCallSession.update({
      where: { id: callSessionId },
      data: {
        selectedLanguage: language,
        detectedLanguage: language,
      },
    });
  }

  /**
   * Updates verification status of the caller
   */
  async setVerificationStatus(callSessionId: string, status: CallerVerificationStatus) {
    return this.prisma.voiceCallSession.update({
      where: { id: callSessionId },
      data: { verificationStatus: status },
    });
  }

  /**
   * Increments verification attempts
   */
  async incrementVerificationAttempts(callSessionId: string) {
    return this.prisma.voiceCallSession.update({
      where: { id: callSessionId },
      data: { verificationAttempts: { increment: 1 } },
    });
  }

  /**
   * Ends a voice call session with duration and final status
   */
  async endSession(
    callSessionId: string,
    status: CallStatus = CallStatus.COMPLETED,
    durationSeconds?: number,
    recordingUrl?: string
  ) {
    const session = await this.prisma.voiceCallSession.findUnique({
      where: { id: callSessionId },
    });

    if (!session) return null;

    const endedAt = new Date();
    const duration =
      durationSeconds !== undefined
        ? durationSeconds
        : Math.max(0, Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000));

    const updated = await this.prisma.voiceCallSession.update({
      where: { id: callSessionId },
      data: {
        callStatus: status,
        endedAt,
        durationSeconds: duration,
        recordingUrl: recordingUrl || session.recordingUrl,
      },
    });

    await this.recordEvent(callSessionId, TelephonyEventType.CALL_TERMINATED, {
      status,
      durationSeconds: duration,
      recordingUrl,
    });

    return updated;
  }

  /**
   * Queries voice call sessions with filters and pagination
   */
  async querySessions(query: {
    clinicId?: string;
    organizationId?: string;
    status?: string;
    direction?: string;
    language?: string;
    callerPhone?: string;
    handoverStatus?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      clinicId,
      organizationId,
      status,
      direction,
      language,
      callerPhone,
      handoverStatus,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = query;

    const where: any = {};

    if (clinicId) where.clinicId = clinicId;
    if (organizationId) where.organizationId = organizationId;
    if (status) where.callStatus = status;
    if (direction) where.callDirection = direction;
    if (language) where.selectedLanguage = language;
    if (callerPhone) where.callerPhone = { contains: callerPhone };
    if (handoverStatus) where.handoverStatus = handoverStatus;

    if (fromDate || toDate) {
      where.startedAt = {};
      if (fromDate) where.startedAt.gte = new Date(fromDate);
      if (toDate) where.startedAt.lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.voiceCallSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          patient: true,
          clinic: { select: { id: true, name: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.voiceCallSession.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
