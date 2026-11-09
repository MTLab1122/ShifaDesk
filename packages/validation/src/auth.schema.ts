import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().trim().min(2, 'Full name is required').max(100),
  phone: z.string().trim().max(30).optional(),
  role: z
    .enum(['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PATIENT', 'LAB_STAFF'])
    .default('CLINIC_ADMIN'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  token: z.string().min(1, 'Reset token is required'),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
