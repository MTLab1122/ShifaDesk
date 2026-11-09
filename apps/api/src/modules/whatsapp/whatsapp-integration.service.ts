import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { WhatsAppEncryptionService } from './whatsapp-encryption.service';
import { MetaApiClient } from './meta-api.client';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { CreateWhatsappIntegrationInput } from '@matabai/validation';

@Injectable()
export class WhatsAppIntegrationService {
  private readonly logger = new Logger(WhatsAppIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: WhatsAppEncryptionService,
    private readonly metaClient: MetaApiClient,
  ) {}

  /**
   * Get clinic's WhatsApp integration settings with masked token
   */
  async getIntegration(_user: AuthenticatedUser, clinicId: string) {
    const integration = await this.prisma.whatsappIntegration.findUnique({
      where: { clinicId },
    });

    if (!integration) {
      return null;
    }

    return {
      id: integration.id,
      organizationId: integration.organizationId,
      clinicId: integration.clinicId,
      phoneNumberId: integration.phoneNumberId,
      wabaId: integration.wabaId,
      businessPhoneNumber: integration.businessPhoneNumber,
      displayName: integration.displayName,
      status: integration.status,
      isWebhookVerified: integration.isWebhookVerified,
      lastConnectedAt: integration.lastConnectedAt,
      hasAccessToken: Boolean(integration.accessTokenEncrypted),
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  }

  /**
   * Register or update clinic WhatsApp Cloud API integration
   */
  async upsertIntegration(_user: AuthenticatedUser, input: CreateWhatsappIntegrationInput) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: input.clinicId },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const encryptedToken = this.encryptionService.encrypt(input.accessToken);

    const integration = await this.prisma.whatsappIntegration.upsert({
      where: { clinicId: input.clinicId },
      create: {
        organizationId: clinic.organizationId,
        clinicId: input.clinicId,
        phoneNumberId: input.phoneNumberId,
        wabaId: input.wabaId,
        businessPhoneNumber: input.businessPhoneNumber,
        displayName: input.displayName || null,
        accessTokenEncrypted: encryptedToken,
        webhookVerifyToken: input.webhookVerifyToken,
        status: 'CONNECTED',
      },
      update: {
        phoneNumberId: input.phoneNumberId,
        wabaId: input.wabaId,
        businessPhoneNumber: input.businessPhoneNumber,
        displayName: input.displayName || null,
        accessTokenEncrypted: encryptedToken,
        webhookVerifyToken: input.webhookVerifyToken,
        status: 'CONNECTED',
      },
    });

    // Seed default healthcare templates if none exist
    await this.seedDefaultTemplates(clinic.organizationId, clinic.id, integration.id);

    return {
      id: integration.id,
      clinicId: integration.clinicId,
      phoneNumberId: integration.phoneNumberId,
      wabaId: integration.wabaId,
      businessPhoneNumber: integration.businessPhoneNumber,
      status: integration.status,
      isWebhookVerified: integration.isWebhookVerified,
    };
  }

  /**
   * Live health check for clinic Meta WhatsApp connection
   */
  async checkHealth(_user: AuthenticatedUser, clinicId: string) {
    const integration = await this.prisma.whatsappIntegration.findUnique({
      where: { clinicId },
    });

    const nowIso = new Date().toISOString();

    if (!integration) {
      return {
        configured: false,
        connected: false,
        status: 'NOT_CONFIGURED',
        webhookVerified: false,
        lastCheckedAt: nowIso,
      };
    }

    try {
      const accessToken = this.encryptionService.decrypt(integration.accessTokenEncrypted);
      const details = await this.metaClient.getPhoneNumberDetails(
        integration.phoneNumberId,
        accessToken,
      );

      // Successfully verified with Meta Graph API
      await this.prisma.whatsappIntegration.update({
        where: { id: integration.id },
        data: {
          status: 'CONNECTED',
          lastConnectedAt: new Date(),
        },
      });

      return {
        configured: true,
        connected: true,
        status: 'CONNECTED',
        phoneNumberId: integration.phoneNumberId,
        wabaId: integration.wabaId,
        businessPhoneNumber: details.display_phone_number || integration.businessPhoneNumber,
        verifiedName: details.verified_name || integration.displayName,
        qualityRating: details.quality_rating,
        webhookVerified: integration.isWebhookVerified,
        lastCheckedAt: nowIso,
      };
    } catch (err: any) {
      this.logger.warn(`Health check failed for clinic ${clinicId}: ${err.message}`);

      await this.prisma.whatsappIntegration.update({
        where: { id: integration.id },
        data: { status: 'ERROR' },
      });

      return {
        configured: true,
        connected: false,
        status: 'ERROR',
        phoneNumberId: integration.phoneNumberId,
        wabaId: integration.wabaId,
        businessPhoneNumber: integration.businessPhoneNumber,
        webhookVerified: integration.isWebhookVerified,
        error: err.message,
        lastCheckedAt: nowIso,
      };
    }
  }

  /**
   * List approved WhatsApp templates for a clinic
   */
  async getTemplates(_user: AuthenticatedUser, clinicId: string) {
    return this.prisma.whatsappMessageTemplate.findMany({
      where: { clinicId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Seed standard approved healthcare notification templates
   */
  private async seedDefaultTemplates(
    organizationId: string,
    clinicId: string,
    integrationId: string,
  ) {
    const defaultTemplates = [
      {
        name: 'appointment_confirmation',
        language: 'en_US',
        category: 'UTILITY',
        status: 'APPROVED',
        bodyTemplate: 'Dear {{1}}, your appointment with Dr. {{2}} has been confirmed for {{3}} at {{4}}. Token: {{5}}.',
        parameterNames: ['patient_name', 'doctor_name', 'appointment_date', 'appointment_time', 'token_number'],
      },
      {
        name: 'appointment_reminder',
        language: 'en_US',
        category: 'UTILITY',
        status: 'APPROVED',
        bodyTemplate: 'Friendly reminder: Your appointment with Dr. {{1}} is scheduled tomorrow {{2}} at {{3}}.',
        parameterNames: ['doctor_name', 'appointment_date', 'appointment_time'],
      },
      {
        name: 'queue_token_called',
        language: 'en_US',
        category: 'UTILITY',
        status: 'APPROVED',
        bodyTemplate: 'Token {{1}} is now being called! Please proceed to Room / Consultation Room {{2}} with Dr. {{3}}.',
        parameterNames: ['token_display', 'room_number', 'doctor_name'],
      },
      {
        name: 'queue_delay_notice',
        language: 'en_US',
        category: 'UTILITY',
        status: 'APPROVED',
        bodyTemplate: 'Queue update: Dr. {{1}} is currently experiencing a {{2}} minute delay due to an emergency. Your updated estimated wait time is {{3}} minutes.',
        parameterNames: ['doctor_name', 'delay_minutes', 'estimated_wait'],
      },
    ];

    for (const tpl of defaultTemplates) {
      await this.prisma.whatsappMessageTemplate.upsert({
        where: {
          clinicId_name_language: {
            clinicId,
            name: tpl.name,
            language: tpl.language,
          },
        },
        create: {
          organizationId,
          clinicId,
          integrationId,
          ...tpl,
        },
        update: {
          bodyTemplate: tpl.bodyTemplate,
          parameterNames: tpl.parameterNames,
        },
      });
    }
  }
}
