import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AvailableSlot } from '@matabai/shared';

@Injectable()
export class SlotGenerationService {
  constructor(private readonly prisma: PrismaService) {}

  private parseTimeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  }

  private formatMinutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private getTodayInTimezone(timezone: string): { dateStr: string; currentMinutes: number } {
    try {
      const now = new Date();
      const dateParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now); // "YYYY-MM-DD"

      const timeParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now);

      const hour = Number(timeParts.find((p) => p.type === 'hour')?.value || '0');
      const minute = Number(timeParts.find((p) => p.type === 'minute')?.value || '0');

      return {
        dateStr: dateParts,
        currentMinutes: hour * 60 + minute,
      };
    } catch {
      // Fallback if timezone string is invalid
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0] || '';
      const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      return { dateStr, currentMinutes };
    }
  }

  async generateSlots(
    clinicId: string,
    doctorId: string,
    requestedDate: string,
  ): Promise<AvailableSlot[]> {
    // 1. Verify doctor
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });
    if (!doctor || doctor.status !== 'ACTIVE') {
      return [];
    }

    // 2. Verify clinic
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });
    if (!clinic || clinic.status !== 'ACTIVE') {
      return [];
    }

    // 3. Verify doctor-clinic relationship
    const isPrimaryClinic = doctor.clinicId === clinicId;
    if (!isPrimaryClinic) {
      const assignment = await this.prisma.doctorClinicAssignment.findUnique({
        where: {
          doctorId_clinicId: { doctorId, clinicId },
        },
      });
      if (!assignment || assignment.status !== 'ACTIVE') {
        return [];
      }
    }

    const clinicTz = clinic.timezone || 'Asia/Karachi';
    const { dateStr: todayInTz, currentMinutes: nowMinutes } = this.getTodayInTimezone(clinicTz);

    // Past date check
    if (requestedDate < todayInTz) {
      return [];
    }

    // 4. Check schedule exceptions for this date
    const exception = await this.prisma.doctorScheduleException.findUnique({
      where: {
        doctorId_clinicId_exceptionDate: {
          doctorId,
          clinicId,
          exceptionDate: requestedDate,
        },
      },
    });

    let periodsToProcess: Array<{
      startMinutes: number;
      endMinutes: number;
      slotDuration: number;
      breakStart?: number | null;
      breakEnd?: number | null;
    }> = [];

    if (exception) {
      if (exception.exceptionType === 'UNAVAILABLE') {
        // Doctor is on leave / public holiday
        return [];
      }
      if (exception.exceptionType === 'CUSTOM_HOURS' && exception.startTime && exception.endTime) {
        periodsToProcess.push({
          startMinutes: this.parseTimeToMinutes(exception.startTime),
          endMinutes: this.parseTimeToMinutes(exception.endTime),
          slotDuration: 20, // default slot duration for custom hours
        });
      }
    } else {
      // 5. Normal working hours
      const [year, month, day] = requestedDate.split('-').map(Number);
      if (year === undefined || month === undefined || day === undefined) {
        throw new BadRequestException('Invalid date format, expected YYYY-MM-DD');
      }
      // Note: Date.UTC is safe for day-of-week calculation regardless of local server tz
      const dayOfWeek = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();

      const workingHours = await this.prisma.doctorWorkingHours.findMany({
        where: {
          doctorId,
          clinicId,
          dayOfWeek,
          isActive: true,
        },
        orderBy: { startTime: 'asc' },
      });

      if (workingHours.length === 0) {
        return [];
      }

      for (const wh of workingHours) {
        periodsToProcess.push({
          startMinutes: this.parseTimeToMinutes(wh.startTime),
          endMinutes: this.parseTimeToMinutes(wh.endTime),
          slotDuration: wh.slotDurationMinutes || 20,
          breakStart: wh.breakStartTime ? this.parseTimeToMinutes(wh.breakStartTime) : null,
          breakEnd: wh.breakEndTime ? this.parseTimeToMinutes(wh.breakEndTime) : null,
        });
      }
    }

    // 6. Query existing non-cancelled appointments for this doctor, clinic, and date
    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        clinicId,
        appointmentDate: requestedDate,
        status: { not: 'CANCELLED' },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    const bookedIntervals = existingAppointments.map((apt) => ({
      start: this.parseTimeToMinutes(apt.startTime),
      end: this.parseTimeToMinutes(apt.endTime),
    }));

    // 7. Generate slots
    const availableSlots: AvailableSlot[] = [];

    for (const period of periodsToProcess) {
      let cur = period.startMinutes;
      while (cur + period.slotDuration <= period.endMinutes) {
        const slotEnd = cur + period.slotDuration;

        // Break exclusion check
        let isDuringBreak = false;
        if (period.breakStart != null && period.breakEnd != null) {
          if (!(slotEnd <= period.breakStart || cur >= period.breakEnd)) {
            isDuringBreak = true;
          }
        }

        // Past slot check (if date is today in clinic timezone)
        const isPastSlot = requestedDate === todayInTz && cur <= nowMinutes;

        // Occupied check
        let isBooked = false;
        for (const booked of bookedIntervals) {
          if (!(slotEnd <= booked.start || cur >= booked.end)) {
            isBooked = true;
            break;
          }
        }

        if (!isDuringBreak && !isPastSlot && !isBooked) {
          availableSlots.push({
            date: requestedDate,
            startTime: this.formatMinutesToTime(cur),
            endTime: this.formatMinutesToTime(slotEnd),
            timezone: clinicTz,
            isAvailable: true,
          });
        }

        cur += period.slotDuration;
      }
    }

    return availableSlots;
  }
}
