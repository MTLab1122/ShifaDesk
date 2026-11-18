import { z } from 'zod';

export const clinicRegistrationSchema = z.object({
  clinicName: z.string().trim().min(2, 'Clinic name must be at least 2 characters').max(120),
  clinicType: z.enum(['SINGLE_DOCTOR', 'POLYCLINIC', 'SPECIALIST', 'DIAGNOSTIC_LAB', 'HOSPITAL']).default('SINGLE_DOCTOR'),
  ownerFullName: z.string().trim().min(2, 'Owner full name must be at least 2 characters').max(100),
  ownerEmail: z.string().trim().email('Valid owner email is required'),
  ownerPhone: z.string().trim().min(10, 'Valid phone number is required').max(20),
  country: z.string().trim().min(2).default('Pakistan'),
  city: z.string().trim().min(2, 'City is required').max(80),
  address: z.string().trim().min(5, 'Address is required').max(255),
  preferredLanguage: z.enum(['en', 'ur', 'ps', 'ar']).default('en'),
  timezone: z.string().default('Asia/Karachi'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  planCode: z.string().optional().default('STARTER'),
  billingInterval: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
  startTrial: z.boolean().default(true),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms of service and privacy notice' }),
  }),
});

export type ClinicRegistrationInput = z.infer<typeof clinicRegistrationSchema>;

export const completeOnboardingSchema = z.object({
  operatingHours: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:mm'),
        endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:mm'),
        slotDurationMinutes: z.number().int().min(5).max(120).default(15),
      }),
    )
    .optional(),
  invitedStaff: z
    .array(
      z.object({
        email: z.string().email(),
        fullName: z.string().min(2),
        role: z.string(),
      }),
    )
    .optional(),
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

export const createSubscriptionPlanSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(50).toUpperCase(),
  description: z.string().trim().optional(),
  monthlyPricePaisa: z.number().int().nonnegative(),
  annualPricePaisa: z.number().int().nonnegative(),
  currency: z.string().default('PKR'),
  trialDays: z.number().int().min(0).max(90).default(14),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  features: z.array(z.string()).default([]),
  limits: z.record(z.string(), z.number()).default({}),
  gracePeriodDays: z.number().int().min(1).max(30).default(7),
  overagePolicy: z.enum(['BLOCK', 'ALLOW_WITH_CHARGE', 'WARN']).default('BLOCK'),
});

export type CreateSubscriptionPlanInput = z.infer<typeof createSubscriptionPlanSchema>;

export const updateSubscriptionPlanSchema = createSubscriptionPlanSchema.partial();
export type UpdateSubscriptionPlanInput = z.infer<typeof updateSubscriptionPlanSchema>;

export const upgradePlanSchema = z.object({
  newPlanCode: z.string().min(2),
  billingInterval: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
  applyCredit: z.boolean().default(true),
});

export type UpgradePlanInput = z.infer<typeof upgradePlanSchema>;

export const downgradePlanSchema = z.object({
  newPlanCode: z.string().min(2),
  effectiveImmediately: z.boolean().default(false),
  reason: z.string().optional(),
});

export type DowngradePlanInput = z.infer<typeof downgradePlanSchema>;

export const cancelSubscriptionSchema = z.object({
  reason: z.string().trim().min(3, 'Please provide a valid cancellation reason').max(500),
  immediately: z.boolean().default(false),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

export const submitPaymentProofSchema = z.object({
  invoiceId: z.string().uuid('Valid invoice ID required'),
  paymentMethod: z.enum(['MANUAL_BANK_TRANSFER', 'CARD', 'RAAST', 'PROMOTIONAL_CREDIT']).default('MANUAL_BANK_TRANSFER'),
  paymentReference: z.string().trim().min(3, 'Payment reference/transaction ID required').max(100),
  proofDocumentUrl: z.string().url().optional(),
  amountPaisa: z.number().int().positive('Payment amount must be greater than zero'),
});

export type SubmitPaymentProofInput = z.infer<typeof submitPaymentProofSchema>;

export const verifyPaymentSchema = z.object({
  notes: z.string().optional(),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export const rejectPaymentSchema = z.object({
  rejectionReason: z.string().trim().min(3, 'Rejection reason is required').max(500),
});

export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;

export const grantEntitlementOverrideSchema = z.object({
  featureCode: z.string().trim().min(2),
  isIncluded: z.boolean().default(true),
  limitValue: z.number().int().nullable().optional(),
  grantedReason: z.string().trim().min(3, 'Reason is required').max(500),
  expiresAt: z.string().datetime().optional().nullable(),
});

export type GrantEntitlementOverrideInput = z.infer<typeof grantEntitlementOverrideSchema>;

export const tenantStatusActionSchema = z.object({
  action: z.enum(['SUSPEND', 'REACTIVATE', 'EXTEND_TRIAL']),
  reason: z.string().trim().min(3, 'A justification is required for platform administrative actions').max(500),
  extendDays: z.number().int().positive().optional(),
});

export type TenantStatusActionInput = z.infer<typeof tenantStatusActionSchema>;

export const grantPromotionalCreditSchema = z.object({
  amountPaisa: z.number().int().positive('Credit amount must be positive in paisa'),
  reason: z.string().trim().min(3).max(500),
  expiresAt: z.string().datetime().optional().nullable(),
});

export type GrantPromotionalCreditInput = z.infer<typeof grantPromotionalCreditSchema>;

export const queryTenantUsageSchema = z.object({
  organizationId: z.string().uuid().optional(),
  billingPeriodStart: z.string().datetime().optional(),
  billingPeriodEnd: z.string().datetime().optional(),
});

export type QueryTenantUsageInput = z.infer<typeof queryTenantUsageSchema>;
