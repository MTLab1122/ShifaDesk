import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import { NotificationSchedulerService } from '../../notification/notification-scheduler.service';
import { CardPaymentAdapter } from '../../finance/adapters/card-payment.adapter';
import { SubmitPaymentProofInput } from '@matabai/validation';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import {
  SaasPaymentStatus,
  SaasInvoiceStatus,
  NotificationEventType,
} from '@matabai/shared';

@Injectable()
export class SaasPaymentService {
  private readonly logger = new Logger(SaasPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycleService: SubscriptionLifecycleService,
    @Optional() private readonly notificationScheduler?: NotificationSchedulerService,
    @Optional() private readonly cardAdapter?: CardPaymentAdapter,
  ) {}

  /**
   * Sequential payment reference number: SPAY-YYYYMM-XXXX
   */
  async generatePaymentNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `SPAY-${yearMonth}-`;

    const latest = await this.prisma.subscriptionPayment.findFirst({
      where: { paymentNumber: { startsWith: prefix } },
      orderBy: { paymentNumber: 'desc' },
      select: { paymentNumber: true },
    });

    let nextSeq = 1;
    if (latest?.paymentNumber) {
      const parts = latest.paymentNumber.split('-');
      const lastSeq = parseInt(parts[2] || '0', 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Submit manual bank transfer proof for verification
   */
  async submitManualPayment(dto: SubmitPaymentProofInput, user: AuthenticatedUser) {
    const invoice = await this.prisma.subscriptionInvoice.findUnique({
      where: { id: dto.invoiceId },
      include: { organization: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${dto.invoiceId}' not found`);
    }

    if (invoice.status === SaasInvoiceStatus.PAID) {
      throw new BadRequestException('This invoice has already been fully paid');
    }

    // Check duplicate pending submission with same reference
    const existingRef = await this.prisma.subscriptionPayment.findFirst({
      where: {
        paymentReference: dto.paymentReference,
        status: { in: [SaasPaymentStatus.PENDING, SaasPaymentStatus.COMPLETED] },
      },
    });

    if (existingRef) {
      throw new ConflictException(`Payment reference '${dto.paymentReference}' has already been submitted`);
    }

    const paymentNumber = await this.generatePaymentNumber();

    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        paymentNumber,
        invoiceId: invoice.id,
        organizationId: invoice.organizationId,
        amountPaisa: dto.amountPaisa,
        currency: 'PKR',
        paymentMethod: dto.paymentMethod,
        status: SaasPaymentStatus.PENDING,
        provider: 'MANUAL',
        paymentReference: dto.paymentReference,
        proofDocumentUrl: dto.proofDocumentUrl || null,
        metadata: {
          submittedByUserId: user.id,
          submittedByEmail: user.email,
          submittedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Manual subscription payment submitted: ${payment.paymentNumber} for invoice ${invoice.invoiceNumber}`);
    return payment;
  }

  /**
   * Verify manual bank transfer and automatically settle invoice & activate subscription
   */
  async verifyPayment(paymentId: string, actorUserId: string, notes?: string) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: { subscription: true, organization: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID '${paymentId}' not found`);
    }

    if (payment.status === SaasPaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment is already verified and completed');
    }

    const invoice = payment.invoice;
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mark payment COMPLETED
      const updatedPayment = await tx.subscriptionPayment.update({
        where: { id: paymentId },
        data: {
          status: SaasPaymentStatus.COMPLETED,
          verifiedById: actorUserId,
          verifiedAt: now,
          metadata: {
            ...(payment.metadata as Record<string, any>),
            verificationNotes: notes || 'Verified by platform administrator',
          },
        },
      });

      // 2. Update invoice balance
      const newAmountPaid = invoice.amountPaidPaisa + payment.amountPaisa;
      const newOutstanding = Math.max(0, invoice.totalPaisa - newAmountPaid);
      const isFullyPaid = newOutstanding === 0;

      const updatedInvoice = await tx.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: {
          amountPaidPaisa: newAmountPaid,
          outstandingPaisa: newOutstanding,
          status: isFullyPaid ? SaasInvoiceStatus.PAID : SaasInvoiceStatus.PARTIALLY_PAID,
          paidAt: isFullyPaid ? now : invoice.paidAt,
        },
      });

      // 3. Audit log
      await tx.platformAdminAuditLog.create({
        data: {
          actorUserId,
          action: 'PAYMENT_VERIFIED',
          resourceType: 'SubscriptionPayment',
          resourceId: payment.id,
          metadata: {
            paymentNumber: payment.paymentNumber,
            invoiceNumber: invoice.invoiceNumber,
            amountPaisa: payment.amountPaisa,
            notes,
          },
        },
      });

      return { updatedPayment, updatedInvoice, isFullyPaid };
    });

