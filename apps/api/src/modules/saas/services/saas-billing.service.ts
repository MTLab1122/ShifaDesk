import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { SaasInvoiceStatus, SaasInvoiceItemType } from '@matabai/shared';

@Injectable()
export class SaasBillingService {
  private readonly logger = new Logger(SaasBillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sequential unique invoice number: SUB-YYYYMM-XXXX
   */
  async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `SUB-${yearMonth}-`;

    const latest = await this.prisma.subscriptionInvoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let nextSeq = 1;
    if (latest?.invoiceNumber) {
      const parts = latest.invoiceNumber.split('-');
      const lastSeq = parseInt(parts[2] || '0', 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Create a new SaaS subscription invoice
   */
  async createSubscriptionInvoice(params: {
    organizationId: string;
    subscriptionId?: string;
    planVersionSnapshot: Record<string, any>;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    subtotalPaisa: number;
    discountPaisa?: number;
    taxPaisa?: number;
    description: string;
    dueDate?: Date;
    promotionalCreditId?: string;
  }) {
    const {
      organizationId,
      subscriptionId,
      planVersionSnapshot,
      billingPeriodStart,
      billingPeriodEnd,
      subtotalPaisa,
      discountPaisa = 0,
      taxPaisa = 0,
      description,
      dueDate,
    } = params;

    const invoiceNumber = await this.generateInvoiceNumber();
    const totalPaisa = Math.max(0, subtotalPaisa - discountPaisa + taxPaisa);
    const invoiceDueDate = dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days grace

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.subscriptionInvoice.create({
        data: {
          invoiceNumber,
          organizationId,
          subscriptionId: subscriptionId || null,
          planVersionSnapshot,
          status: SaasInvoiceStatus.ISSUED,
          billingPeriodStart,
          billingPeriodEnd,
          currency: 'PKR',
          subtotalPaisa,
          discountPaisa,
          taxPaisa,
          totalPaisa,
          amountPaidPaisa: 0,
          outstandingPaisa: totalPaisa,
          issueDate: new Date(),
          dueDate: invoiceDueDate,
        },
      });

      // Line item for plan subscription
      await tx.subscriptionInvoiceItem.create({
        data: {
          invoiceId: invoice.id,
          description,
          itemType: SaasInvoiceItemType.PLAN_FEE,
          quantity: 1,
          unitPricePaisa: subtotalPaisa,
          totalPricePaisa: subtotalPaisa,
        },
      });

      // Discount line item if present
      if (discountPaisa > 0) {
        await tx.subscriptionInvoiceItem.create({
          data: {
            invoiceId: invoice.id,
            description: 'Promotional Discount / Prorated Credit',
            itemType: SaasInvoiceItemType.DISCOUNT_CREDIT,
            quantity: 1,
            unitPricePaisa: -discountPaisa,
            totalPricePaisa: -discountPaisa,
          },
        });
      }

      this.logger.log(`Created subscription invoice ${invoice.invoiceNumber} for org ${organizationId}: PKR ${(totalPaisa / 100).toFixed(2)}`);
      return invoice;
    });
  }

  async listInvoices(organizationId?: string, page = 1, limit = 20) {
    const skip = (Math.max(1, page) - 1) * limit;
    const where = organizationId ? { organizationId } : {};

    const [items, totalItems] = await Promise.all([
      this.prisma.subscriptionInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true, slug: true } },
          items: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      }),
      this.prisma.subscriptionInvoice.count({ where }),
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

  async getInvoiceById(id: string, organizationId?: string) {
    const where: any = { id };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const invoice = await this.prisma.subscriptionInvoice.findFirst({
      where,
      include: {
        organization: true,
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Subscription invoice with ID '${id}' not found`);
    }

    return invoice;
  }

  async renderPrintableInvoiceHtml(id: string, organizationId?: string): Promise<string> {
    const invoice = await this.getInvoiceById(id, organizationId);

    const subtotalFormatted = (invoice.subtotalPaisa / 100).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
    });
    const discountFormatted = (invoice.discountPaisa / 100).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
    });
    const totalFormatted = (invoice.totalPaisa / 100).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
    });
    const paidFormatted = (invoice.amountPaidPaisa / 100).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
    });
    const balanceFormatted = (invoice.outstandingPaisa / 100).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
    });

    const itemsRows = invoice.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">PKR ${(item.unitPricePaisa / 100).toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">PKR ${(item.totalPricePaisa / 100).toFixed(2)}</td>
        </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SaaS Invoice ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1e293b; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f766e; padding-bottom: 20px; }
    .title { font-size: 24px; font-weight: bold; color: #0f766e; }
    .meta-box { margin: 20px 0; display: flex; justify-content: space-between; }
    .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .th { background: #f8fafc; padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1; }
    .summary { width: 300px; margin-left: auto; margin-top: 30px; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-issued { background: #fef3c7; color: #b45309; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">MatabAI Platform (ShifaDesk)</div>
      <p style="color: #64748b; margin: 4px 0;">Official SaaS Subscription Invoice</p>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; color: #0f766e;">${invoice.invoiceNumber}</h2>
      <p style="margin: 4px 0;"><span class="badge ${invoice.status === 'PAID' ? 'badge-paid' : 'badge-issued'}">${invoice.status}</span></p>
    </div>
  </div>

  <div class="meta-box">
    <div>
      <strong>Billed To:</strong><br>
      ${invoice.organization.name}<br>
      Organization Slug: ${invoice.organization.slug}<br>
    </div>
    <div style="text-align: right;">
      <strong>Issue Date:</strong> ${invoice.issueDate.toISOString().split('T')[0]}<br>
      <strong>Due Date:</strong> ${invoice.dueDate.toISOString().split('T')[0]}<br>
      <strong>Billing Period:</strong> ${invoice.billingPeriodStart.toISOString().split('T')[0]} to ${invoice.billingPeriodEnd.toISOString().split('T')[0]}
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th class="th">Description</th>
        <th class="th" style="text-align: center;">Qty</th>
        <th class="th" style="text-align: right;">Unit Price</th>
        <th class="th" style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-row">
      <span>Subtotal:</span>
      <strong>PKR ${subtotalFormatted}</strong>
    </div>
    ${
      invoice.discountPaisa > 0
        ? `<div class="summary-row" style="color: #16a34a;">
            <span>Discount:</span>
            <strong>- PKR ${discountFormatted}</strong>
          </div>`
        : ''
    }
    <div class="summary-row" style="border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 16px;">
      <span>Total:</span>
      <strong style="color: #0f766e;">PKR ${totalFormatted}</strong>
    </div>
    <div class="summary-row" style="color: #15803d;">
      <span>Amount Paid:</span>
      <strong>PKR ${paidFormatted}</strong>
    </div>
    <div class="summary-row" style="color: ${invoice.outstandingPaisa > 0 ? '#b91c1c' : '#15803d'}; font-size: 16px;">
      <span>Outstanding Balance:</span>
      <strong>PKR ${balanceFormatted}</strong>
    </div>
  </div>

  <div style="margin-top: 50px; padding: 15px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #64748b;">
    <strong>Payment Details:</strong><br>
    Direct Bank Transfer: MatabAI (Pvt) Ltd, Meezan Bank, IBAN: PK36MEZN0001234567890123<br>
    Please submit your bank reference number via the clinic dashboard (/dashboard/subscription/invoices) for automated instant settlement upon review.
  </div>
</body>
</html>`;
  }
}
