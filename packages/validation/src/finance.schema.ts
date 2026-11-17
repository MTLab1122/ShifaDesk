import { z } from 'zod';
import { paginationQuerySchema } from './common.schema.js';

// ==========================================
// Invoice Schemas
// ==========================================

export const invoiceItemSchema = z.object({
  itemType: z.enum([
    'CONSULTATION',
    'LAB_TEST',
    'LAB_PACKAGE',
    'PROCEDURE',
    'MEDICATION',
    'SERVICE',
    'CUSTOM',
  ]),
  itemReference: z.string().trim().optional(),
  description: z.string().trim().min(2, 'Description must be at least 2 characters').max(255),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
  unitPriceMinor: z.coerce.number().int().min(0, 'Unit price must be non-negative'),
  discountMinor: z.coerce.number().int().min(0).default(0),
  taxMinor: z.coerce.number().int().min(0).default(0),
});

export const createInvoiceSchema = z.object({
  clinicId: z.string().uuid('Clinic ID must be a valid UUID'),
  patientId: z.string().uuid('Patient ID must be a valid UUID'),
  appointmentId: z.string().uuid().optional().nullable(),
  laboratoryOrderId: z.string().uuid().optional().nullable(),
  relatedEntityType: z.enum(['APPOINTMENT', 'LABORATORY_ORDER', 'CONSULTATION', 'GENERAL']).optional().nullable(),
  relatedEntityId: z.string().uuid().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, 'Invoice must contain at least one line item'),
  discountMinor: z.coerce.number().int().min(0).default(0).optional(),
  discountType: z.enum(['FIXED', 'PERCENTAGE']).optional().nullable(),
  discountReason: z.string().trim().max(255).optional().nullable(),
  taxRatePercent: z.coerce.number().min(0).max(100).default(0).optional(),
  dueAt: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  currency: z.string().trim().length(3).default('PKR').optional(),
});

export const updateInvoiceSchema = z.object({
  notes: z.string().trim().max(1000).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  discountMinor: z.coerce.number().int().min(0).optional(),
  discountType: z.enum(['FIXED', 'PERCENTAGE']).optional().nullable(),
  discountReason: z.string().trim().max(255).optional().nullable(),
  taxRatePercent: z.coerce.number().min(0).max(100).optional(),
});

export const cancelInvoiceSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(3, 'Cancellation reason must be at least 3 characters')
    .max(500),
});

