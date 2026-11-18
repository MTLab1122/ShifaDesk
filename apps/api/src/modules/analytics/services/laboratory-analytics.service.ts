import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { LaboratoryAnalyticsData } from '@matabai/shared';
import { AnalyticsTimeHelper } from './analytics-time.helper';

@Injectable()
export class LaboratoryAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  public async getLaboratoryAnalytics(
    organizationId: string,
    clinicId?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<LaboratoryAnalyticsData> {
    const dateRange = AnalyticsTimeHelper.resolveDateRange(period, startDate, endDate);

    const orgClinicFilter: any = { organizationId };
    if (clinicId) orgClinicFilter.clinicId = clinicId;

    const dateFilter = { gte: dateRange.startDate, lte: dateRange.endDate };

    // Parallel fetch for lab orders, samples, reports, and lab revenue
    const [orders, samples, reports, labInvoiceItems] = await Promise.all([
      // Orders
      this.prisma.laboratoryOrder.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: dateFilter,
        },
        include: {
          items: {
            include: {
              test: {
                include: { category: true },
              },
            },
          },
          reports: {
            select: {
              reportStatus: true,
              releasedAt: true,
              approvedAt: true,
            },
          },
        },
      }),
      // Samples
      this.prisma.laboratorySample.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: dateFilter,
        },
        select: {
          sampleStatus: true,
        },
      }),
      // Reports
      this.prisma.laboratoryReport.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: dateFilter,
        },
        select: {
          reportStatus: true,
        },
      }),
      // Invoice items for laboratory
      this.prisma.invoiceItem.findMany({
        where: {
          invoice: {
            ...orgClinicFilter,
            createdAt: dateFilter,
            status: { notIn: ['CANCELLED', 'VOIDED'] },
          },
          itemType: { in: ['LAB_TEST', 'LAB_PACKAGE'] },
        },
        select: {
          totalMinor: true,
        },
      }),
    ]);

    const totalOrders = orders.length;
    const ordersByStatus: Record<string, number> = {};
    const categoryCountMap: Record<string, number> = {};

    let totalTurnaroundHours = 0;
    let turnaroundSamplesCount = 0;

    for (const order of orders) {
      ordersByStatus[order.orderStatus] = (ordersByStatus[order.orderStatus] || 0) + 1;

      // Category breakdown from items
      for (const item of order.items) {
        const catName = item.test?.category?.name || 'General';
        categoryCountMap[catName] = (categoryCountMap[catName] || 0) + 1;
      }

      // Turnaround time: order createdAt to report releasedAt (or approvedAt)
      if (order.reports && order.reports.length > 0) {
        for (const rep of order.reports) {
          const completionTime = rep.releasedAt || rep.approvedAt;
          if (completionTime) {
            const diffMs = completionTime.getTime() - order.createdAt.getTime();
            if (diffMs > 0) {
              totalTurnaroundHours += diffMs / (1000 * 60 * 60);
              turnaroundSamplesCount++;
              break; // count once per order
            }
          }
        }
      }
    }

    const ordersByCategory = Object.entries(categoryCountMap).map(([category, count]) => ({
      category,
      count,
    }));

    // Samples metrics
    const sampleCollectionVolume = samples.length;
    const rejectedSamplesCount = samples.filter((s) => s.sampleStatus === 'REJECTED').length;
    const recollectionSamplesCount = samples.filter(
      (s) => s.sampleStatus === 'RECOLLECTION_REQUIRED',
    ).length;

    const sampleRejectionRate =
      sampleCollectionVolume > 0
        ? Math.round((rejectedSamplesCount / sampleCollectionVolume) * 1000) / 10
        : 0;
    const recollectionRate =
      sampleCollectionVolume > 0
        ? Math.round((recollectionSamplesCount / sampleCollectionVolume) * 1000) / 10
        : 0;

    const avgTurnaroundHours =
      turnaroundSamplesCount > 0
        ? Math.round((totalTurnaroundHours / turnaroundSamplesCount) * 10) / 10
        : 0;

    // Reports counts
    const reportsApproved = reports.filter((r) => r.reportStatus === 'APPROVED' || r.reportStatus === 'RELEASED').length;
    const reportsReleased = reports.filter((r) => r.reportStatus === 'RELEASED').length;
    const reportsPendingReview = reports.filter(
      (r) => r.reportStatus === 'PENDING_REVIEW' || r.reportStatus === 'DRAFT',
    ).length;

    // Revenue in paisa
    const revenuePaisa = labInvoiceItems.reduce((acc, item) => acc + item.totalMinor, 0);

    return {
      totalOrders,
      ordersByStatus,
      ordersByCategory,
      sampleCollectionVolume,
      sampleRejectionRate,
      recollectionRate,
      avgTurnaroundHours,
      reportsApproved,
      reportsReleased,
      reportsPendingReview,
      revenuePaisa,
    };
  }
}
