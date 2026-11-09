import { z } from 'zod';

export const createClinicSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be alphanumeric with hyphens'),
  address: z.string().trim().max(255).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email('Invalid email address').optional().nullable(),
  timezone: z.string().default('Asia/Karachi'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
});

export const updateClinicSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be alphanumeric with hyphens')
    .optional(),
  address: z.string().trim().max(255).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email('Invalid email address').optional().nullable(),
  timezone: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export type CreateClinicDto = z.infer<typeof createClinicSchema>;
export type UpdateClinicDto = z.infer<typeof updateClinicSchema>;
