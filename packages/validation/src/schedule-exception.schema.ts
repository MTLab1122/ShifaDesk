import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createScheduleExceptionSchema = z
  .object({
    organizationId: z.string().uuid().optional(),
    clinicId: z.string().uuid('Valid clinicId is required'),
    doctorId: z.string().uuid('Valid doctorId is required'),
    exceptionDate: z.string().regex(dateRegex, 'exceptionDate must be YYYY-MM-DD'),
    exceptionType: z.enum(['UNAVAILABLE', 'CUSTOM_HOURS']),
    startTime: z.string().regex(timeRegex).nullable().optional(),
    endTime: z.string().regex(timeRegex).nullable().optional(),
    reason: z.string().max(255).optional(),
  })
  .refine(
    (data) => {
      if (data.exceptionType === 'CUSTOM_HOURS') {
        if (!data.startTime || !data.endTime) return false;
        const [sh, sm] = data.startTime.split(':').map(Number);
        const [eh, em] = data.endTime.split(':').map(Number);
        if (sh === undefined || sm === undefined || eh === undefined || em === undefined) return false;
        return eh * 60 + em > sh * 60 + sm;
      }
      return true;
    },
    {
      message: 'CUSTOM_HOURS exception requires valid startTime and endTime where endTime > startTime',
      path: ['endTime'],
    },
  );

export type CreateScheduleExceptionDto = z.infer<typeof createScheduleExceptionSchema>;

export const updateScheduleExceptionSchema = z
  .object({
    exceptionType: z.enum(['UNAVAILABLE', 'CUSTOM_HOURS']).optional(),
    startTime: z.string().regex(timeRegex).nullable().optional(),
    endTime: z.string().regex(timeRegex).nullable().optional(),
    reason: z.string().max(255).optional(),
  })
  .refine(
    (data) => {
      if (data.exceptionType === 'CUSTOM_HOURS' || (data.startTime && data.endTime)) {
        if (data.startTime && data.endTime) {
          const [sh, sm] = data.startTime.split(':').map(Number);
          const [eh, em] = data.endTime.split(':').map(Number);
          if (sh === undefined || sm === undefined || eh === undefined || em === undefined) return false;
          return eh * 60 + em > sh * 60 + sm;
        }
      }
      return true;
    },
    {
      message: 'endTime must be after startTime for custom hours',
      path: ['endTime'],
    },
  );

export type UpdateScheduleExceptionDto = z.infer<typeof updateScheduleExceptionSchema>;
