import {
  Controller,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { QueueSessionService } from './queue-session.service';
import { QueueTokenStatus, PublicQueueDisplay } from '@matabai/shared';

@Controller('public/queues')
export class PublicQueueController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: QueueSessionService,
  ) {}

  @Get(':publicQueueId')
  async getPublicQueue(
    @Param('publicQueueId') publicQueueId: string,
  ): Promise<PublicQueueDisplay> {
    const settings = await this.prisma.clinicQueueSettings.findUnique({
      where: { publicQueueId },
      include: {
        clinic: { select: { name: true, timezone: true } },
        doctor: { select: { fullName: true, specialty: true } },
      },
    });

    if (!settings || !settings.isActive || !settings.isPublicDisplayEnabled) {
      throw new NotFoundException('Public queue display not found or disabled');
    }

    const today = this.sessionService.getTodayInTimezone(settings.clinic.timezone);

    // Find active session for today
    const session = await this.prisma.clinicQueueSession.findUnique({
      where: {
        queueSettingsId_sessionDate: {
          queueSettingsId: settings.id,
          sessionDate: today,
        },
      },
    });

    if (!session) {
      return {
        clinicName: settings.clinic.name,
        queueName: settings.queueName,
        doctorName: settings.doctor ? settings.doctor.fullName : null,
        status: 'NOT_STARTED',
        currentServingToken: null,
        recentlyCalledTokens: [],
        waitingCount: 0,
        estimatedWaitMinutes: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    // Current called or serving token
    const currentActive = await this.prisma.queueToken.findFirst({
      where: {
        queueSessionId: session.id,
        status: { in: [QueueTokenStatus.CALLED, QueueTokenStatus.SERVING] },
      },
      orderBy: { updatedAt: 'desc' },
      select: { tokenDisplay: true },
    });

    // Recently called/completed tokens (last 5)
    const recentlyCalled = await this.prisma.queueToken.findMany({
      where: {
        queueSessionId: session.id,
        status: {
          in: [
            QueueTokenStatus.CALLED,
            QueueTokenStatus.SERVING,
            QueueTokenStatus.COMPLETED,
          ],
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { tokenDisplay: true },
    });

    // Waiting count
    const waitingCount = await this.prisma.queueToken.count({
      where: {
        queueSessionId: session.id,
        status: QueueTokenStatus.WAITING,
      },
    });

    return {
      clinicName: settings.clinic.name,
      queueName: settings.queueName,
      doctorName: settings.doctor ? settings.doctor.fullName : null,
      status: session.status,
      currentServingToken: currentActive?.tokenDisplay || null,
      recentlyCalledTokens: recentlyCalled.map((t) => t.tokenDisplay),
      waitingCount,
      estimatedWaitMinutes: waitingCount * settings.estimatedConsultationMinutes,
      lastUpdated: new Date().toISOString(),
    };
  }
}

