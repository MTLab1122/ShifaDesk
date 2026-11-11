import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CallStatus, VoiceHandoverStatus } from '@matabai/shared';

@Injectable()
export class VoiceAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates comprehensive voice reception metrics for clinic
   */
  async getVoiceAnalytics(clinicId?: string, organizationId?: string) {
    const where: any = {};
    if (clinicId) where.clinicId = clinicId;
    if (organizationId) where.organizationId = organizationId;

    const [
      totalCalls,
      completedCalls,
      missedCalls,
      failedCalls,
      handoverCalls,
      allSessions,
      voiceAppointments,
    ] = await Promise.all([
      this.prisma.voiceCallSession.count({ where }),
      this.prisma.voiceCallSession.count({
        where: { ...where, callStatus: CallStatus.COMPLETED },
      }),
      this.prisma.voiceCallSession.count({
        where: {
          ...where,
          callStatus: { in: [CallStatus.NO_ANSWER, CallStatus.BUSY] },
        },
      }),
      this.prisma.voiceCallSession.count({
        where: { ...where, callStatus: CallStatus.FAILED },
      }),
      this.prisma.voiceCallSession.count({
        where: {
          ...where,
          handoverStatus: { in: [VoiceHandoverStatus.REQUESTED, VoiceHandoverStatus.TRANSFERRED] },
        },
      }),
      this.prisma.voiceCallSession.findMany({
        where,
        select: {
          durationSeconds: true,
          selectedLanguage: true,
          startedAt: true,
          callStatus: true,
        },
      }),
      this.prisma.appointment.count({
        where: {
          ...(clinicId ? { clinicId } : {}),
          ...(organizationId ? { organizationId } : {}),
          bookingSource: 'VOICE',
        },
      }),
    ]);

    // Average duration
    const totalDuration = allSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const averageDurationSeconds =
      completedCalls > 0 ? Math.round(totalDuration / completedCalls) : 0;

    // Language distribution
    const languageDistribution: Record<string, number> = { ur: 0, ps: 0, en: 0 };
    for (const session of allSessions) {
      const lang = session.selectedLanguage || 'ur';
      languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;
    }

    // Daily timeline for past 7 days
    const past7Days: Record<string, { total: number; completed: number }> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateParts = d.toISOString().split('T');
      const dateKey = dateParts[0] || 'today';
      past7Days[dateKey] = { total: 0, completed: 0 };
    }

    for (const session of allSessions) {
      const sessionParts = session.startedAt.toISOString().split('T');
      const dateKey = sessionParts[0] || 'today';
      const entry = past7Days[dateKey];
      if (entry) {
        entry.total += 1;
        if (session.callStatus === CallStatus.COMPLETED) {
          entry.completed += 1;
        }
      }
    }

    const callsByDay = Object.entries(past7Days).map(([date, data]) => ({
      date,
      count: data.total,
      completed: data.completed,
    }));

    return {
      totalCalls,
      completedCalls,
      missedCalls,
      failedCalls,
      averageDurationSeconds,
      languageDistribution,
      handoverCount: handoverCalls,
      appointmentsBookedViaVoice: voiceAppointments,
      callsByDay,
    };
  }
}
