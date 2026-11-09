import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@matabai/shared';
import { ChannelAdapter, AdapterSendParams, AdapterDeliveryResult } from './channel-adapter.interface';

@Injectable()
export class EmailAdapter implements ChannelAdapter {
  readonly channel = NotificationChannel.EMAIL;
  private readonly logger = new Logger(EmailAdapter.name);

  async send(params: AdapterSendParams): Promise<AdapterDeliveryResult> {
    const { recipientEmail, subject, messageBody } = params;

    if (!recipientEmail) {
      return {
        success: false,
        status: 'PERMANENT_FAILURE',
        provider: 'email',
        errorCode: 'RECIPIENT_EMAIL_MISSING',
        errorMessage: 'Recipient email address is missing',
      };
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const smtpHost = process.env.SMTP_HOST;

    if (!resendApiKey && !smtpHost) {
      this.logger.warn(`Email provider unconfigured for job ${params.jobId}. Delivery blocked.`);
      return {
        success: false,
        status: 'TEMPORARY_FAILURE',
        provider: 'resend_or_smtp',
        errorCode: 'EMAIL_PROVIDER_UNCONFIGURED',
        errorMessage: 'Email delivery provider is not configured (RESEND_API_KEY or SMTP_HOST missing in environment). Delivery was not simulated.',
      };
    }

    // Real dispatch via Resend HTTP API if configured
    if (resendApiKey) {
      try {
        const fromEmail = process.env.EMAIL_FROM || 'notifications@matabai.com';
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [recipientEmail],
            subject: subject || 'MatabAI Clinic Notification',
            text: messageBody,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `Resend API returned status ${response.status}`);
        }

        return {
          success: true,
          status: 'SUCCESS',
          provider: 'resend',
          providerMessageId: data.id,
          metadata: data,
        };
      } catch (err: any) {
        this.logger.error(`Resend API dispatch failed: ${err.message}`);
        return {
          success: false,
          status: 'TEMPORARY_FAILURE',
          provider: 'resend',
          errorCode: 'EMAIL_DISPATCH_FAILED',
          errorMessage: err.message,
        };
      }
    }

    // SMTP configured
    return {
      success: false,
      status: 'TEMPORARY_FAILURE',
      provider: 'smtp',
      errorCode: 'SMTP_TRANSPORT_NOT_INITIALIZED',
      errorMessage: 'SMTP transport configuration pending host verification',
    };
  }
}
