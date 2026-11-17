import { z } from 'zod';
import { paginationQuerySchema } from './common.schema.js';

// ==========================================
// Laboratory Category Schemas
// ==========================================

export const createLabCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional(),
  clinicId: z.string().uuid().optional(),
});

export const updateLabCategorySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  active: z.boolean().optional(),
});

// ==========================================
// Laboratory Test Schemas
// ==========================================

export const createLabTestSchema = z.object({
  categoryId: z.string().uuid('Category ID must be a valid UUID'),
  clinicId: z.string().uuid().optional(),
  testCode: z
    .string()
    .trim()
    .min(2, 'Test code must be at least 2 characters')
    .max(50)
    .toUpperCase(),
  testName: z.string().trim().min(2, 'Test name must be at least 2 characters').max(150),
  description: z.string().trim().max(1000).optional(),
  sampleType: z.string().trim().min(2).max(50).default('Blood'),
  collectionInstructions: z.string().trim().max(1000).optional(),
  preparationInstructions: z.string().trim().max(1000).optional(),
  processingNotes: z.string().trim().max(1000).optional(),
  turnaroundMinutes: z.coerce.number().int().min(1).default(240),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  currency: z.string().trim().length(3).default('PKR'),
  referenceRange: z.string().trim().max(255).optional(),
  unit: z.string().trim().max(50).optional(),
  resultType: z.enum(['NUMERIC', 'TEXT', 'QUALITATIVE', 'STRUCTURED']).default('NUMERIC'),
});

export const updateLabTestSchema = z.object({
  categoryId: z.string().uuid().optional(),
  testCode: z.string().trim().min(2).max(50).toUpperCase().optional(),
  testName: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  sampleType: z.string().trim().min(2).max(50).optional(),
  collectionInstructions: z.string().trim().max(1000).optional(),
  preparationInstructions: z.string().trim().max(1000).optional(),
  processingNotes: z.string().trim().max(1000).optional(),
  turnaroundMinutes: z.coerce.number().int().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  referenceRange: z.string().trim().max(255).optional(),
  unit: z.string().trim().max(50).optional(),
  resultType: z.enum(['NUMERIC', 'TEXT', 'QUALITATIVE', 'STRUCTURED']).optional(),
  active: z.boolean().optional(),
});

export const queryLabTestsSchema = paginationQuerySchema.extend({
  categoryId: z.string().uuid().optional(),
  clinicId: z.string().uuid().optional(),
  sampleType: z.string().trim().optional(),
  active: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((val) => val === 'true' || val === '1'),
});

// ==========================================
// Laboratory Package Schemas
// ==========================================

export const createLabPackageSchema = z.object({
  name: z.string().trim().min(2, 'Package name must be at least 2 characters').max(150),
  code: z.string().trim().min(2, 'Package code must be at least 2 characters').max(50).toUpperCase(),
  description: z.string().trim().max(1000).optional(),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  testIds: z.array(z.string().uuid()).min(1, 'Package must contain at least one test'),
  clinicId: z.string().uuid().optional(),
});

export const updateLabPackageSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  code: z.string().trim().min(2).max(50).toUpperCase().optional(),
  description: z.string().trim().max(1000).optional(),
  price: z.coerce.number().min(0).optional(),
  testIds: z.array(z.string().uuid()).optional(),
  active: z.boolean().optional(),
});

export const queryLabPackagesSchema = paginationQuerySchema.extend({
  clinicId: z.string().uuid().optional(),
  active: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((val) => val === 'true' || val === '1'),
});

// ==========================================
// Laboratory Order Schemas
// ==========================================

export const createLabOrderSchema = z
  .object({
    clinicId: z.string().uuid('Clinic ID must be a valid UUID'),
    patientId: z.string().uuid('Patient ID must be a valid UUID'),
    orderingDoctorId: z.string().uuid().optional().nullable(),
    appointmentId: z.string().uuid().optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    expectedCompletionDate: z.string().datetime().optional().nullable(),
    testIds: z.array(z.string().uuid()).optional().default([]),
    packageIds: z.array(z.string().uuid()).optional().default([]),
  })
  .refine(
    (data) => (data.testIds && data.testIds.length > 0) || (data.packageIds && data.packageIds.length > 0),
    {
      message: 'Order must include at least one diagnostic test or package',
      path: ['testIds'],
    },
  );

export const updateLabOrderSchema = z.object({
  orderingDoctorId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  expectedCompletionDate: z.string().datetime().optional().nullable(),
  orderStatus: z
    .enum([
      'DRAFT',
      'REGISTERED',
      'PAYMENT_PENDING',
      'CONFIRMED',
      'SAMPLE_PENDING',
      'SAMPLE_COLLECTED',
      'PROCESSING',
      'RESULTS_PENDING',
      'UNDER_REVIEW',
      'APPROVED',
      'REPORT_READY',
      'DELIVERED',
      'CANCELLED',
    ])
    .optional(),
});

export const cancelLabOrderSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(3, 'Cancellation reason must be at least 3 characters')
    .max(500),
});

