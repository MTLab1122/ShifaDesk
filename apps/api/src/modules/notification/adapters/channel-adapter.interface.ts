import { NotificationChannel } from '@matabai/shared';

export interface AdapterDeliveryResult {
  success: boolean;
  status: 'SUCCESS' | 'TEMPORARY_FAILURE' | 'PERMANENT_FAILURE' | 'SUPPRESSED';
  provider: string;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, any> | null;
}

export interface AdapterSendParams {
  jobId: string;
  organizationId: string;
  clinicId: string;
  recipientId: string;
  recipientType: string;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  recipientUserId?: string | null;
  recipientName: string;
  eventType: string;
  subject?: string | null;
  messageBody: string;
  templateName?: string | null;
  templateParams?: Record<string, any>;
  language?: string;
  metadata?: Record<string, any>;
}

export interface ChannelAdapter {
  readonly channel: NotificationChannel;
  send(params: AdapterSendParams): Promise<AdapterDeliveryResult>;
}
