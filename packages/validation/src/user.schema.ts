import { z } from 'zod';

export const updateUserProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  avatarUrl: z.string().trim().url('Invalid avatar URL').optional().nullable(),
});

export type UpdateUserProfileDto = z.infer<typeof updateUserProfileSchema>;
