import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  NotificationChannel,
  NotificationJobStatus,
  NotificationAttemptStatus,
  FallbackPolicy,
} from '@matabai/shared';
import { ChannelAdapter } from './adapters/channel-adapter.interface';
import { WhatsAppAdapter } from './adapters/whatsapp.adapter';
import { InAppAdapter } from './adapters/in-app.adapter';
import { EmailAdapter } from './adapters/email.adapter';
import { SmsAdapter } from './adapters/sms.adapter';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationRetryService } from './notification-retry.service';

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);
  private readonly adapters = new Map<NotificationChannel | string, ChannelAdapter>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateService: NotificationTemplateService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly retryService: NotificationRetryService,
    whatsappAdapter: WhatsAppAdapter,
    inAppAdapter: InAppAdapter,
    emailAdapter: EmailAdapter,
    smsAdapter: SmsAdapter,
  ) {
    this.adapters.set(NotificationChannel.WHATSAPP, whatsappAdapter);
    this.adapters.set(NotificationChannel.IN_APP, inAppAdapter);
    this.adapters.set(NotificationChannel.EMAIL, emailAdapter);
    this.adapters.set(NotificationChannel.SMS, smsAdapter);
  }

  /**
   * Dispatch a claimed notification job
   */
  async dispatchJob(jobId: string): Promise<boolean> {
    const job = await this.prisma.notificationJob.findUnique({
      where: { id: jobId },
      include: { template: true },
    });

    if (!job) {
      this.logger.warn(`Dispatch skipped: Job ${jobId} not found`);
      return false;
    }

    if (job.status === NotificationJobStatus.CANCELLED || job.status === NotificationJobStatus.SUPPRESSED) {
      this.logger.log(`Job ${jobId} is ${job.status}. Skipping dispatch.`);
      return false;
    }

    const payload = (job.payload as Record<string, any>) || {};
    const recipientPhone = payload.recipient_phone || payload.phone;
    const recipientEmail = payload.recipient_email || payload.email;
    const recipientName = payload.recipient_name || payload.patient_name || payload.name || 'Valued Patient';
    const recipientUserId = payload.recipient_user_id || payload.userId || (job.recipientType === 'STAFF' ? job.recipientId : undefined);
    const patientId = job.recipientType === 'PATIENT' ? job.recipientId : undefined;

    // 1. Consent / Opt-Out Check
    const consent = await this.preferenceService.checkConsent({
      organizationId: job.organizationId,
      patientId,
      userId: recipientUserId,
      channel: job.channel,
    });

    if (!consent.allowed) {
      this.logger.log(`Job ${job.id} suppressed: ${consent.reason}`);
      await this.prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: NotificationJobStatus.SUPPRESSED,
          suppressionReason: consent.reason || 'RECIPIENT_OPTED_OUT',
          claimedAt: null,
          claimedBy: null,
        },
      });

      await this.prisma.notificationEvent.create({
        data: {
          notificationJobId: job.id,
          eventType: 'SUPPRESSED',
          eventPayload: { reason: consent.reason },
        },
      });

      return false;
    }

    // 2. Quiet Hours Evaluation
    const rule = await this.prisma.notificationRule.findFirst({
      where: {
        organizationId: job.organizationId,
        clinicId: job.clinicId,
        eventType: job.eventType,
        channel: job.channel,
      },
    });

    const quietPolicy = rule?.quietHoursPolicy || 'ALLOW_IMMEDIATE';
    const priority = rule?.priority || 'NORMAL';

    const quietCheck = await this.preferenceService.evaluateQuietHours({
      clinicId: job.clinicId,
      scheduledAt: new Date(),
      policy: quietPolicy,
      priority,
    });

    if (quietCheck.isQuietHours) {
      if (quietCheck.action === 'RESCHEDULE' && quietCheck.nextAllowedTime) {
        this.logger.log(`Job ${job.id} rescheduled to ${quietCheck.nextAllowedTime.toISOString()} due to quiet hours`);
        await this.prisma.notificationJob.update({
          where: { id: job.id },
          data: {
            status: NotificationJobStatus.SCHEDULED,
            scheduledAt: quietCheck.nextAllowedTime,
            claimedAt: null,
            claimedBy: null,
          },
        });
        return false;
      }

      if (quietCheck.action === 'SUPPRESS') {
        this.logger.log(`Job ${job.id} suppressed due to quiet hours`);
        await this.prisma.notificationJob.update({
          where: { id: job.id },
          data: {
            status: NotificationJobStatus.SUPPRESSED,
            suppressionReason: quietCheck.reason || 'QUIET_HOURS',
            claimedAt: null,
            claimedBy: null,
          },
        });
        return false;
      }
    }

    // 3. Resolve & Render Template
    const template = await this.templateService.resolveTemplate(
      job.organizationId,
      job.clinicId,
      job.eventType,
      job.channel,
      payload.language || 'EN',
      job.templateId,
    );

    const rendered = this.templateService.render(template.messageBody, payload, template.subject);

    // 4. Select Primary Channel Adapter
    let activeChannel = job.channel;
    let adapter = this.adapters.get(activeChannel);

    if (!adapter) {
      this.logger.error(`No adapter registered for channel: ${activeChannel}`);
      await this.retryService.handleFailure({
        jobId: job.id,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        error: `UNSUPPORTED_CHANNEL_${activeChannel}`,
        isPermanent: true,
      });
      return false;
    }

    const sendParams = {
      jobId: job.id,
      organizationId: job.organizationId,
      clinicId: job.clinicId,
      recipientId: job.recipientId,
      recipientType: job.recipientType,
      recipientPhone,
      recipientEmail,
      recipientUserId,
      recipientName,
      eventType: job.eventType,
      subject: rendered.subject,
      messageBody: rendered.body,
      templateName: template.providerTemplateName,
      templateParams: payload,
      language: template.language,
      metadata: {
        relatedEntityType: job.relatedEntityType,
        relatedEntityId: job.relatedEntityId,
      },
    };

    const attemptNumber = job.attempts + 1;
    const attemptedAt = new Date();

    // 5. Execute Primary Delivery
    let deliveryResult = await adapter.send(sendParams);

    // 6. Handle Fallback Channel if primary delivery failed and fallback policy exists
    if (!deliveryResult.success && rule?.fallbackPolicy && rule.fallbackPolicy !== FallbackPolicy.NONE) {
      const fallbackChannel = rule.fallbackPolicy as NotificationChannel;
      const fallbackAdapter = this.adapters.get(fallbackChannel);

      if (fallbackAdapter) {
        this.logger.warn(`Primary channel ${job.channel} failed. Triggering fallback channel ${fallbackChannel} for job ${job.id}`);

        // Record failed primary attempt first
        await this.prisma.notificationAttempt.create({
          data: {
            notificationJobId: job.id,
            channel: job.channel,
            provider: deliveryResult.provider,
            providerMessageId: deliveryResult.providerMessageId,
            attemptNumber,
            status: NotificationAttemptStatus.TEMPORARY_FAILURE,
            errorCode: deliveryResult.errorCode,
            errorMessage: deliveryResult.errorMessage,
            responseMetadata: deliveryResult.metadata || {},
            attemptedAt,
            completedAt: new Date(),
          },
        });

        // Attempt fallback
        activeChannel = fallbackChannel;
        deliveryResult = await fallbackAdapter.send(sendParams);
      }
    }

    const completedAt = new Date();

    // 7. Audit Log Attempt
    await this.prisma.notificationAttempt.create({
      data: {
        notificationJobId: job.id,
        channel: activeChannel,
        provider: deliveryResult.provider,
        providerMessageId: deliveryResult.providerMessageId,
        attemptNumber,
        status: deliveryResult.success
          ? NotificationAttemptStatus.SUCCESS
          : deliveryResult.status === 'PERMANENT_FAILURE'
            ? NotificationAttemptStatus.PERMANENT_FAILURE
            : NotificationAttemptStatus.TEMPORARY_FAILURE,
        errorCode: deliveryResult.errorCode || null,
        errorMessage: deliveryResult.errorMessage || null,
        responseMetadata: deliveryResult.metadata || {},
        attemptedAt,
        completedAt,
      },
    });

    // 8. Update Job Status
    if (deliveryResult.success) {
      await this.prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: NotificationJobStatus.SENT,
          sentAt: new Date(),
          attempts: attemptNumber,
          lastError: null,
          claimedAt: null,
          claimedBy: null,
        },
      });

      await this.prisma.notificationEvent.create({
        data: {
          notificationJobId: job.id,
          eventType: 'DISPATCHED',
          providerEventId: deliveryResult.providerMessageId,
          eventPayload: {
            channel: activeChannel,
            provider: deliveryResult.provider,
            attempt: attemptNumber,
          },
        },
      });

      this.logger.log(`Job ${job.id} successfully dispatched via ${activeChannel}`);
      return true;
    } else {
      const isPermanent = deliveryResult.status === 'PERMANENT_FAILURE';
      const errorMessage = deliveryResult.errorMessage || deliveryResult.errorCode || 'DELIVERY_FAILED';

      await this.retryService.handleFailure({
        jobId: job.id,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        error: errorMessage,
        isPermanent,
      });

      return false;
    }
  }
}
