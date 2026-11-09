import { z } from 'zod';

export const createDoctorSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  clinicId: z.string().uuid('Invalid clinic ID'),
  userProfileId: z.string().uuid('Invalid user profile ID').optional().nullable(),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').optional().nullable().or(z.literal('')),
  phone: z.string().trim().min(7, 'Phone number must be at least 7 characters').max(30),
  specialty: z.string().trim().min(2, 'Specialty must be at least 2 characters').max(100),
  qualification: z.string().trim().min(2, 'Qualification is required (e.g. MBBS, FCPS)').max(100),
  registrationNumber: z.string().trim().min(3, 'Registration / license number is required').max(50),
  consultationFee: z.coerce.number().min(0, 'Consultation fee cannot be negative').default(0),
  biography: z.string().trim().max(1000).optional().nullable(),
  profileImageUrl: z.string().trim().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateDoctorSchema = z.object({
  clinicId: z.string().uuid('Invalid clinic ID').optional(),
  userProfileId: z.string().uuid('Invalid user profile ID').optional().nullable(),
  fullName: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email('Invalid email address').optional().nullable().or(z.literal('')),
  phone: z.string().trim().min(7).max(30).optional(),
  specialty: z.string().trim().min(2).max(100).optional(),
  qualification: z.string().trim().min(2).max(100).optional(),
  registrationNumber: z.string().trim().min(3).max(50).optional(),
  consultationFee: z.coerce.number().min(0).optional(),
  biography: z.string().trim().max(1000).optional().nullable(),
  profileImageUrl: z.string().trim().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateDoctorStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type CreateDoctorDto = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorDto = z.infer<typeof updateDoctorSchema>;
export type UpdateDoctorStatusDto = z.infer<typeof updateDoctorStatusSchema>;
