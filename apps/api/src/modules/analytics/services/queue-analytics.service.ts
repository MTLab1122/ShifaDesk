import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { QueueAnalytics } from '@matabai/shared';
import { AnalyticsTimeHelper } from './analytics-time.helper';

@Injectable()
export class QueueAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  public async getQueueAnalytics(
    organizationId: string,
    clinicId?: string,
    doctorId?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<QueueAnalytics> {
    const dateRange = AnalyticsTimeHelper.resolveDateRange(period, startDate, endDate);

    const where: any = {
      organizationId,
      checkedInAt: { gte: dateRange.startDate, lte: dateRange.endDate },
    };
    if (clinicId) where.clinicId = clinicId;
    if (doctorId) {
      where.queueSession = { doctorId };
    }

    const tokens = await this.prisma.queueToken.findMany({
      where,
      include: {
        clinic: { select: { id: true, name: true } },
        queueSession: {
          select: {
            doctor: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { checkedInAt: 'asc' },
    });

    const tokensIssued = tokens.length;
    let tokensCompleted = 0;
    let tokensSkipped = 0;
    let tokensCancelled = 0;
    let tokensNoShow = 0;

    const waitTimes: number[] = [];
    const serviceDurations: number[] = [];

    const hourlyLoadMap: Record<number, number> = {};
    const dailyVolumeMap: Record<string, { tokens: number; completed: number }> = {};
    const doctorPerfMap: Record<string, { doctorName: string; tokensServed: number; totalServiceMinutes: number }> = {};
    const clinicPerfMap: Record<string, { clinicName: string; tokensServed: number; totalWaitMinutes: number; waitSampleCount: number }> = {};

    for (const t of tokens) {
      if (t.status === 'COMPLETED') tokensCompleted++;
      else if (t.status === 'SKIPPED') tokensSkipped++;
      else if (t.status === 'CANCELLED') tokensCancelled++;
      else if (t.status === 'NO_SHOW') tokensNoShow++;

      // Wait time calculation (checkedInAt to calledAt or serviceStartedAt)
      const callTime = t.calledAt || t.serviceStartedAt;
      let waitMinutes: number | null = null;
      if (callTime && t.checkedInAt) {
        const diffMs = callTime.getTime() - t.checkedInAt.getTime();
        if (diffMs >= 0) {
          waitMinutes = diffMs / (1000 * 60);
          waitTimes.push(waitMinutes);
        }
      }

      // Service duration calculation (serviceStartedAt to completedAt)
      let serviceMinutes: number | null = null;
      if (t.completedAt && t.serviceStartedAt) {
        const diffMs = t.completedAt.getTime() - t.serviceStartedAt.getTime();
        if (diffMs >= 0) {
          serviceMinutes = diffMs / (1000 * 60);
          serviceDurations.push(serviceMinutes);
        }
      }

      // Hourly load based on check-in
      const hour = t.checkedInAt.getHours();
      hourlyLoadMap[hour] = (hourlyLoadMap[hour] || 0) + 1;

      // Daily volume
      const dateKey = t.checkedInAt.toISOString().split('T')[0]!;
      if (!dailyVolumeMap[dateKey]) {
        dailyVolumeMap[dateKey] = { tokens: 0, completed: 0 };
      }
      dailyVolumeMap[dateKey].tokens++;
      if (t.status === 'COMPLETED') {
        dailyVolumeMap[dateKey].completed++;
      }

      // Doctor Performance
      const doctor = t.queueSession?.doctor;
      if (doctor) {
        let docPerf = doctorPerfMap[doctor.id];
        if (!docPerf) {
          docPerf = { doctorName: doctor.fullName, tokensServed: 0, totalServiceMinutes: 0 };
          doctorPerfMap[doctor.id] = docPerf;
        }
        if (t.status === 'COMPLETED') {
          docPerf.tokensServed++;
          if (serviceMinutes !== null) {
            docPerf.totalServiceMinutes += serviceMinutes;
          }
        }
      }

      // Clinic Performance
      if (t.clinic) {
        let clPerf = clinicPerfMap[t.clinic.id];
        if (!clPerf) {
          clPerf = { clinicName: t.clinic.name, tokensServed: 0, totalWaitMinutes: 0, waitSampleCount: 0 };
          clinicPerfMap[t.clinic.id] = clPerf;
        }
        if (t.status === 'COMPLETED') {
          clPerf.tokensServed++;
        }
        if (waitMinutes !== null) {
          clPerf.totalWaitMinutes += waitMinutes;
          clPerf.waitSampleCount++;
        }
      }
    }

    // Average & Median Wait Times
    const sampleSizeWaitTime = waitTimes.length;
    let avgWaitTimeMinutes = 0;
    let medianWaitTimeMinutes = 0;
    if (sampleSizeWaitTime > 0) {
      const sumWait = waitTimes.reduce((acc, val) => acc + val, 0);
      avgWaitTimeMinutes = sumWait / sampleSizeWaitTime;

      waitTimes.sort((a, b) => a - b);
      const mid = Math.floor(sampleSizeWaitTime / 2);
      if (sampleSizeWaitTime % 2 === 0) {
        medianWaitTimeMinutes = (waitTimes[mid - 1]! + waitTimes[mid]!) / 2;
      } else {
        medianWaitTimeMinutes = waitTimes[mid]!;
      }
    }

    // Average Service Duration
    const sampleSizeServiceDuration = serviceDurations.length;
    let avgServiceDurationMinutes = 0;
    if (sampleSizeServiceDuration > 0) {
      const sumService = serviceDurations.reduce((acc, val) => acc + val, 0);
      avgServiceDurationMinutes = sumService / sampleSizeServiceDuration;
    }

    const hourlyQueueLoad = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      tokens: hourlyLoadMap[hour] || 0,
    }));

    const dailyQueueVolume = Object.entries(dailyVolumeMap).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    const doctorQueuePerformance = Object.entries(doctorPerfMap).map(([docId, data]) => ({
      doctorId: docId,
      doctorName: data.doctorName,
      tokensServed: data.tokensServed,
      avgServiceMinutes:
        data.tokensServed > 0 ? Math.round((data.totalServiceMinutes / data.tokensServed) * 10) / 10 : 0,
    }));

    const clinicQueuePerformance = Object.entries(clinicPerfMap).map(([cId, data]) => ({
      clinicId: cId,
      clinicName: data.clinicName,
      tokensServed: data.tokensServed,
      avgWaitMinutes:
        data.waitSampleCount > 0 ? Math.round((data.totalWaitMinutes / data.waitSampleCount) * 10) / 10 : 0,
    }));

    return {
      tokensIssued,
      tokensCompleted,
      tokensSkipped,
      tokensCancelled,
      tokensNoShow,
      sampleSizeWaitTime,
      avgWaitTimeMinutes: Math.round(avgWaitTimeMinutes * 10) / 10,
      medianWaitTimeMinutes: Math.round(medianWaitTimeMinutes * 10) / 10,
      sampleSizeServiceDuration,
      avgServiceDurationMinutes: Math.round(avgServiceDurationMinutes * 10) / 10,
      hourlyQueueLoad,
      dailyQueueVolume,
      doctorQueuePerformance,
      clinicQueuePerformance,
    };
  }
}