export const queryInvoicesSchema = paginationQuerySchema.extend({
  clinicId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z
    .enum(['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'VOIDED'])
    .optional(),
  search: z.string().trim().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ==========================================
// Payment Schemas
// ==========================================

export const collectPaymentSchema = z.object({
  clinicId: z.string().uuid('Clinic ID must be a valid UUID'),
  invoiceId: z.string().uuid('Invoice ID must be a valid UUID'),
  amountMinor: z.coerce.number().int().min(1, 'Payment amount must be greater than zero'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'RAAST', 'OTHER']),
  provider: z
    .enum(['CASH', 'MANUAL_BANK', 'RAAST_SBP', 'PAYMOB', 'SAFEPAY', 'STRIPE'])
    .default('CASH')
    .optional(),
  idempotencyKey: z.string().trim().min(8).optional().nullable(),
  bankName: z.string().trim().max(100).optional().nullable(),
  bankReference: z.string().trim().max(100).optional().nullable(),
  cardLast4: z.string().trim().length(4).optional().nullable(),
  cardBrand: z.string().trim().max(50).optional().nullable(),
  providerTransactionId: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const queryPaymentsSchema = paginationQuerySchema.extend({
  clinicId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'RAAST', 'OTHER']).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REVERSED', 'REFUNDED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ==========================================
// Refund Schemas
// ==========================================

export const requestRefundSchema = z.object({
  paymentId: z.string().uuid('Payment ID must be a valid UUID'),
  amountMinor: z.coerce.number().int().min(1, 'Refund amount must be greater than zero'),
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(500),
});

export const reviewRefundSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().trim().max(500).optional().nullable(),
});

export const queryRefundsSchema = paginationQuerySchema.extend({
  clinicId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  status: z
    .enum([
      'REQUESTED',
      'PENDING_APPROVAL',
      'APPROVED',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
      'REJECTED',
    ])
    .optional(),
});

// ==========================================
// Expense Schemas
// ==========================================

export const createExpenseCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(100),
  code: z.string().trim().min(2).max(50).toUpperCase(),
  description: z.string().trim().max(500).optional().nullable(),
});

export const createExpenseSchema = z.object({
  clinicId: z.string().uuid('Clinic ID must be a valid UUID'),
  categoryId: z.string().uuid('Category ID must be a valid UUID'),
  description: z.string().trim().min(3, 'Description must be at least 3 characters').max(255),
  amountMinor: z.coerce.number().int().min(1, 'Expense amount must be greater than zero'),
  currency: z.string().trim().length(3).default('PKR'),
  paymentMethod: z
    .enum(['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER'])
    .default('CASH'),
  vendor: z.string().trim().max(100).optional().nullable(),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  expenseDate: z.string().min(10, 'Expense date is required'),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateExpenseSchema = z.object({
  description: z.string().trim().min(3).max(255).optional(),
  amountMinor: z.coerce.number().int().min(1).optional(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER']).optional(),
  vendor: z.string().trim().max(100).optional().nullable(),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  expenseDate: z.string().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const reviewExpenseSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const queryExpensesSchema = paginationQuerySchema.extend({
  clinicId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ==========================================
// Cash Register Session Schemas
// ==========================================

export const openCashRegisterSchema = z.object({
  clinicId: z.string().uuid('Clinic ID must be a valid UUID'),
  openingBalanceMinor: z.coerce.number().int().min(0, 'Opening balance cannot be negative').default(0),
});

export const closeCashRegisterSchema = z.object({
  actualClosingMinor: z.coerce.number().int().min(0, 'Counted cash cannot be negative'),
  discrepancyReason: z.string().trim().max(500).optional().nullable(),
});

export const reopenCashRegisterSchema = z.object({
  reason: z.string().trim().min(5, 'Reopening reason must be at least 5 characters').max(500),
});

export const queryCashSessionsSchema = paginationQuerySchema.extend({
  clinicId: z.string().uuid().optional(),
  status: z.enum(['OPEN', 'CLOSED', 'REOPENED_AUDIT']).optional(),
});

// ==========================================
// Financial Analytics & Reconciliation
// ==========================================

export const queryFinancialAnalyticsSchema = z.object({
  clinicId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const manualReconciliationSchema = z.object({
  itemType: z.enum(['PAYMENT', 'BANK_RECORD', 'GATEWAY_EVENT']),
  reference: z.string().trim().min(1),
  matchedReference: z.string().trim().min(1),
  notes: z.string().trim().max(500).optional().nullable(),
});

// Types inferred from schemas
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;
export type QueryInvoicesInput = z.infer<typeof queryInvoicesSchema>;

export type CollectPaymentInput = z.infer<typeof collectPaymentSchema>;
export type QueryPaymentsInput = z.infer<typeof queryPaymentsSchema>;

export type RequestRefundInput = z.infer<typeof requestRefundSchema>;
export type ReviewRefundInput = z.infer<typeof reviewRefundSchema>;
export type QueryRefundsInput = z.infer<typeof queryRefundsSchema>;

export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ReviewExpenseInput = z.infer<typeof reviewExpenseSchema>;
export type QueryExpensesInput = z.infer<typeof queryExpensesSchema>;

export type OpenCashRegisterInput = z.infer<typeof openCashRegisterSchema>;
export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterSchema>;
export type ReopenCashRegisterInput = z.infer<typeof reopenCashRegisterSchema>;
export type QueryCashSessionsInput = z.infer<typeof queryCashSessionsSchema>;

export type QueryFinancialAnalyticsInput = z.infer<typeof queryFinancialAnalyticsSchema>;
export type ManualReconciliationInput = z.infer<typeof manualReconciliationSchema>;
