import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { PatientAnalytics } from '@matabai/shared';
import { AnalyticsTimeHelper } from './analytics-time.helper';

@Injectable()
export class PatientAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  public async getPatientAnalytics(
    organizationId: string,
    clinicId?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<PatientAnalytics> {
    const dateRange = AnalyticsTimeHelper.resolveDateRange(period, startDate, endDate);

    const orgFilter = { organizationId };
    const orgClinicFilter: any = { organizationId };
    if (clinicId) orgClinicFilter.clinicId = clinicId;

    // 1. Total patients registered
    const totalPatients = await this.prisma.patient.count({
      where: orgFilter,
    });

    // 2. New registrations in range
    const newPatients = await this.prisma.patient.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const newRegistrations = newPatients.length;

    // Daily registration trends
    const regTrendMap: Record<string, number> = {};
    for (const p of newPatients) {
      const dateKey = p.createdAt.toISOString().split('T')[0]!;
      regTrendMap[dateKey] = (regTrendMap[dateKey] || 0) + 1;
    }
    const registrationTrends = Object.entries(regTrendMap).map(([date, count]) => ({
      date,
      newPatients: count,
    }));

    // 3. Active patients in date range (any appointment, encounter, or token)
    const activePatientIds = new Set<string>();

    const [activeAppts, activeEncounters, activeTokens] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        select: { patientId: true },
      }),
      this.prisma.clinicalEncounter.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        select: { patientId: true },
      }),
      this.prisma.queueToken.findMany({
        where: {
          ...orgClinicFilter,
          checkedInAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        select: { patientId: true },
      }),
    ]);

    for (const a of activeAppts) activePatientIds.add(a.patientId);
    for (const e of activeEncounters) activePatientIds.add(e.patientId);
    for (const t of activeTokens) activePatientIds.add(t.patientId);

    const activePatients = activePatientIds.size;
    const inactivePatients = Math.max(0, totalPatients - activePatients);

    // 4. Returning vs New in date range
    // A patient is "returning" if they were created BEFORE dateRange.startDate and had activity in range
    let returningPatients = 0;
    if (activePatientIds.size > 0) {
      const returningCount = await this.prisma.patient.count({
        where: {
          organizationId,
          id: { in: Array.from(activePatientIds) },
          createdAt: { lt: dateRange.startDate },
        },
      });
      returningPatients = returningCount;
    }

    // 5. Conversion rate from appointment to encounter in range
    const apptCount = activeAppts.length;
    const encCountWithAppt = await this.prisma.clinicalEncounter.count({
      where: {
        ...orgClinicFilter,
        appointmentId: { not: null },
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
    });
    const appointmentToEncounterConversionRate =
      apptCount > 0 ? Math.round((encCountWithAppt / apptCount) * 1000) / 10 : 0;

    // 6. Visit frequency distribution (by total encounters per patient)
    const patientVisitCounts = await this.prisma.clinicalEncounter.groupBy({
      by: ['patientId'],
      where: orgClinicFilter,
      _count: { id: true },
    });

    let freq1 = 0;
    let freq2to3 = 0;
    let freq4to6 = 0;
    let freq7plus = 0;

    for (const pvc of patientVisitCounts) {
      const count = pvc._count.id;
      if (count === 1) freq1++;
      else if (count <= 3) freq2to3++;
      else if (count <= 6) freq4to6++;
      else freq7plus++;
    }

    const visitFrequencyDistribution = [
      { visitCountRange: '1 visit', patientCount: freq1 },
      { visitCountRange: '2-3 visits', patientCount: freq2to3 },
      { visitCountRange: '4-6 visits', patientCount: freq4to6 },
      { visitCountRange: '7+ visits', patientCount: freq7plus },
    ];

    // 7. Visits by clinic
    const encountersByClinic = await this.prisma.clinicalEncounter.groupBy({
      by: ['clinicId'],
      where: { organizationId },
      _count: { patientId: true },
    });

    const clinics = await this.prisma.clinic.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });
    const clinicNameMap = new Map(clinics.map((c) => [c.id, c.name]));

    const visitsByClinic = encountersByClinic.map((item) => ({
      clinicId: item.clinicId,
      clinicName: clinicNameMap.get(item.clinicId) || 'Unknown Clinic',
      patientCount: item._count.patientId,
    }));

    return {
      totalPatients,
      newRegistrations,
      returningPatients,
      activePatients,
      inactivePatients,
      appointmentToEncounterConversionRate,
      registrationTrends,
      visitFrequencyDistribution,
      visitsByClinic,
    };
  }
}
