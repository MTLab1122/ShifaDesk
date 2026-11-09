import { z } from 'zod';
import { paginationQuerySchema } from './common.schema.js';

export const auditLogQuerySchema = paginationQuerySchema.extend({
  organizationId: z.string().uuid().optional(),
  clinicId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  actorUserId: z.string().uuid().optional(),
});

export type AuditLogQueryDto = z.infer<typeof auditLogQuerySchema>;