    // 4. If fully paid, activate or renew the subscription!
    if (result.isFullyPaid && invoice.subscriptionId) {
      await this.lifecycleService.activateSubscription(
        invoice.subscriptionId,
        invoice.id,
        actorUserId,
      );
    }

    // 5. Notify clinic admin
    const owner = await this.prisma.organizationMembership.findFirst({
      where: { organizationId: invoice.organizationId, role: 'CLINIC_ADMIN' },
    });

    if (owner && this.notificationScheduler) {
      this.notificationScheduler
        .scheduleSubscriptionNotification({
          organizationId: invoice.organizationId,
          recipientUserId: owner.userProfileId,
          eventType: NotificationEventType.SAAS_PAYMENT_RECEIVED,
          relatedEntityType: 'SAAS_PAYMENT',
          relatedEntityId: payment.id,
          payload: {
            payment_number: payment.paymentNumber,
            invoice_number: invoice.invoiceNumber,
            amount: (payment.amountPaisa / 100).toFixed(2),
            message: `Your payment of PKR ${(payment.amountPaisa / 100).toFixed(2)} has been verified successfully!`,
          },
        })
        .catch(() => {});
    }

    this.logger.log(`Verified payment ${payment.paymentNumber}. Invoice ${invoice.invoiceNumber} status: ${result.updatedInvoice.status}`);
    return result;
  }

  /**
   * Reject manual payment proof with reason
   */
  async rejectPayment(paymentId: string, actorUserId: string, reason: string) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID '${paymentId}' not found`);
    }

    if (payment.status === SaasPaymentStatus.COMPLETED) {
      throw new BadRequestException('Cannot reject an already completed payment');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.subscriptionPayment.update({
        where: { id: paymentId },
        data: {
          status: SaasPaymentStatus.FAILED,
          rejectionReason: reason,
        },
      });

      await tx.platformAdminAuditLog.create({
        data: {
          actorUserId,
          action: 'PAYMENT_REJECTED',
          resourceType: 'SubscriptionPayment',
          resourceId: payment.id,
          metadata: { paymentNumber: payment.paymentNumber, reason },
        },
      });

      return p;
    });

    // Notify clinic admin
    const owner = await this.prisma.organizationMembership.findFirst({
      where: { organizationId: payment.organizationId, role: 'CLINIC_ADMIN' },
    });

    if (owner && this.notificationScheduler) {
      this.notificationScheduler
        .scheduleSubscriptionNotification({
          organizationId: payment.organizationId,
          recipientUserId: owner.userProfileId,
          eventType: NotificationEventType.SAAS_PAYMENT_FAILED,
          relatedEntityType: 'SAAS_PAYMENT',
          relatedEntityId: payment.id,
          payload: {
            payment_number: payment.paymentNumber,
            reason,
            message: `Your payment submission (${payment.paymentNumber}) was rejected: ${reason}`,
          },
        })
        .catch(() => {});
    }

    return updated;
  }

  /**
   * Initiate online card checkout via configured provider adapter
   */
  async initiateCardCheckout(invoiceId: string, redirectUrl?: string) {
    const invoice = await this.prisma.subscriptionInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${invoiceId}' not found`);
    }

    if (invoice.status === SaasInvoiceStatus.PAID) {
      throw new BadRequestException('This invoice is already paid');
    }

    if (!this.cardAdapter || !this.cardAdapter.getStatus().isConfigured) {
      return {
        status: 'BLOCKED',
        message: 'Online card payment gateway is running in UNCONFIGURED mode. Live payment processing is BLOCKED until real merchant keys are supplied. Please use Manual Bank Transfer.',
        provider: 'SAFEPAY',
      };
    }

    const paymentNumber = await this.generatePaymentNumber();
    const result = this.cardAdapter.initiateCheckout(
      paymentNumber,
      invoice.outstandingPaisa,
      'PKR',
      redirectUrl,
    );

    if (result.status === 'BLOCKED') {
      return {
        status: 'BLOCKED',
        message: result.blockedReason,
        provider: 'SAFEPAY',
      };
    }

    // Create pending payment record
    await this.prisma.subscriptionPayment.create({
      data: {
        paymentNumber,
        invoiceId: invoice.id,
        organizationId: invoice.organizationId,
        amountPaisa: invoice.outstandingPaisa,
        currency: 'PKR',
        paymentMethod: 'CARD',
        status: SaasPaymentStatus.PENDING,
        provider: 'SAFEPAY',
        paymentReference: paymentNumber,
      },
    });

    return {
      status: 'PENDING',
      paymentNumber,
      checkoutUrl: result.checkoutUrl,
    };
  }

  async listPayments(organizationId?: string, status?: string, page = 1, limit = 20) {
    const skip = (Math.max(1, page) - 1) * limit;
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (status) where.status = status;

    const [items, totalItems] = await Promise.all([
      this.prisma.subscriptionPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: { select: { invoiceNumber: true, totalPaisa: true, status: true } },
          organization: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.subscriptionPayment.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    };
  }
}
