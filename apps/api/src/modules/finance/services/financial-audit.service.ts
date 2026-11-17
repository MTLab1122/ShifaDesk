import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';

export interface RecordFinancialAuditParams {
  organizationId: string;
  clinicId?: string | null;
  actorId: string;
  entityType: 'INVOICE' | 'PAYMENT' | 'REFUND' | 'EXPENSE' | 'CASH_REGISTER' | 'ADJUSTMENT';
  entityId: string;
  action:
    | 'CREATED'
    | 'ISSUED'
    | 'PAID'
    | 'PARTIALLY_PAID'
    | 'REFUND_REQUESTED'
    | 'REFUND_APPROVED'
    | 'REFUND_REJECTED'
    | 'REFUNDED'
    | 'CANCELLED'
    | 'VOIDED'
    | 'REGISTER_OPENED'
    | 'REGISTER_CLOSED'
    | 'REGISTER_REOPENED'
    | 'EXPENSE_APPROVED'
    | 'EXPENSE_REJECTED'
    | 'ADJUSTED';
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  reason?: string | null;
}

@Injectable()
export class FinancialAuditService {
  private readonly logger = new Logger(FinancialAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  public async recordAuditLog(params: RecordFinancialAuditParams): Promise<void> {
    try {
      await this.prisma.financialAuditLog.create({
        data: {
          organizationId: params.organizationId,
          clinicId: params.clinicId || null,
          actorId: params.actorId,
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          previousValues: (params.previousValues as any) ?? {},
          newValues: (params.newValues as any) ?? {},
          reason: params.reason || null,
        },
      });
      this.logger.log(
        `Recorded financial audit: [${params.entityType}:${params.entityId}] action=${params.action} by actor=${params.actorId}`,
      );
    } catch (err: any) {
      this.logger.error(`Failed to record financial audit log: ${err.message}`, err.stack);
    }
  }
}
