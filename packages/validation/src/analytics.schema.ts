import { z } from 'zod';

export const analyticsFilterSchema = z.object({
  clinicId: z.string().uuid().optional().nullable(),
  doctorId: z.string().uuid().optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  period: z.enum(['today', '7d', '30d', '90d', 'this_month', 'last_month', 'this_year', 'custom']).optional(),
  compareWithPrevious: z.coerce.boolean().default(true).optional(),
});

export const saveReportConfigurationSchema = z.object({
  name: z.string().trim().min(2, 'Report name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional().nullable(),
  category: z.enum([
    'EXECUTIVE',
    'APPOINTMENTS',
    'QUEUE',
    'PATIENTS',
    'STAFF',
    'LABORATORY',
    'FINANCE',
    'COMMUNICATIONS',
    'AI_USAGE',
  ]),
  dimensions: z.array(z.string()).default([]),
  metrics: z.array(z.string()).min(1, 'At least one metric is required'),
  filtersJson: z.record(z.any()).default({}),
  grouping: z.string().trim().max(50).optional().nullable(),
  clinicId: z.string().uuid().optional().nullable(),
});

export const updateReportConfigurationSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  dimensions: z.array(z.string()).optional(),
  metrics: z.array(z.string()).min(1).optional(),
  filtersJson: z.record(z.any()).optional(),
  grouping: z.string().trim().max(50).optional().nullable(),
});

export const runReportQuerySchema = z.object({
  category: z.enum([
    'EXECUTIVE',
    'APPOINTMENTS',
    'QUEUE',
    'PATIENTS',
    'STAFF',
    'LABORATORY',
    'FINANCE',
    'COMMUNICATIONS',
    'AI_USAGE',
  ]),
  dimensions: z.array(z.string()).default([]).optional(),
  metrics: z.array(z.string()).min(1, 'At least one metric is required'),
  clinicId: z.string().uuid().optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  grouping: z.string().trim().max(50).optional().nullable(),
  filtersJson: z.record(z.any()).default({}).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100).optional(),
});

export const exportReportSchema = z.object({
  reportName: z.string().trim().min(2).max(150),
  category: z.enum([
    'EXECUTIVE',
    'APPOINTMENTS',
    'QUEUE',
    'PATIENTS',
    'STAFF',
    'LABORATORY',
    'FINANCE',
    'COMMUNICATIONS',
    'AI_USAGE',
  ]),
  format: z.enum(['PDF', 'CSV', 'XLSX']),
  columns: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(['string', 'number', 'date', 'currency']).default('string').optional(),
    }),
  ).min(1),
  rows: z.array(z.record(z.any())),
  filtersApplied: z.record(z.any()).default({}).optional(),
  clinicId: z.string().uuid().optional().nullable(),
});

export const createScheduledReportSchema = z.object({
  name: z.string().trim().min(2).max(100),
  reportConfigurationId: z.string().uuid('Report configuration ID must be a valid UUID'),
  clinicId: z.string().uuid().optional().nullable(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  recipients: z.array(z.string().trim().min(1)).min(1, 'At least one recipient is required'),
  exportFormat: z.enum(['PDF', 'CSV', 'XLSX']).default('PDF'),
});

export const updateScheduledReportSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  recipients: z.array(z.string().trim().min(1)).min(1).optional(),
  exportFormat: z.enum(['PDF', 'CSV', 'XLSX']).optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']).optional(),
});

export type AnalyticsFilterInput = z.infer<typeof analyticsFilterSchema>;
export type SaveReportConfigurationInput = z.infer<typeof saveReportConfigurationSchema>;
export type UpdateReportConfigurationInput = z.infer<typeof updateReportConfigurationSchema>;
export type RunReportQueryInput = z.infer<typeof runReportQuerySchema>;
export type ExportReportInput = z.infer<typeof exportReportSchema>;
export type CreateScheduledReportInput = z.infer<typeof createScheduledReportSchema>;
export type UpdateScheduledReportInput = z.infer<typeof updateScheduledReportSchema>;
