import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { AppointmentAnalytics } from '@matabai/shared';
import { AnalyticsTimeHelper } from './analytics-time.helper';

@Injectable()
export class AppointmentAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  public async getAppointmentAnalytics(
    organizationId: string,
    clinicId?: string,
    doctorId?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AppointmentAnalytics> {
    const dateRange = AnalyticsTimeHelper.resolveDateRange(period, startDate, endDate);

    const where: any = {
      organizationId,
      createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
    };
    if (clinicId) where.clinicId = clinicId;
    if (doctorId) where.doctorId = doctorId;

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        doctor: {
          select: { id: true, fullName: true, specialty: true },
        },
        clinic: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalAppointments = appointments.length;
    let completedAppointments = 0;
    let cancelledAppointments = 0;
    let noShowAppointments = 0;
    let reschedulingCount = 0;
    let walkInCount = 0;
    let scheduledCount = 0;

    const statusDistribution: Record<string, number> = {};
    const timelineMap: Record<string, { total: number; completed: number; cancelled: number; noShow: number }> = {};
    const specialtyMap: Record<string, number> = {};
    const doctorMap: Record<string, { doctorName: string; count: number }> = {};
    const clinicMap: Record<string, { clinicName: string; count: number }> = {};
    const hourMap: Record<number, number> = {};
    const dayMap: Record<string, number> = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let totalLeadTimeHours = 0;
    let leadTimeCount = 0;

    for (const appt of appointments) {
      // Status counts
      statusDistribution[appt.status] = (statusDistribution[appt.status] || 0) + 1;
      if (appt.status === 'COMPLETED') completedAppointments++;
      else if (appt.status === 'CANCELLED') cancelledAppointments++;
      else if (appt.status === 'NO_SHOW') noShowAppointments++;

      // Reschedule & source
      if (appt.rescheduledFromId) reschedulingCount++;
      if (appt.bookingSource === 'WALK_IN' || appt.reasonForVisit?.toLowerCase().includes('walk-in')) {
        walkInCount++;
      } else {
        scheduledCount++;
      }

      // Date timeline
      const dateKey = appt.appointmentDate || appt.createdAt.toISOString().split('T')[0]!;
      if (!timelineMap[dateKey]) {
        timelineMap[dateKey] = { total: 0, completed: 0, cancelled: 0, noShow: 0 };
      }
      timelineMap[dateKey].total++;
      if (appt.status === 'COMPLETED') timelineMap[dateKey].completed++;
      if (appt.status === 'CANCELLED') timelineMap[dateKey].cancelled++;
      if (appt.status === 'NO_SHOW') timelineMap[dateKey].noShow++;

      // Specialty & Doctor
      const specialty = appt.doctor?.specialty || 'General';
      specialtyMap[specialty] = (specialtyMap[specialty] || 0) + 1;

      if (appt.doctor) {
        let docEntry = doctorMap[appt.doctor.id];
        if (!docEntry) {
          docEntry = { doctorName: appt.doctor.fullName, count: 0 };
          doctorMap[appt.doctor.id] = docEntry;
        }
        docEntry.count++;
      }

      // Clinic
      if (appt.clinic) {
        let clinicEntry = clinicMap[appt.clinic.id];
        if (!clinicEntry) {
          clinicEntry = { clinicName: appt.clinic.name, count: 0 };
          clinicMap[appt.clinic.id] = clinicEntry;
        }
        clinicEntry.count++;
      }

      // Booking Hour & Day of week
      const createdHour = appt.createdAt.getHours();
      hourMap[createdHour] = (hourMap[createdHour] || 0) + 1;

      const dayName = dayNames[appt.createdAt.getDay()] || 'Monday';
      dayMap[dayName] = (dayMap[dayName] || 0) + 1;

      // Lead time calculation
      if (appt.appointmentDate && appt.startTime) {
        const scheduledTime = new Date(`${appt.appointmentDate}T${appt.startTime}:00`);
        const leadDiffMs = scheduledTime.getTime() - appt.createdAt.getTime();
        if (leadDiffMs > 0) {
          totalLeadTimeHours += leadDiffMs / (1000 * 60 * 60);
          leadTimeCount++;
        }
      }
    }

    const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
    const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0;
    const noShowRate = totalAppointments > 0 ? (noShowAppointments / totalAppointments) * 100 : 0;
    const avgBookingLeadTimeHours = leadTimeCount > 0 ? totalLeadTimeHours / leadTimeCount : 0;

    const volumeTimeline = Object.entries(timelineMap).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    const demandBySpecialty = Object.entries(specialtyMap).map(([specialty, count]) => ({
      specialty,
      count,
    }));

    const demandByDoctor = Object.entries(doctorMap).map(([doctorId, data]) => ({
      doctorId,
      doctorName: data.doctorName,
      count: data.count,
    }));

    const demandByClinic = Object.entries(clinicMap).map(([clinicId, data]) => ({
      clinicId,
      clinicName: data.clinicName,
      count: data.count,
    }));

    const peakBookingHours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourMap[hour] || 0,
    }));

    const peakBookingDays = Object.entries(dayMap).map(([day, count]) => ({
      day,
      count,
    }));

    return {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments,
      completionRate: Math.round(completionRate * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      noShowRate: Math.round(noShowRate * 10) / 10,
      reschedulingCount,
      walkInCount,
      scheduledCount,
      avgBookingLeadTimeHours: Math.round(avgBookingLeadTimeHours * 10) / 10,
      volumeTimeline,
      statusDistribution,
      demandBySpecialty,
      demandByDoctor,
      demandByClinic,
      peakBookingHours,
      peakBookingDays,
    };
  }
}
