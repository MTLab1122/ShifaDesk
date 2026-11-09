import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationJobStatus } from '@matabai/shared';
import { QueryNotificationJobsDto } from '@matabai/validation';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: NotificationDispatcherService,
  ) {}

  async findAll(organizationId: string, query: QueryNotificationJobsDto) {
    const {
      clinicId,
      channel,
      eventType,
      status,
      recipientId,
      relatedEntityType,
      relatedEntityId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(clinicId ? { clinicId } : {}),
      ...(channel ? { channel } : {}),
      ...(eventType ? { eventType } : {}),
      ...(status ? { status } : {}),
      ...(recipientId ? { recipientId } : {}),
      ...(relatedEntityType ? { relatedEntityType } : {}),
      ...(relatedEntityId ? { relatedEntityId } : {}),
    };

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.notificationJob.findMany({
        where,
        include: {
          template: true,
          attemptLogs: { orderBy: { attemptedAt: 'desc' }, take: 5 },
        },
        orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.notificationJob.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(organizationId: string, id: string) {
    const job = await this.prisma.notificationJob.findFirst({
      where: { id, organizationId },
      include: {
        template: true,
        attemptLogs: { orderBy: { attemptedAt: 'desc' } },
        eventLogs: { orderBy: { occurredAt: 'desc' } },
      },
    });

    if (!job) {
      throw new NotFoundException(`Notification job with id ${id} not found`);
    }

    return job;
  }

  async retryJob(organizationId: string, id: string, force: boolean = false) {
    const job = await this.findById(organizationId, id);

    if (!force && job.status !== NotificationJobStatus.FAILED && job.status !== NotificationJobStatus.DEAD_LETTER) {
      throw new BadRequestException(`Cannot retry job in status ${job.status} without force=true`);
    }

    // Reset status and schedule immediately
    await this.prisma.notificationJob.update({
      where: { id },
      data: {
        status: NotificationJobStatus.PENDING,
        scheduledAt: new Date(),
        claimedAt: null,
        claimedBy: null,
      },
    });

    await this.prisma.notificationEvent.create({
      data: {
        notificationJobId: id,
        eventType: 'RETRY_REQUESTED',
        eventPayload: { forced: force },
      },
    });

    // Attempt immediate dispatch
    await this.dispatcher.dispatchJob(id);

    return this.findById(organizationId, id);
  }

  async cancelJob(organizationId: string, id: string, reason?: string) {
    const job = await this.findById(organizationId, id);

    if (job.status === NotificationJobStatus.SENT || job.status === NotificationJobStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel a notification job that has already been dispatched');
    }

    const updated = await this.prisma.notificationJob.update({
      where: { id },
      data: {
        status: NotificationJobStatus.CANCELLED,
        suppressionReason: reason || 'Cancelled by staff user',
        claimedAt: null,
        claimedBy: null,
      },
    });

    await this.prisma.notificationEvent.create({
      data: {
        notificationJobId: id,
        eventType: 'CANCELLED',
        eventPayload: { reason },
      },
    });

    return updated;
  }

  async getAnalytics(organizationId: string, clinicId?: string) {
    const where: any = {
      organizationId,
      ...(clinicId ? { clinicId } : {}),
    };

    const [
      totalJobs,
      sentCount,
      deliveredCount,
      readCount,
      failedCount,
      suppressedCount,
      pendingCount,
      jobs,
    ] = await Promise.all([
      this.prisma.notificationJob.count({ where }),
      this.prisma.notificationJob.count({ where: { ...where, status: NotificationJobStatus.SENT } }),
      this.prisma.notificationJob.count({ where: { ...where, status: NotificationJobStatus.DELIVERED } }),
      this.prisma.notificationJob.count({ where: { ...where, status: NotificationJobStatus.READ } }),
      this.prisma.notificationJob.count({
        where: {
          ...where,
          status: { in: [NotificationJobStatus.FAILED, NotificationJobStatus.DEAD_LETTER] },
        },
      }),
      this.prisma.notificationJob.count({ where: { ...where, status: NotificationJobStatus.SUPPRESSED } }),
      this.prisma.notificationJob.count({
        where: {
          ...where,
          status: { in: [NotificationJobStatus.PENDING, NotificationJobStatus.SCHEDULED, NotificationJobStatus.RETRYING] },
        },
      }),
      this.prisma.notificationJob.findMany({
        where,
        select: { channel: true, status: true, eventType: true, attempts: true },
      }),
    ]);

    const channelBreakdown: Record<string, number> = {};
    const statusBreakdown: Record<string, number> = {};
    const eventTypeBreakdown: Record<string, number> = {};
    let totalAttempts = 0;

    for (const j of jobs) {
      channelBreakdown[j.channel] = (channelBreakdown[j.channel] || 0) + 1;
      statusBreakdown[j.status] = (statusBreakdown[j.status] || 0) + 1;
      eventTypeBreakdown[j.eventType] = (eventTypeBreakdown[j.eventType] || 0) + 1;
      totalAttempts += j.attempts;
    }

    const successfulDispatches = sentCount + deliveredCount + readCount;
    const attemptedDispatches = successfulDispatches + failedCount;
    const deliverySuccessRate = attemptedDispatches > 0
      ? Math.round((successfulDispatches / attemptedDispatches) * 100)
      : 100;

    const averageAttempts = jobs.length > 0
      ? Math.round((totalAttempts / jobs.length) * 10) / 10
      : 0;

    return {
      totalJobs,
      sentCount,
      deliveredCount,
      readCount,
      failedCount,
      suppressedCount,
      pendingCount,
      deliverySuccessRate,
      averageAttempts,
      channelBreakdown,
      statusBreakdown,
      eventTypeBreakdown,
    };
  }
}
