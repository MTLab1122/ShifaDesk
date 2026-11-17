import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { FinancialAnalytics, InvoiceStatus, PaymentStatus } from '@matabai/shared';

@Injectable()
export class FinancialAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes comprehensive financial analytics and operational metrics.
   */
  public async getAnalytics(
    organizationId: string,
    clinicId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<FinancialAnalytics> {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

    const invoiceWhere: any = {
      organizationId,
      status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOIDED] },
    };
    if (clinicId) invoiceWhere.clinicId = clinicId;

    const paymentWhere: any = {
      organizationId,
      status: PaymentStatus.COMPLETED,
    };
    if (clinicId) paymentWhere.clinicId = clinicId;

    const refundWhere: any = {
      organizationId,
      status: 'COMPLETED',
    };
    if (clinicId) refundWhere.clinicId = clinicId;

    const expenseWhere: any = {
      organizationId,
      status: { in: ['APPROVED', 'PAID'] },
    };
    if (clinicId) expenseWhere.clinicId = clinicId;

    // Apply custom date range if supplied
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);

      paymentWhere.createdAt = dateFilter;
      refundWhere.createdAt = dateFilter;
      expenseWhere.expenseDate = dateFilter;
    }

    const [
      invoicesToday,
      invoicesMonth,
      allActiveInvoices,
      allPayments,
      allRefunds,
      allExpenses,
      allInvoiceItems,
      clinics,
    ] = await Promise.all([
      // Today's invoices
      this.prisma.invoice.findMany({
        where: { ...invoiceWhere, createdAt: { gte: todayStart } },
        select: { totalMinor: true },
      }),
      // This month's invoices
      this.prisma.invoice.findMany({
        where: { ...invoiceWhere, createdAt: { gte: monthStart } },
        select: { totalMinor: true },
      }),
      // Active invoices for outstanding receivables
      this.prisma.invoice.findMany({
        where: {
          ...invoiceWhere,
          status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
        },
        select: { outstandingMinor: true, clinicId: true, totalMinor: true },
      }),
      // Confirmed payments
      this.prisma.payment.findMany({
        where: paymentWhere,
        select: { amountMinor: true, method: true, createdAt: true },
      }),
      // Completed refunds
      this.prisma.refund.findMany({
        where: refundWhere,
        select: { amountMinor: true, createdAt: true },
      }),
      // Approved expenses
      this.prisma.expense.findMany({
        where: expenseWhere,
        select: { amountMinor: true, expenseDate: true },
      }),
      // Invoice items for service breakdown
      this.prisma.invoiceItem.findMany({
        where: {
          invoice: invoiceWhere,
        },
        select: { itemType: true, totalMinor: true },
      }),
      // Clinics lookup
      this.prisma.clinic.findMany({
        where: { organizationId },
        select: { id: true, name: true },
      }),
    ]);

    const todayRevenueMinor = invoicesToday.reduce((sum, inv) => sum + inv.totalMinor, 0);
    const monthlyRevenueMinor = invoicesMonth.reduce((sum, inv) => sum + inv.totalMinor, 0);
    const totalCollectedMinor = allPayments.reduce((sum, p) => sum + p.amountMinor, 0);
    const outstandingReceivablesMinor = allActiveInvoices.reduce((sum, inv) => sum + inv.outstandingMinor, 0);
    const pendingInvoicesCount = allActiveInvoices.length;
    const refundedAmountMinor = allRefunds.reduce((sum, r) => sum + r.amountMinor, 0);
    const recordedExpensesMinor = allExpenses.reduce((sum, e) => sum + e.amountMinor, 0);
    const netOperatingBalanceMinor = totalCollectedMinor - refundedAmountMinor - recordedExpensesMinor;

    // Revenue by payment method
    const revenueByPaymentMethod: Record<string, number> = {};
    for (const p of allPayments) {
      revenueByPaymentMethod[p.method] = (revenueByPaymentMethod[p.method] || 0) + p.amountMinor;
    }

    // Revenue by service category
    const revenueByServiceCategory: Record<string, number> = {};
    for (const item of allInvoiceItems) {
      revenueByServiceCategory[item.itemType] = (revenueByServiceCategory[item.itemType] || 0) + item.totalMinor;
    }

    // Revenue by clinic
    const clinicMap = new Map(clinics.map((c) => [c.id, c.name]));
    const revenueByClinic: Record<string, number> = {};
    for (const inv of allActiveInvoices) {
      const name = clinicMap.get(inv.clinicId) || 'Main Clinic';
      revenueByClinic[name] = (revenueByClinic[name] || 0) + inv.totalMinor;
    }

    // 7-day timeline
    const timelineMap = new Map<string, { revenueMinor: number; expensesMinor: number; collectionsMinor: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0]!;
      timelineMap.set(dateKey, { revenueMinor: 0, expensesMinor: 0, collectionsMinor: 0 });
    }

    for (const p of allPayments) {
      const dateKey = p.createdAt.toISOString().split('T')[0]!;
      if (timelineMap.has(dateKey)) {
        timelineMap.get(dateKey)!.collectionsMinor += p.amountMinor;
      }
    }

    for (const e of allExpenses) {
      const dateKey = e.expenseDate.toISOString().split('T')[0]!;
      if (timelineMap.has(dateKey)) {
        timelineMap.get(dateKey)!.expensesMinor += e.amountMinor;
      }
    }

    for (const inv of invoicesToday) {
      const todayKey = now.toISOString().split('T')[0]!;
      if (timelineMap.has(todayKey)) {
        timelineMap.get(todayKey)!.revenueMinor += inv.totalMinor;
      }
    }

    const timeline = Array.from(timelineMap.entries()).map(([date, val]) => ({
      date,
      ...val,
    }));

    return {
      todayRevenueMinor,
      monthlyRevenueMinor,
      totalCollectedMinor,
      outstandingReceivablesMinor,
      pendingInvoicesCount,
      refundedAmountMinor,
      recordedExpensesMinor,
      netOperatingBalanceMinor,
      revenueByPaymentMethod,
      revenueByServiceCategory,
      revenueByClinic,
      timeline,
    };
  }
}
