import { z } from 'zod';

export const whatsappConnectionStatusEnum = z.enum(['PENDING', 'CONNECTED', 'DISCONNECTED', 'ERROR']);
export const whatsappConsentStatusEnum = z.enum(['UNKNOWN', 'OPTED_IN', 'OPTED_OUT']);
export const whatsappConversationStatusEnum = z.enum(['OPEN', 'HUMAN_HANDOVER', 'RESOLVED', 'CLOSED']);
export const whatsappMessageDirectionEnum = z.enum(['INBOUND', 'OUTBOUND']);
export const whatsappDeliveryStatusEnum = z.enum(['RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED']);
export const whatsappTemplateStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAUSED']);
export const whatsappTemplateCategoryEnum = z.enum(['UTILITY', 'MARKETING', 'AUTHENTICATION']);

export const createWhatsappIntegrationSchema = z.object({
  clinicId: z.string().uuid({ message: 'Valid clinic ID is required' }),
  phoneNumberId: z.string().min(1, { message: 'Phone Number ID is required' }).max(50),
  wabaId: z.string().min(1, { message: 'WhatsApp Business Account ID is required' }).max(50),
  businessPhoneNumber: z
    .string()
    .min(5, { message: 'Business phone number must be valid' })
    .max(20)
    .regex(/^\+?[1-9]\d{1,14}$/, { message: 'Phone number must follow E.164 format' }),
  displayName: z.string().max(100).optional(),
  accessToken: z.string().min(10, { message: 'System User Permanent Access Token is required' }),
  webhookVerifyToken: z.string().min(8, { message: 'Webhook verify token must be at least 8 characters' }).max(128),
});

export const updateWhatsappIntegrationSchema = z.object({
  phoneNumberId: z.string().min(1).max(50).optional(),
  wabaId: z.string().min(1).max(50).optional(),
  businessPhoneNumber: z
    .string()
    .min(5)
    .max(20)
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  displayName: z.string().max(100).optional(),
  accessToken: z.string().min(10).optional(),
  webhookVerifyToken: z.string().min(8).max(128).optional(),
  status: whatsappConnectionStatusEnum.optional(),
});

export const sendWhatsappTextMessageSchema = z.object({
  clinicId: z.string().uuid({ message: 'Valid clinic ID is required' }),
  to: z
    .string()
    .min(7, { message: 'Recipient phone number is required' })
    .max(20)
    .regex(/^\+?[1-9]\d{1,14}$/, { message: 'Recipient must follow E.164 format' }),
  message: z.string().min(1, { message: 'Message text cannot be empty' }).max(4096),
  conversationId: z.string().uuid().optional(),
});

export const sendWhatsappTemplateMessageSchema = z.object({
  clinicId: z.string().uuid({ message: 'Valid clinic ID is required' }),
  to: z
    .string()
    .min(7, { message: 'Recipient phone number is required' })
    .max(20)
    .regex(/^\+?[1-9]\d{1,14}$/, { message: 'Recipient must follow E.164 format' }),
  templateName: z.string().min(1, { message: 'Template name is required' }).max(100),
  languageCode: z.string().min(2).max(10).default('en_US'),
  parameters: z.array(z.string()).default([]),
  conversationId: z.string().uuid().optional(),
});

export const updateWhatsappConversationSchema = z.object({
  status: whatsappConversationStatusEnum.optional(),
  handoverReason: z.string().max(500).optional(),
  assignedUserId: z.string().uuid().nullable().optional(),
});

export const assignWhatsappConversationSchema = z.object({
  assignedUserId: z.string().uuid({ message: 'Valid user profile ID is required' }),
});

export const updateWhatsappConsentSchema = z.object({
  consentStatus: whatsappConsentStatusEnum,
  optOutReason: z.string().max(500).optional(),
});

export const whatsappWebhookQuerySchema = z.object({
  'hub.mode': z.string().min(1),
  'hub.challenge': z.string().min(1),
  'hub.verify_token': z.string().min(1),
});

export type CreateWhatsappIntegrationInput = z.infer<typeof createWhatsappIntegrationSchema>;
export type UpdateWhatsappIntegrationInput = z.infer<typeof updateWhatsappIntegrationSchema>;
export type SendWhatsappTextMessageInput = z.infer<typeof sendWhatsappTextMessageSchema>;
export type SendWhatsappTemplateMessageInput = z.infer<typeof sendWhatsappTemplateMessageSchema>;
export type UpdateWhatsappConversationInput = z.infer<typeof updateWhatsappConversationSchema>;
export type AssignWhatsappConversationInput = z.infer<typeof assignWhatsappConversationSchema>;
export type UpdateWhatsappConsentInput = z.infer<typeof updateWhatsappConsentSchema>;
export type WhatsappWebhookQueryInput = z.infer<typeof whatsappWebhookQuerySchema>;

