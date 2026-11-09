import { z } from 'zod';

export const createMembershipSchema = z.object({
  scope: z.enum(['organization', 'clinic']),
  scopeId: z.string().uuid('Invalid scope ID'),
  userProfileId: z.string().uuid('Invalid user profile ID').optional(),
  email: z.string().trim().email('Invalid email address').optional(),
  role: z.enum([
    'SUPER_ADMIN',
    'CLINIC_ADMIN',
    'DOCTOR',
    'RECEPTIONIST',
    'PATIENT',
    'LAB_STAFF',
  ]),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED']).default('ACTIVE'),
});

export const updateMembershipSchema = z.object({
  role: z
    .enum([
      'SUPER_ADMIN',
      'CLINIC_ADMIN',
      'DOCTOR',
      'RECEPTIONIST',
      'PATIENT',
      'LAB_STAFF',
    ])
    .optional(),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED', 'REVOKED']).optional(),
});

export type CreateMembershipDto = z.infer<typeof createMembershipSchema>;
export type UpdateMembershipDto = z.infer<typeof updateMembershipSchema>;
