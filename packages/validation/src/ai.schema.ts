import { z } from 'zod';

export const aiLanguageEnum = z.enum(['EN', 'UR', 'PS']);
export const faqCategoryEnum = z.enum([
  'GENERAL',
  'APPOINTMENTS',
  'TIMINGS',
  'FEES',
  'LOCATION',
  'SERVICES',
]);

export const updateAiAssistantSettingsSchema = z.object({
  clinicId: z.string().uuid().nullable().optional(),
  assistantName: z.string().min(2).max(100).optional(),
  enabled: z.boolean().optional(),
  defaultLanguage: aiLanguageEnum.optional(),
  supportedLanguages: z.array(aiLanguageEnum).min(1).optional(),
  greetingMessage: z.string().min(5).max(1000).optional(),
  fallbackMessage: z.string().min(5).max(1000).optional(),
  humanHandoverEnabled: z.boolean().optional(),
  appointmentBookingEnabled: z.boolean().optional(),
  tokenLookupEnabled: z.boolean().optional(),
  clinicFaqEnabled: z.boolean().optional(),
  maxTurnsPerConversation: z.number().int().min(3).max(50).optional(),
});

export const createClinicFaqSchema = z.object({
  clinicId: z.string().uuid().nullable().optional(),
  questionEn: z.string().min(3).max(500),
  answerEn: z.string().min(3).max(2000),
  questionUr: z.string().max(500).nullable().optional(),
  answerUr: z.string().max(2000).nullable().optional(),
  questionPs: z.string().max(500).nullable().optional(),
  answerPs: z.string().max(2000).nullable().optional(),
  category: faqCategoryEnum.default('GENERAL'),
  isActive: z.boolean().default(true),
});

export const updateClinicFaqSchema = createClinicFaqSchema.partial();

export const queryClinicFaqsSchema = z.object({
  clinicId: z.string().uuid().optional(),
  category: faqCategoryEnum.optional(),
  search: z.string().optional(),
  isActive: z.preprocess((val) => (val === 'true' ? true : val === 'false' ? false : val), z.boolean().optional()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const queryAiInteractionsSchema = z.object({
  clinicId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  outcome: z.string().optional(),
  detectedIntent: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ==============================================================================
// 11 Controlled AI Tool Parameter Schemas
// ==============================================================================

export const getClinicInformationToolSchema = z.object({
  clinicId: z.string().uuid({ message: 'Valid clinic ID required' }),
});

export const searchDoctorsToolSchema = z.object({
  clinicId: z.string().uuid({ message: 'Valid clinic ID required' }),
  specialty: z.string().max(100).optional(),
  doctorName: z.string().max(100).optional(),
});

export const getDoctorAvailabilityToolSchema = z.object({
  clinicId: z.string().uuid({ message: 'Valid clinic ID required' }),
  doctorId: z.string().uuid({ message: 'Valid doctor ID required' }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be formatted YYYY-MM-DD' }),
});

export const createAppointmentToolSchema = z.object({
  clinicId: z.string().uuid({ message: 'Valid clinic ID required' }),
  doctorId: z.string().uuid({ message: 'Valid doctor ID required' }),
  patientId: z.string().uuid({ message: 'Valid patient ID required' }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reasonForVisit: z.string().max(255).optional(),
});

export const getPatientAppointmentsToolSchema = z.object({
  patientId: z.string().uuid({ message: 'Valid patient ID required' }),
  clinicId: z.string().uuid().optional(),
});

export const rescheduleAppointmentToolSchema = z.object({
  appointmentId: z.string().uuid({ message: 'Valid appointment ID required' }),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  newEndTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().max(255).optional(),
});

export const cancelAppointmentToolSchema = z.object({
  appointmentId: z.string().uuid({ message: 'Valid appointment ID required' }),
  reason: z.string().min(3).max(255),
});

export const getPatientTokenToolSchema = z.object({
  patientId: z.string().uuid({ message: 'Valid patient ID required' }),
  clinicId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
});

export const getQueueStatusToolSchema = z.object({
  clinicId: z.string().uuid({ message: 'Valid clinic ID required' }),
  doctorId: z.string().uuid().optional(),
});

export const searchClinicFaqToolSchema = z.object({
  clinicId: z.string().uuid().optional(),
  question: z.string().min(2).max(300),
  language: z.string().default('en'),
});

export const requestHumanHandoverToolSchema = z.object({
  conversationId: z.string().uuid({ message: 'Valid conversation ID required' }),
  reason: z.string().min(2).max(255),
});

export type UpdateAiAssistantSettingsInput = z.infer<typeof updateAiAssistantSettingsSchema>;
export type CreateClinicFaqInput = z.infer<typeof createClinicFaqSchema>;
export type UpdateClinicFaqInput = z.infer<typeof updateClinicFaqSchema>;
export type QueryClinicFaqsInput = z.infer<typeof queryClinicFaqsSchema>;
export type QueryAiInteractionsInput = z.infer<typeof queryAiInteractionsSchema>;

export type GetClinicInformationToolInput = z.infer<typeof getClinicInformationToolSchema>;
export type SearchDoctorsToolInput = z.infer<typeof searchDoctorsToolSchema>;
export type GetDoctorAvailabilityToolInput = z.infer<typeof getDoctorAvailabilityToolSchema>;
export type CreateAppointmentToolInput = z.infer<typeof createAppointmentToolSchema>;
export type GetPatientAppointmentsToolInput = z.infer<typeof getPatientAppointmentsToolSchema>;
export type RescheduleAppointmentToolInput = z.infer<typeof rescheduleAppointmentToolSchema>;
export type CancelAppointmentToolInput = z.infer<typeof cancelAppointmentToolSchema>;
export type GetPatientTokenToolInput = z.infer<typeof getPatientTokenToolSchema>;
export type GetQueueStatusToolInput = z.infer<typeof getQueueStatusToolSchema>;
export type SearchClinicFaqToolInput = z.infer<typeof searchClinicFaqToolSchema>;
export type RequestHumanHandoverToolInput = z.infer<typeof requestHumanHandoverToolSchema>;
