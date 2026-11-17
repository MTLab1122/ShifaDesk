import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { FinancialAuditService } from './financial-audit.service';
import { NotificationSchedulerService } from '../../notification/notification-scheduler.service';
import { RequestRefundInput, ReviewRefundInput, QueryRefundsInput } from '@matabai/validation';
import { InvoiceStatus, RefundStatus, NotificationEventType } from '@matabai/shared';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: FinancialAuditService,
    private readonly notificationScheduler: NotificationSchedulerService,
  ) {}

  /**
   * Generates sequential unique refund reference: REF-YYYYMM-XXXX
   */
  public async generateRefundReference(organizationId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const prefix = `REF-${yearMonth}-`;

    const count = await this.prisma.refund.count({
      where: {
        organizationId,
        refundReference: { startsWith: prefix },
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  /**
   * Request a new refund against a confirmed payment.
   */
  public async requestRefund(
    organizationId: string,
    data: RequestRefundInput,
    actorId: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: data.paymentId, organizationId },
      include: {
        invoice: { include: { patient: true, clinic: true } },
        refunds: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${data.paymentId} not found`);
    }

    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Only COMPLETED payments can be refunded. Current payment status: ${payment.status}`,
      );
    }

    // Calculate previously refunded or pending refund amount
    const previouslyRefundedMinor = payment.refunds
      .filter((r) => r.status === 'COMPLETED' || r.status === 'PENDING_APPROVAL' || r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.amountMinor, 0);

    const availableRefundableMinor = payment.amountMinor - previouslyRefundedMinor;

    if (data.amountMinor > availableRefundableMinor) {
      const pkrRequested = (data.amountMinor / 100).toFixed(2);
      const pkrAvailable = (availableRefundableMinor / 100).toFixed(2);
      throw new BadRequestException(
        `Requested refund amount (PKR ${pkrRequested}) exceeds remaining refundable payment balance (PKR ${pkrAvailable}).`,
      );
    }

    const refundReference = await this.generateRefundReference(organizationId);

    const refund = await this.prisma.refund.create({
      data: {
        organizationId,
        clinicId: payment.clinicId,
        paymentId: payment.id,
        invoiceId: payment.invoiceId,
        refundReference,
        amountMinor: data.amountMinor,
        currency: payment.currency,
        reason: data.reason,
        status: RefundStatus.PENDING_APPROVAL,
        requestedById: actorId,
      },
      include: {
        payment: true,
        invoice: { include: { patient: true } },
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: payment.clinicId,
      actorId,
      entityType: 'REFUND',
      entityId: refund.id,
      action: 'REFUND_REQUESTED',
      newValues: {
        refundReference: refund.refundReference,
        amountMinor: refund.amountMinor,
        status: refund.status,
      },
      reason: data.reason,
    });

    return refund;
  }

  /**
   * Review and approve/reject a refund request with separation of duties.
   */
  public async reviewRefund(
    organizationId: string,
    refundId: string,
    data: ReviewRefundInput,
    actorId: string,
  ) {
    const refund = await this.prisma.refund.findFirst({
      where: { id: refundId, organizationId },
      include: {
        payment: true,
        invoice: { include: { patient: true, clinic: true } },
      },
    });

    if (!refund) {
      throw new NotFoundException(`Refund with ID ${refundId} not found`);
    }

    if (refund.status !== RefundStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Refund is not pending approval. Current status: ${refund.status}`,
      );
    }

    if (data.action === 'REJECT') {
      const updated = await this.prisma.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.REJECTED,
          approvedById: actorId,
          rejectionReason: data.rejectionReason || 'Rejected by authorized finance manager',
        },
      });

      await this.auditService.recordAuditLog({
        organizationId,
        clinicId: refund.clinicId,
        actorId,
        entityType: 'REFUND',
        entityId: refundId,
        action: 'REFUND_REJECTED',
        previousValues: { status: refund.status },
        newValues: { status: updated.status, rejectionReason: updated.rejectionReason },
        reason: data.rejectionReason,
      });

      return updated;
    }

    // Approve & execute refund atomically
    const result = await this.prisma.$transaction(async (tx) => {
      const completedRefund = await tx.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.COMPLETED,
          approvedById: actorId,
          completedAt: new Date(),
        },
      });

      // Update invoice balances
      const currentInvoice = await tx.invoice.findUniqueOrThrow({
        where: { id: refund.invoiceId },
      });

      const newPaidMinor = Math.max(0, currentInvoice.paidMinor - refund.amountMinor);
      const newOutstandingMinor = Math.max(0, currentInvoice.totalMinor - newPaidMinor);
      const newInvoiceStatus =
        newPaidMinor === 0
          ? InvoiceStatus.ISSUED
          : newOutstandingMinor === 0
            ? InvoiceStatus.PAID
            : InvoiceStatus.PARTIALLY_PAID;

      const updatedInvoice = await tx.invoice.update({
        where: { id: refund.invoiceId },
        data: {
          paidMinor: newPaidMinor,
          outstandingMinor: newOutstandingMinor,
          status: newInvoiceStatus,
        },
      });

      // If CASH method, record cash deduction in active cash register drawer
      if (refund.payment.method === 'CASH') {
        const activeCashSession = await tx.cashRegisterSession.findFirst({
          where: {
            clinicId: refund.clinicId,
            status: 'OPEN',
          },
        });

        if (activeCashSession) {
          await tx.cashRegisterTransaction.create({
            data: {
              sessionId: activeCashSession.id,
              transactionType: 'CASH_REFUND',
              referenceType: 'REFUND',
              referenceId: refund.id,
              amountMinor: -refund.amountMinor,
              recordedById: actorId,
              notes: `Cash refund approved for ${refund.refundReference}`,
            },
          });

          await tx.cashRegisterSession.update({
            where: { id: activeCashSession.id },
            data: {
              expectedClosingMinor: activeCashSession.expectedClosingMinor - refund.amountMinor,
            },
          });
        }
      }

      return { completedRefund, updatedInvoice };
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: refund.clinicId,
      actorId,
      entityType: 'REFUND',
      entityId: refundId,
      action: 'REFUNDED',
      previousValues: { status: refund.status },
      newValues: {
        status: result.completedRefund.status,
        invoiceStatus: result.updatedInvoice.status,
        invoicePaidMinor: result.updatedInvoice.paidMinor,
      },
    });

    // Enqueue Phase 8 notification
    try {
      await this.notificationScheduler.scheduleFinancialNotification({
        organizationId,
        clinicId: refund.clinicId,
        patientId: refund.invoice.patientId,
        eventType: NotificationEventType.PAYMENT_REFUNDED,
        relatedEntityType: 'REFUND',
        relatedEntityId: result.completedRefund.id,
        payload: {
          refund_reference: result.completedRefund.refundReference,
          invoice_reference: refund.invoice.invoiceReference,
          amount_refunded_pkr: (result.completedRefund.amountMinor / 100).toFixed(2),
          clinic_name: refund.invoice.clinic.name,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to dispatch PAYMENT_REFUNDED notification: ${err.message}`);
    }

    return result.completedRefund;
  }

  /**
   * Query refunds with filters.
   */
  public async queryRefunds(organizationId: string, query: QueryRefundsInput) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (query.clinicId) where.clinicId = query.clinicId;
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          payment: true,
          invoice: { include: { patient: true } },
        },
      }),
      this.prisma.refund.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
