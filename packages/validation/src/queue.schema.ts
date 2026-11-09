import { z } from 'zod';

export const queueSessionStatusEnum = z.enum(['NOT_STARTED', 'ACTIVE', 'PAUSED', 'CLOSED']);
export const queueTokenStatusEnum = z.enum([
  'WAITING',
  'CALLED',
  'SERVING',
  'COMPLETED',
  'SKIPPED',
  'CANCELLED',
  'NO_SHOW',
]);
export const tokenPriorityTypeEnum = z.enum(['NORMAL', 'PRIORITY']);

export const createQueueSettingsSchema = z.object({
  clinicId: z.string().uuid({ message: 'Valid clinic ID is required' }),
  doctorId: z.string().uuid({ message: 'Valid doctor ID is required' }).nullable().optional(),
  queueName: z.string().min(2, { message: 'Queue name must be at least 2 characters' }).max(100),
  tokenPrefix: z
    .string()
    .min(1)
    .max(5)
    .regex(/^[A-Za-z0-9]+$/, { message: 'Prefix must be alphanumeric' })
    .transform((val) => val.toUpperCase()),
  tokenResetPolicy: z.enum(['DAILY']).default('DAILY'),
  allowWalkIns: z.boolean().default(true),
  allowAppointmentCheckIn: z.boolean().default(true),
  estimatedConsultationMinutes: z.number().int().min(1).max(240).default(15),
  maxQueueCapacity: z.number().int().min(1).max(1000).nullable().optional(),
  isPublicDisplayEnabled: z.boolean().default(true),
});

export const updateQueueSettingsSchema = createQueueSettingsSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

export const createQueueSessionSchema = z.object({
  clinicId: z.string().uuid({ message: 'Valid clinic ID is required' }),
  queueSettingsId: z.string().uuid({ message: 'Valid queue settings ID is required' }),
  doctorId: z.string().uuid().nullable().optional(),
  sessionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be formatted as YYYY-MM-DD' })
    .optional(),
});

export const appointmentCheckInSchema = z.object({
  appointmentId: z.string().uuid({ message: 'Valid appointment ID is required' }),
});

export const walkInCheckInSchema = z.object({
  clinicId: z.string().uuid({ message: 'Valid clinic ID is required' }),
  queueSettingsId: z.string().uuid().optional(),
  queueSessionId: z.string().uuid().optional(),
  patientId: z.string().uuid({ message: 'Valid patient ID is required' }),
  notes: z.string().max(500).optional(),
  priorityType: tokenPriorityTypeEnum.default('NORMAL'),
});

export const queueTokenActionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const updatePrioritySchema = z.object({
  priorityType: tokenPriorityTypeEnum,
  reason: z.string().max(500).optional(),
});

export const queryQueueTokensSchema = z.object({
  clinicId: z.string().uuid().optional(),
  queueSessionId: z.string().uuid().optional(),
  status: queueTokenStatusEnum.optional(),
  priorityType: tokenPriorityTypeEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const queryQueueSessionsSchema = z.object({
  clinicId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  sessionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: queueSessionStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateQueueSettingsInput = z.infer<typeof createQueueSettingsSchema>;
export type UpdateQueueSettingsInput = z.infer<typeof updateQueueSettingsSchema>;
export type CreateQueueSessionInput = z.infer<typeof createQueueSessionSchema>;
export type AppointmentCheckInInput = z.infer<typeof appointmentCheckInSchema>;
export type WalkInCheckInInput = z.infer<typeof walkInCheckInSchema>;
export type QueueTokenActionInput = z.infer<typeof queueTokenActionSchema>;
export type UpdatePriorityInput = z.infer<typeof updatePrioritySchema>;
export type QueryQueueTokensInput = z.infer<typeof queryQueueTokensSchema>;
export type QueryQueueSessionsInput = z.infer<typeof queryQueueSessionsSchema>;
