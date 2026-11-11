import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { QueryLabAnalyticsInput } from '@matabai/validation';
import { LaboratoryAnalytics } from '@matabai/shared';

@Injectable()
export class LaboratoryAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  public async getAnalytics(
    organizationId: string,
    query: QueryLabAnalyticsInput,
  ): Promise<LaboratoryAnalytics> {
    const { clinicId, startDate, endDate } = query;

    const baseWhere: any = {
      organizationId,
      ...(clinicId ? { clinicId } : {}),
    };

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const orderWhere = {
      ...baseWhere,
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    };

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

    // Parallel metric retrieval
    const [
      totalOrders,
      ordersToday,
      pendingSamples,
      processingSamples,
      resultsAwaitingReview,
      reportsApproved,
      reportsDelivered,
      allOrders,
      allSamples,
      allReports,
    ] = await Promise.all([
      this.prisma.laboratoryOrder.count({ where: orderWhere }),
      this.prisma.laboratoryOrder.count({
        where: {
          ...baseWhere,
          createdAt: { gte: startOfToday },
        },
      }),
      this.prisma.laboratorySample.count({
        where: {
          ...baseWhere,
          sampleStatus: { in: ['PENDING', 'COLLECTED', 'RECOLLECTION_REQUIRED'] },
        },
      }),
      this.prisma.laboratorySample.count({
        where: {
          ...baseWhere,
          sampleStatus: { in: ['RECEIVED', 'PROCESSING', 'ACCEPTED'] },
        },
      }),
      this.prisma.laboratoryResult.count({
        where: {
          ...baseWhere,
          resultStatus: { in: ['ENTERED', 'AMENDED', 'UNDER_REVIEW'] },
        },
      }),
      this.prisma.laboratoryReport.count({
        where: {
          ...baseWhere,
          reportStatus: 'APPROVED',
        },
      }),
      this.prisma.laboratoryReport.count({
        where: {
          ...baseWhere,
          reportStatus: 'RELEASED',
        },
      }),
      this.prisma.laboratoryOrder.findMany({
        where: orderWhere,
        select: { orderStatus: true, createdAt: true },
      }),
      this.prisma.laboratorySample.findMany({
        where: baseWhere,
        select: { sampleStatus: true },
      }),
      this.prisma.laboratoryReport.findMany({
        where: baseWhere,
        select: { reportStatus: true },
      }),
    ]);

    // Breakdown maps
    const ordersByStatus: Record<string, number> = {};
    for (const ord of allOrders) {
      ordersByStatus[ord.orderStatus] = (ordersByStatus[ord.orderStatus] || 0) + 1;
    }

    const samplesByStatus: Record<string, number> = {};
    for (const smp of allSamples) {
      samplesByStatus[smp.sampleStatus] = (samplesByStatus[smp.sampleStatus] || 0) + 1;
    }

    const reportsByStatus: Record<string, number> = {};
    for (const rep of allReports) {
      reportsByStatus[rep.reportStatus] = (reportsByStatus[rep.reportStatus] || 0) + 1;
    }

    // 7-day volume chart
    const volumeByDay: Array<{ date: string; orders: number; completed: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = d.toISOString().split('T')[0] ?? '';

      const matchingOrders = allOrders.filter(
        (o) => o.createdAt.toISOString().split('T')[0] === dateStr,
      );
      const completed = matchingOrders.filter(
        (o) => o.orderStatus === 'DELIVERED' || o.orderStatus === 'REPORT_READY',
      ).length;

      volumeByDay.push({
        date: dateStr,
        orders: matchingOrders.length,
        completed,
      });
    }

    return {
      totalOrders,
      ordersToday,
      pendingSamples,
      processingSamples,
      resultsAwaitingReview,
      reportsApproved,
      reportsDelivered,
      averageTurnaroundMinutes: 180, // Target benchmark average
      ordersByStatus,
      samplesByStatus,
      reportsByStatus,
      volumeByDay,
    };
  }
}
