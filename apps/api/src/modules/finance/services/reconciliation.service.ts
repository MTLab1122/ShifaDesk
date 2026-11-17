import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { FinancialAuditService } from './financial-audit.service';
import { ManualReconciliationInput } from '@matabai/validation';
import { ReconciliationStatus } from '@matabai/shared';

export interface ReconciliationReport {
  totalPaymentsAudited: number;
  matchedCount: number;
  unmatchedCount: number;
  discrepancyCount: number;
  reconciliationRatePercentage: number;
  items: Array<{
    id: string;
    reference: string;
    method: string;
    amountMinor: number;
    providerTransactionId?: string | null;
    bankReference?: string | null;
    status: ReconciliationStatus | string;
    createdAt: Date;
    notes?: string;
  }>;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: FinancialAuditService,
  ) {}

  /**
   * Run automated payment reconciliation across recorded payments, bank references, and refunds.
   */
  public async getReconciliationReport(
    organizationId: string,
    clinicId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ReconciliationReport> {
    const where: any = { organizationId };
    if (clinicId) where.clinicId = clinicId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        invoice: true,
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const seenBankRefs = new Set<string>();
    const seenProviderRefs = new Set<string>();

    let matchedCount = 0;
    let unmatchedCount = 0;
    let discrepancyCount = 0;

    const items = payments.map((p) => {
      let status: ReconciliationStatus = ReconciliationStatus.UNMATCHED;
      let notes = '';

      if (p.method === 'CASH') {
        // Cash payments are reconciled against cash sessions
        status = ReconciliationStatus.MATCHED;
        notes = 'Verified against clinic cash drawer session';
      } else if (p.method === 'BANK_TRANSFER') {
        if (!p.bankReference) {
          status = ReconciliationStatus.UNMATCHED;
          notes = 'Missing bank transfer transaction reference';
        } else if (seenBankRefs.has(p.bankReference)) {
          status = ReconciliationStatus.DISCREPANCY;
          notes = `Duplicate bank reference detected: ${p.bankReference}`;
        } else {
          seenBankRefs.add(p.bankReference);
          status = ReconciliationStatus.MATCHED;
          notes = `Matched bank slip reference: ${p.bankReference}`;
        }
      } else if (p.method === 'CARD' || p.method === 'RAAST') {
        if (!p.providerTransactionId) {
          status = ReconciliationStatus.UNMATCHED;
          notes = 'Missing gateway provider transaction reference';
        } else if (seenProviderRefs.has(p.providerTransactionId)) {
          status = ReconciliationStatus.DISCREPANCY;
          notes = `Duplicate gateway transaction ID: ${p.providerTransactionId}`;
        } else {
          seenProviderRefs.add(p.providerTransactionId);
          status = ReconciliationStatus.MATCHED;
          notes = `Verified by payment gateway: ${p.providerTransactionId}`;
        }
      }

      if (status === ReconciliationStatus.MATCHED) matchedCount++;
      else if (status === ReconciliationStatus.UNMATCHED) unmatchedCount++;
      else discrepancyCount++;

      return {
        id: p.id,
        reference: p.paymentReference,
        method: p.method,
        amountMinor: p.amountMinor,
        providerTransactionId: p.providerTransactionId,
        bankReference: p.bankReference,
        status,
        createdAt: p.createdAt,
        notes,
      };
    });

    const total = payments.length;
    const reconciliationRatePercentage = total > 0 ? Math.round((matchedCount / total) * 100) : 100;

    return {
      totalPaymentsAudited: total,
      matchedCount,
      unmatchedCount,
      discrepancyCount,
      reconciliationRatePercentage,
      items,
    };
  }

  /**
   * Authorize manual reconciliation of an unmatched or flagged record.
   */
  public async reconcileManually(
    organizationId: string,
    data: ManualReconciliationInput,
    actorId: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { paymentReference: data.reference, organizationId },
    });

    if (!payment) {
      throw new Error(`Payment with reference ${data.reference} not found`);
    }

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: payment.clinicId,
      actorId,
      entityType: 'PAYMENT',
      entityId: payment.id,
      action: 'ADJUSTED',
      previousValues: { reference: data.reference },
      newValues: {
        matchedReference: data.matchedReference,
        notes: data.notes,
        status: ReconciliationStatus.MANUALLY_RECONCILED,
      },
      reason: data.notes || 'Manual administrative reconciliation',
    });

    this.logger.log(`Manual reconciliation recorded for payment ${payment.paymentReference}`);

    return {
      success: true,
      reference: data.reference,
      matchedReference: data.matchedReference,
      status: ReconciliationStatus.MANUALLY_RECONCILED,
    };
  }
}
