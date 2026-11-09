import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@matabai/shared';
import { ChannelAdapter, AdapterSendParams, AdapterDeliveryResult } from './channel-adapter.interface';
import { PrismaService } from '../../../common/database/prisma.service';

@Injectable()
export class InAppAdapter implements ChannelAdapter {
  readonly channel = NotificationChannel.IN_APP;
  private readonly logger = new Logger(InAppAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(params: AdapterSendParams): Promise<AdapterDeliveryResult> {
    const {
      organizationId,
      clinicId,
      recipientUserId,
      recipientId,
      recipientType,
      subject,
      messageBody,
      eventType,
      metadata,
    } = params;

    try {
      let targetUserId = recipientUserId;

      // If no explicit recipientUserId was passed, check if recipientId is a user profile or patient
      if (!targetUserId) {
        if (recipientType === 'STAFF') {
          targetUserId = recipientId;
        } else if (recipientType === 'PATIENT') {
          const patient = await this.prisma.patient.findUnique({
            where: { id: recipientId },
            select: { userProfileId: true },
          });
          targetUserId = patient?.userProfileId || undefined;
        }
      }

      if (!targetUserId) {
        return {
          success: false,
          status: 'PERMANENT_FAILURE',
          provider: 'in_app',
          errorCode: 'NO_RECIPIENT_USER_FOUND',
          errorMessage: 'Cannot create in-app notification without a valid user account',
        };
      }

      // Map event type to InAppCategory
      let category = 'OPERATIONAL';
      if (eventType.startsWith('APPOINTMENT_')) category = 'APPOINTMENT';
      else if (eventType.startsWith('TOKEN_') || eventType.startsWith('QUEUE_')) category = 'QUEUE';
      else if (eventType.startsWith('SYSTEM_') || eventType.startsWith('INTEGRATION_')) category = 'SYSTEM';

      const inApp = await this.prisma.inAppNotification.create({
        data: {
          organizationId,
          clinicId,
          recipientUserId: targetUserId,
          title: subject || eventType.replace(/_/g, ' '),
          message: messageBody,
          category,
          relatedEntityType: metadata?.relatedEntityType || null,
          relatedEntityId: metadata?.relatedEntityId || null,
        },
      });

      return {
        success: true,
        status: 'SUCCESS',
        provider: 'in_app',
        providerMessageId: inApp.id,
        metadata: { inAppId: inApp.id },
      };
    } catch (err: any) {
      this.logger.error(`Failed to create in-app notification: ${err.message}`, err.stack);
      return {
        success: false,
        status: 'PERMANENT_FAILURE',
        provider: 'in_app',
        errorCode: 'IN_APP_CREATE_FAILED',
        errorMessage: err.message,
      };
    }
  }
}
