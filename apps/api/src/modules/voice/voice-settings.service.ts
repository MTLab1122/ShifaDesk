import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { UpdateVoiceSettingsInput } from '@matabai/validation';

@Injectable()
export class VoiceSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves voice settings for clinic, creating defaults if missing
   */
  async getSettings(clinicId: string, organizationId: string) {
    let settings = await this.prisma.voiceProviderSettings.findFirst({
      where: { clinicId },
    });

    if (!settings) {
      settings = await this.prisma.voiceProviderSettings.create({
        data: {
          organizationId,
          clinicId,
          sttProvider: 'openai_whisper',
          ttsProvider: 'openai_tts',
          llmProvider: 'openai',
          voiceModel: 'alloy',
          voiceSpeed: 1.0,
          conversationTimeoutMs: 15000,
          maxSilenceTimeoutMs: 5000,
          maxInteractionAttempts: 3,
          enableRecording: false,
          recordingConsentMessage: 'This call may be recorded for quality and operations.',
          transcriptRetentionDays: 30,
          humanTransferNumber: null,
          ivrGreetingMessage:
            'Welcome to MatabAI clinic voice receptionist. For Urdu press 1, Da Pashto dapara 2, for English press 3.',
          enabled: true,
        },
      });
    }

    return settings;
  }

  /**
   * Updates voice settings for clinic
   */
  async updateSettings(clinicId: string, organizationId: string, input: UpdateVoiceSettingsInput) {
    const existing = await this.getSettings(clinicId, organizationId);

    return this.prisma.voiceProviderSettings.update({
      where: { id: existing.id },
      data: input,
    });
  }
}
