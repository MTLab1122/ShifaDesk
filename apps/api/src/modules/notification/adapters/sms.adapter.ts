import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@matabai/shared';
import { ChannelAdapter, AdapterSendParams, AdapterDeliveryResult } from './channel-adapter.interface';

@Injectable()
export class SmsAdapter implements ChannelAdapter {
  readonly channel = NotificationChannel.SMS;
  private readonly logger = new Logger(SmsAdapter.name);

  async send(params: AdapterSendParams): Promise<AdapterDeliveryResult> {
    const { recipientPhone, messageBody } = params;

    if (!recipientPhone) {
      return {
        success: false,
        status: 'PERMANENT_FAILURE',
        provider: 'sms',
        errorCode: 'RECIPIENT_PHONE_MISSING',
        errorMessage: 'Recipient phone number is required for SMS delivery',
      };
    }

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      this.logger.warn(`SMS provider unconfigured for job ${params.jobId}. Delivery blocked.`);
      return {
        success: false,
        status: 'TEMPORARY_FAILURE',
        provider: 'twilio_sms',
        errorCode: 'SMS_PROVIDER_UNCONFIGURED',
        errorMessage: 'SMS delivery provider is not configured (TWILIO credentials missing in environment). Delivery was not simulated.',
      };
    }

    // Real dispatch via Twilio API
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const basicAuth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
      const body = new URLSearchParams({
        To: recipientPhone,
        From: twilioFromNumber,
        Body: messageBody,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Twilio API returned status ${response.status}`);
      }

      return {
        success: true,
        status: 'SUCCESS',
        provider: 'twilio_sms',
        providerMessageId: data.sid,
        metadata: data,
      };
    } catch (err: any) {
      this.logger.error(`Twilio SMS dispatch failed: ${err.message}`);
      return {
        success: false,
        status: 'TEMPORARY_FAILURE',
        provider: 'twilio_sms',
        errorCode: 'SMS_DISPATCH_FAILED',
        errorMessage: err.message,
      };
    }
  }
}
