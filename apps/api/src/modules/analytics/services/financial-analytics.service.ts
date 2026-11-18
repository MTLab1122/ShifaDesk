import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { FinancialAnalyticsSummary, InvoiceStatus, PaymentStatus } from '@matabai/shared';
import { AnalyticsTimeHelper } from './analytics-time.helper';

@Injectable()
export class FinancialAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  public async getFinancialAnalytics(
    organizationId: string,
    clinicId?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<FinancialAnalyticsSummary> {
    const dateRange = AnalyticsTimeHelper.resolveDateRange(period, startDate, endDate);

    const orgClinicFilter: any = { organizationId };
    if (clinicId) orgClinicFilter.clinicId = clinicId;

    const dateFilter = { gte: dateRange.startDate, lte: dateRange.endDate };

    // Parallel fetch for invoices, payments, refunds, expenses, and items
    const [invoices, payments, refunds, expenses, invoiceItems] = await Promise.all([
      // Invoices
      this.prisma.invoice.findMany({
        where: {
          ...orgClinicFilter,
          status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOIDED] },
          createdAt: dateFilter,
        },
        select: {
          id: true,
          totalMinor: true,
          paidMinor: true,
          outstandingMinor: true,
          createdAt: true,
        },
      }),
      // Payments
      this.prisma.payment.findMany({
        where: {
          ...orgClinicFilter,
          status: PaymentStatus.COMPLETED,
          createdAt: dateFilter,
        },
        select: {
          amountMinor: true,
          method: true,
          createdAt: true,
        },
      }),
      // Refunds
      this.prisma.refund.findMany({
        where: {
          ...orgClinicFilter,
          status: 'COMPLETED',
          createdAt: dateFilter,
        },
        select: {
          amountMinor: true,
        },
      }),
      // Expenses with category
      this.prisma.expense.findMany({
        where: {
          ...orgClinicFilter,
          status: { in: ['APPROVED', 'PAID'] },
          expenseDate: dateFilter,
        },
        include: {
          category: { select: { name: true } },
        },
      }),
      // Invoice items breakdown for consultation vs lab
      this.prisma.invoiceItem.findMany({
        where: {
          invoice: {
            ...orgClinicFilter,
            status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOIDED] },
            createdAt: dateFilter,
          },
        },
        select: {
          itemType: true,
          totalMinor: true,
        },
      }),
    ]);

    // Financial totals
    const totalInvoicedPaisa = invoices.reduce((acc, inv) => acc + inv.totalMinor, 0);
    const totalCollectedPaisa = payments.reduce((acc, p) => acc + p.amountMinor, 0);
    const totalRefundsPaisa = refunds.reduce((acc, r) => acc + r.amountMinor, 0);
    const totalExpensesPaisa = expenses.reduce((acc, exp) => acc + exp.amountMinor, 0);

    const outstandingReceivablesPaisa = Math.max(0, totalInvoicedPaisa - totalCollectedPaisa - totalRefundsPaisa);
    const netOperatingBalancePaisa = totalCollectedPaisa - totalRefundsPaisa - totalExpensesPaisa;

    // Cash register collections & payment method breakdown
    let cashRegisterCollectionsPaisa = 0;
    const paymentMethodDistribution: Record<string, number> = {};

    for (const p of payments) {
      paymentMethodDistribution[p.method] = (paymentMethodDistribution[p.method] || 0) + p.amountMinor;
      if (p.method === 'CASH') {
        cashRegisterCollectionsPaisa += p.amountMinor;
      }
    }

    // Revenue by consultation vs laboratory
    let revenueByConsultationPaisa = 0;
    let revenueByLaboratoryPaisa = 0;

    for (const item of invoiceItems) {
      if (item.itemType === 'CONSULTATION') {
        revenueByConsultationPaisa += item.totalMinor;
      } else if (item.itemType === 'LAB_TEST' || item.itemType === 'LAB_PACKAGE') {
        revenueByLaboratoryPaisa += item.totalMinor;
      }
    }

    // Expense category breakdown
    const expenseCatMap: Record<string, number> = {};
    for (const exp of expenses) {
      const catName = exp.category?.name || 'General Operations';
      expenseCatMap[catName] = (expenseCatMap[catName] || 0) + exp.amountMinor;
    }
    const expenseCategoryBreakdown = Object.entries(expenseCatMap).map(([category, amountPaisa]) => ({
      category,
      amountPaisa,
    }));

    // Revenue trends timeline
    const trendsMap: Record<string, { invoicedPaisa: number; collectedPaisa: number }> = {};

    for (const inv of invoices) {
      const dateKey = inv.createdAt.toISOString().split('T')[0]!;
      if (!trendsMap[dateKey]) trendsMap[dateKey] = { invoicedPaisa: 0, collectedPaisa: 0 };
      trendsMap[dateKey].invoicedPaisa += inv.totalMinor;
    }

    for (const p of payments) {
      const dateKey = p.createdAt.toISOString().split('T')[0]!;
      if (!trendsMap[dateKey]) trendsMap[dateKey] = { invoicedPaisa: 0, collectedPaisa: 0 };
      trendsMap[dateKey].collectedPaisa += p.amountMinor;
    }

    const revenueTrends = Object.entries(trendsMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        ...data,
      }));

    return {
      totalInvoicedPaisa,
      totalCollectedPaisa,
      outstandingReceivablesPaisa,
      totalRefundsPaisa,
      totalExpensesPaisa,
      netOperatingBalancePaisa,
      cashRegisterCollectionsPaisa,
      paymentMethodDistribution,
      revenueByConsultationPaisa,
      revenueByLaboratoryPaisa,
      expenseCategoryBreakdown,
      revenueTrends,
    };
  }
}
