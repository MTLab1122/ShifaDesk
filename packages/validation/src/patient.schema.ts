import { z } from 'zod';

export const createPatientSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  clinicId: z.string().uuid('Invalid clinic ID'),
  userProfileId: z.string().uuid('Invalid user profile ID').optional().nullable(),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  dateOfBirth: z.string().trim().optional().nullable().or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Other']).optional().nullable(),
  phone: z.string().trim().min(7, 'Phone number must be at least 7 characters').max(30),
  email: z.string().trim().email('Invalid email address').optional().nullable().or(z.literal('')),
  address: z.string().trim().max(255).optional().nullable(),
  emergencyContactName: z.string().trim().max(100).optional().nullable(),
  emergencyContactPhone: z.string().trim().max(30).optional().nullable(),
  consentStatus: z.enum(['GRANTED', 'PENDING', 'REVOKED']).default('GRANTED'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updatePatientSchema = z.object({
  clinicId: z.string().uuid('Invalid clinic ID').optional(),
  userProfileId: z.string().uuid('Invalid user profile ID').optional().nullable(),
  fullName: z.string().trim().min(2).max(100).optional(),
  dateOfBirth: z.string().trim().optional().nullable().or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Other']).optional().nullable(),
  phone: z.string().trim().min(7).max(30).optional(),
  email: z.string().trim().email('Invalid email address').optional().nullable().or(z.literal('')),
  address: z.string().trim().max(255).optional().nullable(),
  emergencyContactName: z.string().trim().max(100).optional().nullable(),
  emergencyContactPhone: z.string().trim().max(30).optional().nullable(),
  consentStatus: z.enum(['GRANTED', 'PENDING', 'REVOKED']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updatePatientStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type CreatePatientDto = z.infer<typeof createPatientSchema>;
export type UpdatePatientDto = z.infer<typeof updatePatientSchema>;
export type UpdatePatientStatusDto = z.infer<typeof updatePatientStatusSchema>;

