import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createAppointmentSchema = z
  .object({
    organizationId: z.string().uuid().optional(),
    clinicId: z.string().uuid('Valid clinicId is required'),
    doctorId: z.string().uuid('Valid doctorId is required'),
    patientId: z.string().uuid('Valid patientId is required'),
    appointmentDate: z.string().regex(dateRegex, 'appointmentDate must be YYYY-MM-DD'),
    startTime: z.string().regex(timeRegex, 'startTime must be HH:mm (e.g. 10:00)'),
    endTime: z.string().regex(timeRegex, 'endTime must be HH:mm (e.g. 10:20)'),
    bookingSource: z
      .enum(['ADMIN', 'RECEPTIONIST', 'PATIENT_PORTAL', 'WHATSAPP', 'VOICE'])
      .default('RECEPTIONIST'),
    reasonForVisit: z.string().max(500).optional(),
    internalNotes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      const [sh, sm] = data.startTime.split(':').map(Number);
      const [eh, em] = data.endTime.split(':').map(Number);
      if (sh === undefined || sm === undefined || eh === undefined || em === undefined) return false;
      return eh * 60 + em > sh * 60 + sm;
    },
    {
      message: 'endTime must be strictly after startTime',
      path: ['endTime'],
    },
  );

export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;

export const rescheduleAppointmentSchema = z
  .object({
    appointmentDate: z.string().regex(dateRegex, 'appointmentDate must be YYYY-MM-DD'),
    startTime: z.string().regex(timeRegex, 'startTime must be HH:mm (e.g. 10:00)'),
    endTime: z.string().regex(timeRegex, 'endTime must be HH:mm (e.g. 10:20)'),
    reason: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      const [sh, sm] = data.startTime.split(':').map(Number);
      const [eh, em] = data.endTime.split(':').map(Number);
      if (sh === undefined || sm === undefined || eh === undefined || em === undefined) return false;
      return eh * 60 + em > sh * 60 + sm;
    },
    {
      message: 'endTime must be strictly after startTime',
      path: ['endTime'],
    },
  );

export type RescheduleAppointmentDto = z.infer<typeof rescheduleAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason must be at least 3 characters').max(500),
});

export type CancelAppointmentDto = z.infer<typeof cancelAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']),
  reason: z.string().max(500).optional(),
});

export type UpdateAppointmentStatusDto = z.infer<typeof updateAppointmentStatusSchema>;

export const queryAvailabilitySchema = z.object({
  clinicId: z.string().uuid('Valid clinicId is required'),
  doctorId: z.string().uuid('Valid doctorId is required'),
  date: z.string().regex(dateRegex, 'date must be YYYY-MM-DD'),
});

export type QueryAvailabilityDto = z.infer<typeof queryAvailabilitySchema>;

export const queryAppointmentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  clinicId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.string().optional(),
  startDate: z.string().regex(dateRegex).optional(),
  endDate: z.string().regex(dateRegex).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['appointmentDate', 'startTime', 'createdAt']).default('appointmentDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type QueryAppointmentsDto = z.infer<typeof queryAppointmentsSchema>;
