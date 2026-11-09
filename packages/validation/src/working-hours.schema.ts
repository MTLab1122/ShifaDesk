import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createWorkingHoursSchema = z
  .object({
    organizationId: z.string().uuid().optional(),
    clinicId: z.string().uuid('Valid clinicId is required'),
    doctorId: z.string().uuid('Valid doctorId is required'),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(timeRegex, 'startTime must be HH:mm (e.g. 09:00)'),
    endTime: z.string().regex(timeRegex, 'endTime must be HH:mm (e.g. 17:00)'),
    slotDurationMinutes: z.number().int().min(5).max(180).default(20),
    breakStartTime: z.string().regex(timeRegex).nullable().optional(),
    breakEndTime: z.string().regex(timeRegex).nullable().optional(),
    effectiveFrom: z.string().optional(),
    effectiveUntil: z.string().nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      const [sh, sm] = data.startTime.split(':').map(Number);
      const [eh, em] = data.endTime.split(':').map(Number);
      if (sh === undefined || sm === undefined || eh === undefined || em === undefined) return false;
      return eh * 60 + em > sh * 60 + sm;
    },
    {
      message: 'endTime must be after startTime',
      path: ['endTime'],
    },
  )
  .refine(
    (data) => {
      if (!data.breakStartTime && !data.breakEndTime) return true;
      if (!data.breakStartTime || !data.breakEndTime) return false;
      const [bsh, bsm] = data.breakStartTime.split(':').map(Number);
      const [beh, bem] = data.breakEndTime.split(':').map(Number);
      const [sh, sm] = data.startTime.split(':').map(Number);
      const [eh, em] = data.endTime.split(':').map(Number);
      if (bsh === undefined || bsm === undefined || beh === undefined || bem === undefined) return false;
      if (sh === undefined || sm === undefined || eh === undefined || em === undefined) return false;
      const bStart = bsh * 60 + bsm;
      const bEnd = beh * 60 + bem;
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      return bEnd > bStart && bStart >= start && bEnd <= end;
    },
    {
      message: 'Break period must be valid and within working hours',
      path: ['breakEndTime'],
    },
  );

export type CreateWorkingHoursDto = z.infer<typeof createWorkingHoursSchema>;

export const updateWorkingHoursSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    startTime: z.string().regex(timeRegex).optional(),
    endTime: z.string().regex(timeRegex).optional(),
    slotDurationMinutes: z.number().int().min(5).max(180).optional(),
    breakStartTime: z.string().regex(timeRegex).nullable().optional(),
    breakEndTime: z.string().regex(timeRegex).nullable().optional(),
    effectiveFrom: z.string().optional(),
    effectiveUntil: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        const [sh, sm] = data.startTime.split(':').map(Number);
        const [eh, em] = data.endTime.split(':').map(Number);
        if (sh === undefined || sm === undefined || eh === undefined || em === undefined) return false;
        return eh * 60 + em > sh * 60 + sm;
      }
      return true;
    },
    {
      message: 'endTime must be after startTime',
      path: ['endTime'],
    },
  );

export type UpdateWorkingHoursDto = z.infer<typeof updateWorkingHoursSchema>;
