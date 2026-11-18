import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { DoctorStaffAnalytics } from '@matabai/shared';
import { AnalyticsTimeHelper } from './analytics-time.helper';

@Injectable()
export class DoctorStaffAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  public async getStaffAnalytics(
    organizationId: string,
    clinicId?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<DoctorStaffAnalytics> {
    const dateRange = AnalyticsTimeHelper.resolveDateRange(period, startDate, endDate);

    const orgClinicFilter: any = { organizationId };
    if (clinicId) orgClinicFilter.clinicId = clinicId;

    // Fetch all active doctors in organization
    const doctors = await this.prisma.doctor.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        ...(clinicId ? { clinicId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        specialty: true,
      },
      orderBy: { fullName: 'asc' },
    });

    const dateFilter = { gte: dateRange.startDate, lte: dateRange.endDate };

    // Parallel queries across doctors
    const doctorWorkloads = await Promise.all(
      doctors.map(async (doc) => {
        const [
          assignedAppts,
          completedAppts,
          encounters,
          followups,
          labOrders,
        ] = await Promise.all([
          // Appointments assigned
          this.prisma.appointment.count({
            where: {
              ...orgClinicFilter,
              doctorId: doc.id,
              createdAt: dateFilter,
            },
          }),
          // Appointments completed
          this.prisma.appointment.count({
            where: {
              ...orgClinicFilter,
              doctorId: doc.id,
              status: 'COMPLETED',
              createdAt: dateFilter,
            },
          }),
          // Encounters completed
          this.prisma.clinicalEncounter.findMany({
            where: {
              ...orgClinicFilter,
              doctorId: doc.id,
              status: { in: ['COMPLETED'] },
              createdAt: dateFilter,
            },
            select: {
              startTime: true,
              endTime: true,
            },
          }),
          // Followups scheduled
          this.prisma.encounterFollowup.findMany({
            where: {
              encounter: {
                ...orgClinicFilter,
                doctorId: doc.id,
              },
              createdAt: dateFilter,
            },
            select: { status: true },
          }),
          // Lab orders initiated
          this.prisma.laboratoryOrder.count({
            where: {
              ...orgClinicFilter,
              orderingDoctorId: doc.id,
              createdAt: dateFilter,
            },
          }),
        ]);

        // Calculate average encounter duration in minutes
        let totalDurationMinutes = 0;
        let durationSamples = 0;

        for (const enc of encounters) {
          if (enc.startTime && enc.endTime) {
            const [startH, startM] = enc.startTime.split(':').map(Number);
            const [endH, endM] = enc.endTime.split(':').map(Number);
            if (
              startH !== undefined &&
              startM !== undefined &&
              endH !== undefined &&
              endM !== undefined
            ) {
              const startMinutes = startH * 60 + startM;
              const endMinutes = endH * 60 + endM;
              const diff = endMinutes - startMinutes;
              if (diff > 0 && diff < 300) {
                totalDurationMinutes += diff;
                durationSamples++;
              }
            }
          }
        }

        const avgEncounterDurationMinutes =
          durationSamples > 0
            ? Math.round((totalDurationMinutes / durationSamples) * 10) / 10
            : 0;

        const followupsScheduled = followups.length;
        const followupsCompleted = followups.filter((f) => f.status === 'COMPLETED').length;

        return {
          doctorId: doc.id,
          doctorName: doc.fullName,
          specialty: doc.specialty,
          appointmentsAssigned: assignedAppts,
          appointmentsCompleted: completedAppts,
          encountersCompleted: encounters.length,
          avgEncounterDurationMinutes,
          followupsScheduled,
          followupsCompleted,
          labOrdersInitiated: labOrders,
        };
      }),
    );

    return {
      doctorWorkloads,
    };
  }
}
