import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { FinancialAuditService } from './financial-audit.service';
import { NotificationSchedulerService } from '../../notification/notification-scheduler.service';
import { CollectPaymentInput, QueryPaymentsInput } from '@matabai/validation';
import { InvoiceStatus, PaymentStatus, NotificationEventType } from '@matabai/shared';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: FinancialAuditService,
    private readonly notificationScheduler: NotificationSchedulerService,
  ) {}

  /**
   * Generates sequential unique payment reference: PAY-YYYYMM-XXXX
   */
  public async generatePaymentReference(organizationId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const prefix = `PAY-${yearMonth}-`;

    const count = await this.prisma.payment.count({
      where: {
        organizationId,
        paymentReference: { startsWith: prefix },
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  /**
   * Collect payment against an issued invoice in an atomic transaction.
   */
  public async collectPayment(
    organizationId: string,
    data: CollectPaymentInput,
    actorId: string,
  ) {
    // 1. Idempotency check
    if (data.idempotencyKey) {
      const existingPayment = await this.prisma.payment.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        include: { invoice: true, collectedBy: true },
      });
      if (existingPayment) {
        this.logger.log(`Idempotent payment return for key: ${data.idempotencyKey}`);
        return existingPayment;
      }
    }

    // 2. Fetch authoritative invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: data.invoiceId, organizationId },
      include: { patient: true, clinic: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${data.invoiceId} not found`);
    }

    // 3. Status validation
    if (invoice.status === InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        'Cannot collect payment against a DRAFT invoice. Please ISSUE the invoice first.',
      );
    }
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice is already fully PAID.');
    }
    if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.VOIDED) {
      throw new BadRequestException(`Cannot collect payment against a ${invoice.status} invoice.`);
    }

    // 4. Overpayment check
    if (data.amountMinor > invoice.outstandingMinor) {
      const pkrEntered = (data.amountMinor / 100).toFixed(2);
      const pkrDue = (invoice.outstandingMinor / 100).toFixed(2);
      throw new BadRequestException(
        `Payment amount (PKR ${pkrEntered}) exceeds authoritative outstanding balance (PKR ${pkrDue}). Overpayment is prohibited.`,
      );
    }

    const paymentReference = await this.generatePaymentReference(organizationId);

    // 5. Execute atomic transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          organizationId,
          clinicId: data.clinicId,
          invoiceId: data.invoiceId,
          patientId: invoice.patientId,
          paymentReference,
          method: data.method,
          provider: data.provider || 'CASH',
          providerTransactionId: data.providerTransactionId || null,
          amountMinor: data.amountMinor,
          currency: invoice.currency,
          status: PaymentStatus.COMPLETED,
          idempotencyKey: data.idempotencyKey || null,
          collectedById: actorId,
          confirmedAt: new Date(),
          bankName: data.bankName || null,
          bankReference: data.bankReference || null,
          cardLast4: data.cardLast4 || null,
          cardBrand: data.cardBrand || null,
          notes: data.notes || null,
        },
      });

      // Create allocation record
      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: invoice.id,
          allocatedMinor: data.amountMinor,
        },
      });

      // Update invoice balances atomically
      const newPaidMinor = invoice.paidMinor + data.amountMinor;
      const newOutstandingMinor = invoice.totalMinor - newPaidMinor;
      const newStatus =
        newOutstandingMinor === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidMinor: newPaidMinor,
          outstandingMinor: newOutstandingMinor,
          status: newStatus,
        },
      });

      // If CASH method, record into active cash drawer session if open
      if (data.method === 'CASH') {
        const activeCashSession = await tx.cashRegisterSession.findFirst({
          where: {
            clinicId: data.clinicId,
            status: 'OPEN',
          },
        });

        if (activeCashSession) {
          await tx.cashRegisterTransaction.create({
            data: {
              sessionId: activeCashSession.id,
              transactionType: 'CASH_PAYMENT',
              referenceType: 'PAYMENT',
              referenceId: payment.id,
              amountMinor: data.amountMinor,
              recordedById: actorId,
              notes: `Cash collection for invoice ${invoice.invoiceReference}`,
            },
          });

          await tx.cashRegisterSession.update({
            where: { id: activeCashSession.id },
            data: {
              expectedClosingMinor: activeCashSession.expectedClosingMinor + data.amountMinor,
            },
          });
        }
      }

      return { payment, updatedInvoice };
    });

    // 6. Audit Logging
    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: data.clinicId,
      actorId,
      entityType: 'PAYMENT',
      entityId: result.payment.id,
      action: 'PAID',
      newValues: {
        paymentReference: result.payment.paymentReference,
        amountMinor: result.payment.amountMinor,
        method: result.payment.method,
        invoiceStatus: result.updatedInvoice.status,
        remainingBalanceMinor: result.updatedInvoice.outstandingMinor,
      },
    });

    // 7. Dispatch Phase 8 Notification
    try {
      await this.notificationScheduler.scheduleFinancialNotification({
        organizationId,
        clinicId: data.clinicId,
        patientId: invoice.patientId,
        eventType: NotificationEventType.PAYMENT_RECEIVED,
        relatedEntityType: 'PAYMENT',
        relatedEntityId: result.payment.id,
        payload: {
          payment_reference: result.payment.paymentReference,
          invoice_reference: invoice.invoiceReference,
          amount_paid_pkr: (result.payment.amountMinor / 100).toFixed(2),
          remaining_balance_pkr: (result.updatedInvoice.outstandingMinor / 100).toFixed(2),
          clinic_name: invoice.clinic.name,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to dispatch PAYMENT_RECEIVED notification: ${err.message}`);
    }

    return result.payment;
  }

  /**
   * Query payments with pagination and filtering.
   */
  public async queryPayments(organizationId: string, query: QueryPaymentsInput) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (query.clinicId) where.clinicId = query.clinicId;
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.patientId) where.patientId = query.patientId;
    if (query.method) where.method = query.method;
    if (query.status) where.status = query.status;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: {
            include: { patient: true },
          },
          collectedBy: true,
          refunds: true,
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get payment by ID.
   */
  public async getPaymentById(organizationId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, organizationId },
      include: {
        invoice: {
          include: { patient: true, clinic: true, items: true },
        },
        collectedBy: true,
        allocations: true,
        refunds: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    return payment;
  }
}
