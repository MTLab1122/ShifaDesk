import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@matabai/shared';
import { ChannelAdapter, AdapterSendParams, AdapterDeliveryResult } from './channel-adapter.interface';
import { WhatsAppOutboundService } from '../../whatsapp/whatsapp-outbound.service';
import { PrismaService } from '../../../common/database/prisma.service';

@Injectable()
export class WhatsAppAdapter implements ChannelAdapter {
  readonly channel = NotificationChannel.WHATSAPP;
  private readonly logger = new Logger(WhatsAppAdapter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappOutbound: WhatsAppOutboundService,
  ) {}

  async send(params: AdapterSendParams): Promise<AdapterDeliveryResult> {
    const { clinicId, recipientPhone, messageBody, templateName, templateParams, language = 'en_US' } = params;

    if (!recipientPhone) {
      return {
        success: false,
        status: 'PERMANENT_FAILURE',
        provider: 'meta_cloud_api',
        errorCode: 'RECIPIENT_PHONE_MISSING',
        errorMessage: 'Recipient phone number is required for WhatsApp notifications',
      };
    }

    try {
      // 1. Check if WhatsApp integration is connected for this clinic
      const integration = await this.prisma.whatsappIntegration.findUnique({
        where: { clinicId },
      });

      if (!integration || integration.status !== 'CONNECTED') {
        return {
          success: false,
          status: 'TEMPORARY_FAILURE',
          provider: 'meta_cloud_api',
          errorCode: 'WHATSAPP_INTEGRATION_NOT_CONNECTED',
          errorMessage: 'Clinic WhatsApp integration is not connected or active',
        };
      }

      // 2. Format parameters if provided
      const paramList: string[] = templateParams && Array.isArray(templateParams.parameters)
        ? templateParams.parameters
        : templateParams
          ? Object.values(templateParams).map(String)
          : [];

      // 3. Dispatch template or text message
      if (templateName) {
        const result = await this.whatsappOutbound.sendTemplateMessage({
          clinicId,
          to: recipientPhone,
          templateName,
          languageCode: language,
          parameters: paramList,
        });

        return {
          success: true,
          status: 'SUCCESS',
          provider: 'meta_cloud_api',
          providerMessageId: (result as any)?.whatsappMessageId || (result as any)?.id || null,
          metadata: { details: result },
        };
      } else {
        // Freeform message requires active 24h window or approved session
        const cleanTo = recipientPhone.replace(/[^0-9]/g, '');
        const contact = await this.prisma.whatsappContact.findUnique({
          where: {
            clinicId_waId: {
              clinicId,
              waId: cleanTo,
            },
          },
          include: { conversations: { orderBy: { lastCustomerMessageAt: 'desc' }, take: 1 } },
        });

        const activeConvo = contact?.conversations?.[0];
        const isWithinWindow = this.whatsappOutbound.isWithin24HourWindow(activeConvo?.lastCustomerMessageAt);

        if (!isWithinWindow) {
          return {
            success: false,
            status: 'PERMANENT_FAILURE',
            provider: 'meta_cloud_api',
            errorCode: 'OUTSIDE_24H_WINDOW_NO_TEMPLATE',
            errorMessage: 'WhatsApp freeform text outside 24h window requires an approved HSM template',
          };
        }

        const result = await this.whatsappOutbound.sendTextMessage({
          clinicId,
          to: recipientPhone,
          message: messageBody,
          conversationId: activeConvo?.id,
        });

        return {
          success: true,
          status: 'SUCCESS',
          provider: 'meta_cloud_api',
          providerMessageId: (result as any)?.whatsappMessageId || (result as any)?.id || null,
          metadata: { details: result },
        };
      }
    } catch (err: any) {
      this.logger.warn(`WhatsApp dispatch error for job ${params.jobId}: ${err.message}`);
      const isRateLimited = err?.response?.status === 429 || err?.message?.includes('rate');
      return {
        success: false,
        status: isRateLimited ? 'TEMPORARY_FAILURE' : 'PERMANENT_FAILURE',
        provider: 'meta_cloud_api',
        errorCode: isRateLimited ? 'RATE_LIMIT_EXCEEDED' : 'WHATSAPP_DISPATCH_FAILED',
        errorMessage: err.message,
      };
    }
  }
}
