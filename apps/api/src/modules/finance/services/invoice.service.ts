import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { FinancialAuditService } from './financial-audit.service';
import { NotificationSchedulerService } from '../../notification/notification-scheduler.service';
import {
  CreateInvoiceInput,
  CancelInvoiceInput,
  QueryInvoicesInput,
} from '@matabai/validation';
import { InvoiceStatus, NotificationEventType } from '@matabai/shared';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: FinancialAuditService,
    private readonly notificationScheduler: NotificationSchedulerService,
  ) {}

  /**
   * Generates sequential unique invoice reference: INV-YYYYMM-XXXX
   */
  public async generateInvoiceReference(organizationId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const prefix = `INV-${yearMonth}-`;

    const count = await this.prisma.invoice.count({
      where: {
        organizationId,
        invoiceReference: { startsWith: prefix },
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  /**
   * Create a new draft or issued invoice with backend-validated integer minor calculations.
   */
  public async createInvoice(
    organizationId: string,
    data: CreateInvoiceInput,
    actorId: string,
  ) {
    // 1. Verify Clinic belongs to Organization
    const clinic = await this.prisma.clinic.findFirst({
      where: { id: data.clinicId, organizationId },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${data.clinicId} not found in this organization`);
    }

    // 2. Verify Patient belongs to Organization
    const patient = await this.prisma.patient.findFirst({
      where: { id: data.patientId, organizationId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${data.patientId} not found`);
    }

    // 3. Prevent duplicate invoices for the same billable event
    if (data.appointmentId) {
      const existing = await this.prisma.invoice.findFirst({
        where: {
          organizationId,
          appointmentId: data.appointmentId,
          status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID] },
        },
      });
      if (existing) {
        throw new ConflictException(
          `An active invoice (${existing.invoiceReference}) already exists for Appointment ${data.appointmentId}`,
        );
      }
    }

    if (data.laboratoryOrderId) {
      const existing = await this.prisma.invoice.findFirst({
        where: {
          organizationId,
          laboratoryOrderId: data.laboratoryOrderId,
          status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID] },
        },
      });
      if (existing) {
        throw new ConflictException(
          `An active invoice (${existing.invoiceReference}) already exists for Laboratory Order ${data.laboratoryOrderId}`,
        );
      }
    }

    // 4. Calculate line items with exact integer minor units
    let calculatedSubtotalMinor = 0;
    let itemsDiscountMinor = 0;
    let itemsTaxMinor = 0;

    const validatedItems = data.items.map((item) => {
      const quantity = Math.max(1, item.quantity || 1);
      const unitPriceMinor = Math.max(0, item.unitPriceMinor || 0);
      const discountMinor = Math.max(0, item.discountMinor || 0);
      const taxMinor = Math.max(0, item.taxMinor || 0);
      const itemSubtotal = quantity * unitPriceMinor;
      const totalMinor = Math.max(0, itemSubtotal - discountMinor + taxMinor);

      calculatedSubtotalMinor += itemSubtotal;
      itemsDiscountMinor += discountMinor;
      itemsTaxMinor += taxMinor;

      return {
        itemType: item.itemType,
        itemReference: item.itemReference || null,
        descriptionSnapshot: item.description,
        quantity,
        unitPriceMinor,
        discountMinor,
        taxMinor,
        totalMinor,
      };
    });

    const headerDiscountMinor = Math.max(0, data.discountMinor || 0);
    const totalDiscountMinor = itemsDiscountMinor + headerDiscountMinor;

    const taxRate = Math.min(100, Math.max(0, data.taxRatePercent || 0));
    const taxableBase = Math.max(0, calculatedSubtotalMinor - totalDiscountMinor);
    const headerTaxMinor = taxRate > 0 ? Math.round((taxableBase * taxRate) / 100) : 0;
    const totalTaxMinor = itemsTaxMinor + headerTaxMinor;

    const grandTotalMinor = Math.max(0, calculatedSubtotalMinor - totalDiscountMinor + totalTaxMinor);
    const invoiceReference = await this.generateInvoiceReference(organizationId);

    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId,
        clinicId: data.clinicId,
        patientId: data.patientId,
        appointmentId: data.appointmentId || null,
        laboratoryOrderId: data.laboratoryOrderId || null,
        relatedEntityType: data.relatedEntityType || (data.appointmentId ? 'APPOINTMENT' : data.laboratoryOrderId ? 'LABORATORY_ORDER' : 'GENERAL'),
        relatedEntityId: data.relatedEntityId || data.appointmentId || data.laboratoryOrderId || null,
        invoiceReference,
        subtotalMinor: calculatedSubtotalMinor,
        discountMinor: totalDiscountMinor,
        discountType: data.discountType || null,
        discountReason: data.discountReason || null,
        taxMinor: totalTaxMinor,
        taxRatePercent: taxRate,
        totalMinor: grandTotalMinor,
        paidMinor: 0,
        outstandingMinor: grandTotalMinor,
        currency: data.currency || 'PKR',
        status: InvoiceStatus.DRAFT,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        createdById: actorId,
        notes: data.notes || null,
        items: {
          create: validatedItems,
        },
      },
      include: {
        items: true,
        patient: true,
        clinic: true,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: data.clinicId,
      actorId,
      entityType: 'INVOICE',
      entityId: invoice.id,
      action: 'CREATED',
      newValues: {
        invoiceReference: invoice.invoiceReference,
        totalMinor: invoice.totalMinor,
        status: invoice.status,
      },
    });

    return invoice;
  }

  /**
   * Retrieve invoice by ID with items, patient, payments, and clinic.
   */
  public async getInvoiceById(organizationId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: {
        items: true,
        patient: true,
        clinic: true,
        appointment: {
          include: { doctor: true },
        },
        laboratoryOrder: true,
        payments: {
          include: { collectedBy: true },
          orderBy: { createdAt: 'desc' },
        },
        refunds: {
          orderBy: { createdAt: 'desc' },
        },
        adjustments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    return invoice;
  }

  /**
   * Paginated list of invoices with filters.
   */
  public async queryInvoices(organizationId: string, query: QueryInvoicesInput) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (query.clinicId) where.clinicId = query.clinicId;
    if (query.patientId) where.patientId = query.patientId;
    if (query.status) where.status = query.status;

    if (query.search) {
      where.OR = [
        { invoiceReference: { contains: query.search, mode: 'insensitive' } },
        { patient: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { patient: { patientNumber: { contains: query.search, mode: 'insensitive' } } },
        { patient: { phone: { contains: query.search } } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: true,
          clinic: true,
          items: true,
          payments: true,
        },
      }),
      this.prisma.invoice.count({ where }),
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
   * Issue invoice: Transition from DRAFT to ISSUED, freeze terms, trigger notification.
   */
  public async issueInvoice(organizationId: string, invoiceId: string, actorId: string) {
    const invoice = await this.getInvoiceById(organizationId, invoiceId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT invoices can be issued. Current status: ${invoice.status}`,
      );
    }

    const issuedAt = new Date();
    // Default 7 days due date if none specified
    const dueAt = invoice.dueAt || new Date(issuedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.ISSUED,
        issuedAt,
        dueAt,
      },
      include: {
        patient: true,
        clinic: true,
        items: true,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: updated.clinicId,
      actorId,
      entityType: 'INVOICE',
      entityId: invoiceId,
      action: 'ISSUED',
      previousValues: { status: invoice.status },
      newValues: { status: updated.status, issuedAt },
    });

    // Schedule notification via Phase 8 Centralized Engine
    try {
      await this.notificationScheduler.scheduleFinancialNotification({
        organizationId,
        clinicId: updated.clinicId,
        patientId: updated.patientId,
        eventType: NotificationEventType.INVOICE_ISSUED,
        relatedEntityType: 'INVOICE',
        relatedEntityId: updated.id,
        payload: {
          invoice_reference: updated.invoiceReference,
          total_amount_pkr: (updated.totalMinor / 100).toFixed(2),
          due_date: updated.dueAt?.toLocaleDateString('en-PK') || 'On Presentation',
          clinic_name: updated.clinic.name,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to dispatch INVOICE_ISSUED notification: ${err.message}`);
    }

    return updated;
  }

  /**
   * Cancel invoice with mandatory reason.
   */
  public async cancelInvoice(
    organizationId: string,
    invoiceId: string,
    data: CancelInvoiceInput,
    actorId: string,
  ) {
    const invoice = await this.getInvoiceById(organizationId, invoiceId);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException(
        'Cannot cancel a fully PAID invoice. Use refund or credit note workflow instead.',
      );
    }

    if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.VOIDED) {
      throw new BadRequestException(`Invoice is already ${invoice.status}`);
    }

    if (invoice.paidMinor > 0) {
      throw new BadRequestException(
        `Cannot cancel invoice with confirmed payments (PKR ${(invoice.paidMinor / 100).toFixed(2)}). Process refunds first.`,
      );
    }

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancellationReason: data.cancellationReason,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: updated.clinicId,
      actorId,
      entityType: 'INVOICE',
      entityId: invoiceId,
      action: 'CANCELLED',
      previousValues: { status: invoice.status },
      newValues: { status: updated.status, cancellationReason: data.cancellationReason },
      reason: data.cancellationReason,
    });

    return updated;
  }
}
