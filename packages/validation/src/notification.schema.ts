import { z } from 'zod';

export const notificationChannelEnum = z.enum(['WHATSAPP', 'IN_APP', 'EMAIL', 'SMS']);
export const notificationEventTypeEnum = z.enum([
  'APPOINTMENT_BOOKED',
  'APPOINTMENT_CONFIRMED',
  'APPOINTMENT_RESCHEDULED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_REMINDER',
  'APPOINTMENT_MISSED',
  'TOKEN_GENERATED',
  'TOKEN_CALLED',
  'TOKEN_APPROACHING',
  'TOKEN_CANCELLED',
  'QUEUE_DELAYED',
  'QUEUE_PAUSED',
  'QUEUE_RESUMED',
  'QUEUE_CLOSED',
  'HUMAN_ASSISTANCE_REQUESTED',
  'SYSTEM_ALERT',
  'INTEGRATION_ERROR',
]);

export const notificationJobStatusEnum = z.enum([
  'PENDING',
  'SCHEDULED',
  'PROCESSING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'RETRYING',
  'DEAD_LETTER',
  'CANCELLED',
  'SUPPRESSED',
]);

export const notificationPriorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export const quietHoursPolicyEnum = z.enum(['ALLOW_IMMEDIATE', 'QUEUE_UNTIL_MORNING', 'SUPPRESS']);
export const fallbackPolicyEnum = z.enum(['NONE', 'IN_APP', 'SMS', 'EMAIL']);
export const templateApprovalStatusEnum = z.enum(['APPROVED', 'PENDING', 'REJECTED', 'NOT_REQUIRED']);
export const inAppCategoryEnum = z.enum(['OPERATIONAL', 'APPOINTMENT', 'QUEUE', 'SECURITY', 'SYSTEM']);
export const notificationConsentStatusEnum = z.enum(['OPTED_IN', 'OPTED_OUT', 'UNKNOWN']);
export const notificationConsentSourceEnum = z.enum([
  'WHATSAPP_KEYWORD',
  'PATIENT_PORTAL',
  'RECEPTIONIST_VERBAL',
  'ADMIN',
]);

// -----------------------------------------------------------------------------
// Preferences
// -----------------------------------------------------------------------------
export const saveNotificationPreferenceSchema = z.object({
  patientId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  clinicId: z.string().uuid().optional().nullable(),
  channel: notificationChannelEnum,
  enabled: z.boolean().default(true),
  consentStatus: notificationConsentStatusEnum.default('OPTED_IN'),
  consentSource: notificationConsentSourceEnum.default('ADMIN'),
}).refine(data => data.patientId || data.userId, {
  message: 'Either patientId or userId must be specified for notification preference',
});

export type SaveNotificationPreferenceDto = z.infer<typeof saveNotificationPreferenceSchema>;

export const optOutNotificationPreferenceSchema = z.object({
  patientId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  channel: notificationChannelEnum,
  reason: z.string().max(255).optional(),
}).refine(data => data.patientId || data.userId, {
  message: 'Either patientId or userId must be specified for opt-out',
});

export type OptOutNotificationPreferenceDto = z.infer<typeof optOutNotificationPreferenceSchema>;

// -----------------------------------------------------------------------------
// Rules
// -----------------------------------------------------------------------------
export const createNotificationRuleSchema = z.object({
  clinicId: z.string().uuid('Valid clinicId is required'),
  eventType: notificationEventTypeEnum,
  channel: notificationChannelEnum,
  templateId: z.string().uuid().optional().nullable(),
  enabled: z.boolean().default(true),
  scheduleOffsetMinutes: z.number().int().default(0),
  priority: notificationPriorityEnum.default('NORMAL'),
  quietHoursPolicy: quietHoursPolicyEnum.default('ALLOW_IMMEDIATE'),
  fallbackPolicy: fallbackPolicyEnum.default('NONE'),
});

export type CreateNotificationRuleDto = z.infer<typeof createNotificationRuleSchema>;

export const updateNotificationRuleSchema = createNotificationRuleSchema.partial().omit({ clinicId: true });
export type UpdateNotificationRuleDto = z.infer<typeof updateNotificationRuleSchema>;

// -----------------------------------------------------------------------------
// Templates
// -----------------------------------------------------------------------------
export const createNotificationTemplateSchema = z.object({
  clinicId: z.string().uuid().optional().nullable(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  eventType: notificationEventTypeEnum,
  channel: notificationChannelEnum,
  language: z.enum(['EN', 'UR', 'PS']).default('EN'),
  subject: z.string().max(200).optional().nullable(),
  messageBody: z.string().min(1, 'Message body is required').max(4000),
  providerTemplateName: z.string().max(100).optional().nullable(),
  approvalStatus: templateApprovalStatusEnum.default('APPROVED'),
  variablesSchema: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
});

export type CreateNotificationTemplateDto = z.infer<typeof createNotificationTemplateSchema>;

export const updateNotificationTemplateSchema = createNotificationTemplateSchema.partial();
export type UpdateNotificationTemplateDto = z.infer<typeof updateNotificationTemplateSchema>;

export const previewNotificationTemplateSchema = z.object({
  templateId: z.string().uuid().optional(),
  messageBody: z.string().optional(),
  variables: z.record(z.any()).default({}),
  language: z.enum(['EN', 'UR', 'PS']).default('EN'),
});

export type PreviewNotificationTemplateDto = z.infer<typeof previewNotificationTemplateSchema>;

// -----------------------------------------------------------------------------
// Jobs & Dispatch
// -----------------------------------------------------------------------------
export const queryNotificationJobsSchema = z.object({
  clinicId: z.string().uuid().optional(),
  channel: notificationChannelEnum.optional(),
  eventType: notificationEventTypeEnum.optional(),
  status: notificationJobStatusEnum.optional(),
  recipientId: z.string().optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type QueryNotificationJobsDto = z.infer<typeof queryNotificationJobsSchema>;

export const cancelNotificationJobSchema = z.object({
  reason: z.string().max(255).optional(),
});

export type CancelNotificationJobDto = z.infer<typeof cancelNotificationJobSchema>;

export const retryNotificationJobSchema = z.object({
  force: z.boolean().default(false),
});

export type RetryNotificationJobDto = z.infer<typeof retryNotificationJobSchema>;

// -----------------------------------------------------------------------------
// In-App Notifications
// -----------------------------------------------------------------------------
export const createInAppNotificationSchema = z.object({
  clinicId: z.string().uuid().optional().nullable(),
  recipientUserId: z.string().uuid('Valid recipientUserId is required'),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(2000),
  category: inAppCategoryEnum.default('OPERATIONAL'),
  relatedEntityType: z.string().max(50).optional().nullable(),
  relatedEntityId: z.string().max(100).optional().nullable(),
});

export type CreateInAppNotificationDto = z.infer<typeof createInAppNotificationSchema>;

export const queryInAppNotificationsSchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  category: inAppCategoryEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type QueryInAppNotificationsDto = z.infer<typeof queryInAppNotificationsSchema>;