export const queryLabOrdersSchema = paginationQuerySchema.extend({
  clinicId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  orderingDoctorId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  orderStatus: z.string().optional(),
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ==========================================
// Laboratory Sample Schemas
// ==========================================

export const createLabSampleSchema = z.object({
  orderId: z.string().uuid('Order ID must be a valid UUID'),
  sampleType: z.string().trim().min(2, 'Sample type required').max(50),
  collectionInstructions: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateLabSampleStatusSchema = z
  .object({
    sampleStatus: z.enum([
      'PENDING',
      'COLLECTED',
      'RECEIVED',
      'PROCESSING',
      'ACCEPTED',
      'REJECTED',
      'RECOLLECTION_REQUIRED',
      'COMPLETED',
    ]),
    rejectionReason: z.string().trim().max(500).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .refine(
    (data) => {
      if (
        (data.sampleStatus === 'REJECTED' || data.sampleStatus === 'RECOLLECTION_REQUIRED') &&
        (!data.rejectionReason || data.rejectionReason.trim().length === 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Rejection reason is required when rejecting a sample or requiring recollection',
      path: ['rejectionReason'],
    },
  );

export const queryLabSamplesSchema = paginationQuerySchema.extend({
  clinicId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  sampleStatus: z.string().optional(),
  sampleType: z.string().optional(),
  date: z.string().optional(),
});

// ==========================================
// Laboratory Result Schemas
// ==========================================

export const enterLabResultSchema = z.object({
  resultValue: z.string().trim().min(1, 'Result value is required').max(500),
  resultType: z.enum(['NUMERIC', 'TEXT', 'QUALITATIVE', 'STRUCTURED']).default('NUMERIC'),
  unit: z.string().trim().max(50).optional().nullable(),
  referenceRange: z.string().trim().max(255).optional().nullable(),
  resultNotes: z.string().trim().max(1000).optional().nullable(),
});

export const amendLabResultSchema = z.object({
  resultValue: z.string().trim().min(1, 'New result value is required').max(500),
  amendedReason: z
    .string()
    .trim()
    .min(5, 'Amendment reason must be at least 5 characters')
    .max(500),
  unit: z.string().trim().max(50).optional().nullable(),
  referenceRange: z.string().trim().max(255).optional().nullable(),
  resultNotes: z.string().trim().max(1000).optional().nullable(),
});

export const reviewLabResultSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'AMENDMENT_REQUESTED']),
  comments: z.string().trim().max(1000).optional().nullable(),
});

// ==========================================
// Laboratory Report & Delivery Schemas
// ==========================================

export const createLabReportSchema = z.object({
  orderId: z.string().uuid('Order ID must be a valid UUID'),
  version: z.coerce.number().int().min(1).default(1),
  fileName: z.string().trim().min(3).max(255).optional(),
});

export const approveLabReportSchema = z.object({
  comments: z.string().trim().max(500).optional(),
});

export const releaseLabReportSchema = z.object({
  notes: z.string().trim().max(500).optional(),
  sendNotification: z.boolean().default(true),
});

export const revokeReportAccessSchema = z.object({
  revocationReason: z.string().trim().min(3, 'Revocation reason required').max(500),
});

export const resendReportNotificationSchema = z.object({
  channel: z.enum(['WHATSAPP', 'SMS', 'EMAIL']).default('WHATSAPP'),
});

export const verifyReportAccessSchema = z.object({
  phoneNumber: z.string().trim().min(7).max(20).optional(),
  yearOfBirth: z.coerce.number().int().min(1900).max(2100).optional(),
  pin: z.string().trim().min(4).max(8).optional(),
}).refine((data) => data.phoneNumber || data.yearOfBirth || data.pin, {
  message: 'At least one identity verification factor (Phone, Year of Birth, or PIN) is required',
});

export const queryLabReportsSchema = paginationQuerySchema.extend({
  clinicId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  reportStatus: z.string().optional(),
});

export const queryLabAnalyticsSchema = z.object({
  clinicId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Inferred TypeScript Types
export type CreateLabCategoryInput = z.infer<typeof createLabCategorySchema>;
export type UpdateLabCategoryInput = z.infer<typeof updateLabCategorySchema>;
export type CreateLabTestInput = z.infer<typeof createLabTestSchema>;
export type UpdateLabTestInput = z.infer<typeof updateLabTestSchema>;
export type QueryLabTestsInput = z.infer<typeof queryLabTestsSchema>;
export type CreateLabPackageInput = z.infer<typeof createLabPackageSchema>;
export type UpdateLabPackageInput = z.infer<typeof updateLabPackageSchema>;
export type QueryLabPackagesInput = z.infer<typeof queryLabPackagesSchema>;
export type CreateLabOrderInput = z.infer<typeof createLabOrderSchema>;
export type UpdateLabOrderInput = z.infer<typeof updateLabOrderSchema>;
export type CancelLabOrderInput = z.infer<typeof cancelLabOrderSchema>;
export type QueryLabOrdersInput = z.infer<typeof queryLabOrdersSchema>;
export type CreateLabSampleInput = z.infer<typeof createLabSampleSchema>;
export type UpdateLabSampleStatusInput = z.infer<typeof updateLabSampleStatusSchema>;
export type QueryLabSamplesInput = z.infer<typeof queryLabSamplesSchema>;
export type EnterLabResultInput = z.infer<typeof enterLabResultSchema>;
export type AmendLabResultInput = z.infer<typeof amendLabResultSchema>;
export type ReviewLabResultInput = z.infer<typeof reviewLabResultSchema>;
export type CreateLabReportInput = z.infer<typeof createLabReportSchema>;
export type ApproveLabReportInput = z.infer<typeof approveLabReportSchema>;
export type ReleaseLabReportInput = z.infer<typeof releaseLabReportSchema>;
export type RevokeReportAccessInput = z.infer<typeof revokeReportAccessSchema>;
export type ResendReportNotificationInput = z.infer<typeof resendReportNotificationSchema>;
export type VerifyReportAccessInput = z.infer<typeof verifyReportAccessSchema>;
export type QueryLabReportsInput = z.infer<typeof queryLabReportsSchema>;
export type QueryLabAnalyticsInput = z.infer<typeof queryLabAnalyticsSchema>;

