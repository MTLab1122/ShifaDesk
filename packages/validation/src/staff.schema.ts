import { z } from 'zod';

export const createStaffSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  clinicId: z.string().uuid('Invalid clinic ID'),
  userProfileId: z.string().uuid('Invalid user profile ID').optional().nullable(),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address'),
  phone: z.string().trim().min(7, 'Phone number must be at least 7 characters').max(30),
  designation: z.string().trim().min(2, 'Designation is required (e.g. RECEPTIONIST, LAB_STAFF)').max(50),
  department: z.string().trim().min(2, 'Department is required (e.g. Reception, Laboratory)').max(50),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateStaffSchema = z.object({
  clinicId: z.string().uuid('Invalid clinic ID').optional(),
  userProfileId: z.string().uuid('Invalid user profile ID').optional().nullable(),
  fullName: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email('Invalid email address').optional(),
  phone: z.string().trim().min(7).max(30).optional(),
  designation: z.string().trim().min(2).max(50).optional(),
  department: z.string().trim().min(2).max(50).optional(),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateStaffStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type CreateStaffDto = z.infer<typeof createStaffSchema>;
export type UpdateStaffDto = z.infer<typeof updateStaffSchema>;
export type UpdateStaffStatusDto = z.infer<typeof updateStaffStatusSchema>;
