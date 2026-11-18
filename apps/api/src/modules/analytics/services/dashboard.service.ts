import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { ExecutiveDashboardMetrics, InvoiceStatus, PaymentStatus } from '@matabai/shared';
import { AnalyticsTimeHelper } from './analytics-time.helper';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  public async getExecutiveMetrics(
    organizationId: string,
    clinicId?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ExecutiveDashboardMetrics> {
    const startTime = Date.now();
    const dateRange = AnalyticsTimeHelper.resolveDateRange(period, startDate, endDate);

    // Organization and Clinic scoping filters
    const orgClinicFilter: { organizationId: string; clinicId?: string } = { organizationId };
    if (clinicId) {
      orgClinicFilter.clinicId = clinicId;
    }

    // 1. Current Window Queries
    const [
      currAppointments,
      currPatientsCount,
      currNewPatientsCount,
      currActivePatientsCount,
      currEncounters,
      currActiveDoctorsCount,
      currLabOrders,
      currLabReports,
      currInvoices,
      currPayments,
      currRefunds,
      currExpenses,
      currWhatsappCount,
      currVoiceCallsCount,
      currAiInteractions,
    ] = await Promise.all([
      // Appointments
      this.prisma.appointment.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        select: { status: true },
      }),
      // Total patients registered up to end date
      this.prisma.patient.count({
        where: {
          organizationId,
          createdAt: { lte: dateRange.endDate },
        },
      }),
      // New patients in range
      this.prisma.patient.count({
        where: {
          organizationId,
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
      }),
      // Active patients (had appointment, queue token, or encounter in period)
      this.prisma.patient.count({
        where: {
          organizationId,
          OR: [
            { appointments: { some: { ...orgClinicFilter, createdAt: { gte: dateRange.startDate, lte: dateRange.endDate } } } },
            { queueTokens: { some: { ...orgClinicFilter, createdAt: { gte: dateRange.startDate, lte: dateRange.endDate } } } },
            { encounters: { some: { ...orgClinicFilter, createdAt: { gte: dateRange.startDate, lte: dateRange.endDate } } } },
          ],
        },
      }),
      // Encounters
      this.prisma.clinicalEncounter.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        select: { status: true, isFinalized: true },
      }),
      // Active doctors with appointments or encounters in range
      this.prisma.doctor.count({
        where: {
          organizationId,
          status: 'ACTIVE',
          OR: [
            { appointments: { some: { ...orgClinicFilter, createdAt: { gte: dateRange.startDate, lte: dateRange.endDate } } } },
            { encounters: { some: { ...orgClinicFilter, createdAt: { gte: dateRange.startDate, lte: dateRange.endDate } } } },
          ],
        },
      }),
      // Lab orders
      this.prisma.laboratoryOrder.count({
        where: {
          ...orgClinicFilter,
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
      }),
      // Lab reports
      this.prisma.laboratoryReport.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        select: { reportStatus: true },
      }),
      // Invoices
      this.prisma.invoice.aggregate({
        where: {
          ...orgClinicFilter,
          status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOIDED] },
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        _sum: { totalMinor: true, paidMinor: true, outstandingMinor: true },
      }),
      // Payments
      this.prisma.payment.aggregate({
        where: {
          ...orgClinicFilter,
          status: PaymentStatus.COMPLETED,
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        _sum: { amountMinor: true },
      }),
      // Refunds
      this.prisma.refund.aggregate({
        where: {
          ...orgClinicFilter,
          status: 'COMPLETED',
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        _sum: { amountMinor: true },
      }),
      // Expenses
      this.prisma.expense.aggregate({
        where: {
          ...orgClinicFilter,
          status: { in: ['APPROVED', 'PAID'] },
          expenseDate: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        _sum: { amountMinor: true },
      }),
      // WhatsApp messages
      this.prisma.whatsappMessage.count({
        where: {
          ...orgClinicFilter,
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
      }),
      // Voice calls
      this.prisma.voiceCallSession.count({
        where: {
          ...orgClinicFilter,
          startedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
      }),
      // AI interaction logs
      this.prisma.aiInteractionLog.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        select: { outcome: true },
      }),
    ]);

    // 2. Previous Window Queries (for Deltas)
    const [
      prevAppointments,
      prevPatientsCount,
      prevNewPatientsCount,
      prevActivePatientsCount,
      prevEncounters,
      prevActiveDoctorsCount,
      prevLabOrders,
      prevLabReports,
      prevInvoices,
      prevPayments,
      prevRefunds,
      prevExpenses,
      prevWhatsappCount,
      prevVoiceCallsCount,
      prevAiInteractions,
    ] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate },
        },
        select: { status: true },
      }),
      this.prisma.patient.count({
        where: {
          organizationId,
          createdAt: { lte: dateRange.previousEndDate },
        },
      }),
      this.prisma.patient.count({
        where: {
          organizationId,
          createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate },
        },
      }),
      this.prisma.patient.count({
        where: {
          organizationId,
          OR: [
            { appointments: { some: { ...orgClinicFilter, createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate } } } },
            { queueTokens: { some: { ...orgClinicFilter, createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate } } } },
            { encounters: { some: { ...orgClinicFilter, createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate } } } },
          ],
        },
      }),
      this.prisma.clinicalEncounter.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate },
        },
        select: { status: true, isFinalized: true },
      }),
      this.prisma.doctor.count({
        where: {
          organizationId,
          status: 'ACTIVE',
          OR: [
            { appointments: { some: { ...orgClinicFilter, createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate } } } },
            { encounters: { some: { ...orgClinicFilter, createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate } } } },
          ],
        },
      }),
      this.prisma.laboratoryOrder.count({
        where: {
          ...orgClinicFilter,
          createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate },
        },
      }),
      this.prisma.laboratoryReport.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate },
        },
        select: { reportStatus: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          ...orgClinicFilter,
          status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOIDED] },
          createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate },
        },
        _sum: { totalMinor: true, paidMinor: true, outstandingMinor: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          ...orgClinicFilter,
          status: PaymentStatus.COMPLETED,
          createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate },
        },
        _sum: { amountMinor: true },
      }),
      this.prisma.refund.aggregate({
        where: {
          ...orgClinicFilter,
          status: 'COMPLETED',
          createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate },
        },
        _sum: { amountMinor: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          ...orgClinicFilter,
          status: { in: ['APPROVED', 'PAID'] },
          expenseDate: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate },
        },
        _sum: { amountMinor: true },
      }),
      this.prisma.whatsappMessage.count({
        where: {
          ...orgClinicFilter,
          createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate },
        },
      }),
      this.prisma.voiceCallSession.count({
        where: {
          ...orgClinicFilter,
          startedAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate },
        },
      }),
      this.prisma.aiInteractionLog.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: { gte: dateRange.previousStartDate, lte: dateRange.previousEndDate },
        },
        select: { outcome: true },
      }),
    ]);

    // Aggregate Current Appointment status
    const currTotalAppts = currAppointments.length;
    const currCompletedAppts = currAppointments.filter((a) => a.status === 'COMPLETED').length;
    const currCancelledAppts = currAppointments.filter((a) => a.status === 'CANCELLED').length;
    const currNoShowAppts = currAppointments.filter((a) => a.status === 'NO_SHOW').length;
    const currCompletionRate = currTotalAppts > 0 ? (currCompletedAppts / currTotalAppts) * 100 : 0;

    // Aggregate Previous Appointment status
    const prevTotalAppts = prevAppointments.length;
    const prevCompletedAppts = prevAppointments.filter((a) => a.status === 'COMPLETED').length;
    const prevCancelledAppts = prevAppointments.filter((a) => a.status === 'CANCELLED').length;
    const prevNoShowAppts = prevAppointments.filter((a) => a.status === 'NO_SHOW').length;
    const prevCompletionRate = prevTotalAppts > 0 ? (prevCompletedAppts / prevTotalAppts) * 100 : 0;

    // Aggregate Encounters
    const currTotalEnc = currEncounters.length;
    const currCompletedEnc = currEncounters.filter((e) => e.status === 'COMPLETED' || e.isFinalized).length;
    const prevTotalEnc = prevEncounters.length;
    const prevCompletedEnc = prevEncounters.filter((e) => e.status === 'COMPLETED' || e.isFinalized).length;

    // Aggregate Lab Reports
    const currReleasedReports = currLabReports.filter((r) => r.reportStatus === 'RELEASED').length;
    const currPendingReviewReports = currLabReports.filter((r) => r.reportStatus === 'PENDING_REVIEW' || r.reportStatus === 'DRAFT').length;
    const prevReleasedReports = prevLabReports.filter((r) => r.reportStatus === 'RELEASED').length;
    const prevPendingReviewReports = prevLabReports.filter((r) => r.reportStatus === 'PENDING_REVIEW' || r.reportStatus === 'DRAFT').length;

    // Aggregate Finance (minor units / paisa)
    const currInvoicedPaisa = currInvoices._sum.totalMinor || 0;
    const prevInvoicedPaisa = prevInvoices._sum.totalMinor || 0;

    const currCollectedPaisa = currPayments._sum.amountMinor || 0;
    const prevCollectedPaisa = prevPayments._sum.amountMinor || 0;

    const currRefundsPaisa = currRefunds._sum.amountMinor || 0;
    const prevRefundsPaisa = prevRefunds._sum.amountMinor || 0;

    const currExpensesPaisa = currExpenses._sum.amountMinor || 0;
    const prevExpensesPaisa = prevExpenses._sum.amountMinor || 0;

    const currOutstandingPaisa = Math.max(0, currInvoicedPaisa - currCollectedPaisa - currRefundsPaisa);
    const prevOutstandingPaisa = Math.max(0, prevInvoicedPaisa - prevCollectedPaisa - prevRefundsPaisa);

    const currNetOperatingPaisa = currCollectedPaisa - currRefundsPaisa - currExpensesPaisa;
    const prevNetOperatingPaisa = prevCollectedPaisa - prevRefundsPaisa - prevExpensesPaisa;

    // AI outcomes
    const currAiInteractionsCount = currAiInteractions.length;
    const currAiHandoversCount = currAiInteractions.filter((i) => i.outcome === 'HANDOVER').length;
    const prevAiInteractionsCount = prevAiInteractions.length;
    const prevAiHandoversCount = prevAiInteractions.filter((i) => i.outcome === 'HANDOVER').length;

    // Log access asynchronously
    if (userId) {
      this.prisma.analyticsAccessLog
        .create({
          data: {
            organizationId,
            clinicId,
            dashboardView: 'EXECUTIVE',
            accessedById: userId,
            queryFilters: { period, startDate, endDate, clinicId },
            executionTimeMs: Date.now() - startTime,
            ipAddress,
            userAgent,
          },
        })
        .catch((err) => this.logger.warn(`Failed to log analytics access: ${err.message}`));
    }

    return {
      period: {
        startDate: dateRange.startDateStr,
        endDate: dateRange.endDateStr,
        previousStartDate: dateRange.previousStartDateStr,
        previousEndDate: dateRange.previousEndDateStr,
        timezone: 'Asia/Karachi',
      },
      appointments: {
        total: AnalyticsTimeHelper.calculateMetric(currTotalAppts, prevTotalAppts),
        completed: AnalyticsTimeHelper.calculateMetric(currCompletedAppts, prevCompletedAppts),
        cancelled: AnalyticsTimeHelper.calculateMetric(currCancelledAppts, prevCancelledAppts),
        noShow: AnalyticsTimeHelper.calculateMetric(currNoShowAppts, prevNoShowAppts),
        completionRate: AnalyticsTimeHelper.calculateMetric(
          Math.round(currCompletionRate * 10) / 10,
          Math.round(prevCompletionRate * 10) / 10,
          '%',
        ),
      },
      patients: {
        totalRegistered: AnalyticsTimeHelper.calculateMetric(currPatientsCount, prevPatientsCount),
        newRegistered: AnalyticsTimeHelper.calculateMetric(currNewPatientsCount, prevNewPatientsCount),
        activePatients: AnalyticsTimeHelper.calculateMetric(currActivePatientsCount, prevActivePatientsCount),
      },
      clinical: {
        totalEncounters: AnalyticsTimeHelper.calculateMetric(currTotalEnc, prevTotalEnc),
        completedEncounters: AnalyticsTimeHelper.calculateMetric(currCompletedEnc, prevCompletedEnc),
        activeDoctors: AnalyticsTimeHelper.calculateMetric(currActiveDoctorsCount, prevActiveDoctorsCount),
      },
      laboratory: {
        totalOrders: AnalyticsTimeHelper.calculateMetric(currLabOrders, prevLabOrders),
        releasedReports: AnalyticsTimeHelper.calculateMetric(currReleasedReports, prevReleasedReports),
        pendingReviewReports: AnalyticsTimeHelper.calculateMetric(currPendingReviewReports, prevPendingReviewReports),
      },
      finance: {
        invoicedAmountPaisa: AnalyticsTimeHelper.calculateMetric(currInvoicedPaisa, prevInvoicedPaisa, 'paisa'),
        collectedPaymentsPaisa: AnalyticsTimeHelper.calculateMetric(currCollectedPaisa, prevCollectedPaisa, 'paisa'),
        outstandingReceivablesPaisa: AnalyticsTimeHelper.calculateMetric(currOutstandingPaisa, prevOutstandingPaisa, 'paisa'),
        refundsPaisa: AnalyticsTimeHelper.calculateMetric(currRefundsPaisa, prevRefundsPaisa, 'paisa'),
        expensesPaisa: AnalyticsTimeHelper.calculateMetric(currExpensesPaisa, prevExpensesPaisa, 'paisa'),
        netOperatingBalancePaisa: AnalyticsTimeHelper.calculateMetric(currNetOperatingPaisa, prevNetOperatingPaisa, 'paisa'),
      },
      communications: {
        totalWhatsappMessages: AnalyticsTimeHelper.calculateMetric(currWhatsappCount, prevWhatsappCount),
        totalVoiceCalls: AnalyticsTimeHelper.calculateMetric(currVoiceCallsCount, prevVoiceCallsCount),
        aiInteractions: AnalyticsTimeHelper.calculateMetric(currAiInteractionsCount, prevAiInteractionsCount),
        aiHandovers: AnalyticsTimeHelper.calculateMetric(currAiHandoversCount, prevAiHandoversCount),
      },
    };
  }
}
