import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationJobStatus } from '@matabai/shared';
import * as crypto from 'crypto';

@Injectable()
export class NotificationWorkerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(NotificationWorkerService.name);
  private readonly workerId = `worker-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  private timer?: NodeJS.Timeout;
  private isProcessing = false;
  private readonly pollIntervalMs = 5000; // 5 seconds
  private readonly staleLockThresholdMs = 5 * 60 * 1000; // 5 minutes stale lock recovery
  private readonly batchSize = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: NotificationDispatcherService,
  ) {}

  onApplicationBootstrap() {
    this.logger.log(`Notification worker starting with ID ${this.workerId}`);
    // Start background polling loop
    this.timer = setInterval(() => {
      this.processDueJobs().catch((err) => {
        this.logger.error(`Error in notification worker loop: ${err.message}`, err.stack);
      });
    }, this.pollIntervalMs);
  }

  onApplicationShutdown() {
    this.logger.log(`Notification worker ${this.workerId} stopping...`);
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /**
   * Main worker tick: claim and execute due notification jobs
   */
  async processDueJobs(): Promise<number> {
    if (this.isProcessing) {
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      const now = new Date();
      const staleThreshold = new Date(now.getTime() - this.staleLockThresholdMs);

      // 1. Find jobs ready for processing:
      // status IN ('SCHEDULED', 'PENDING', 'RETRYING') AND scheduledAt <= now
      // AND (claimedAt IS NULL OR claimedAt < staleThreshold)
      const dueJobs = await this.prisma.notificationJob.findMany({
        where: {
          status: {
            in: [
              NotificationJobStatus.SCHEDULED,
              NotificationJobStatus.PENDING,
              NotificationJobStatus.RETRYING,
            ],
          },
          scheduledAt: { lte: now },
          OR: [
            { claimedAt: null },
            { claimedAt: { lte: staleThreshold } },
          ],
        },
        orderBy: [{ scheduledAt: 'asc' }],
        take: this.batchSize,
        select: { id: true },
      });

      if (dueJobs.length === 0) {
        return 0;
      }

      const jobIds = dueJobs.map(j => j.id);

      // 2. Atomically claim the batch
      const claimResult = await this.prisma.notificationJob.updateMany({
        where: {
          id: { in: jobIds },
          OR: [
            { claimedAt: null },
            { claimedAt: { lte: staleThreshold } },
          ],
        },
        data: {
          claimedAt: now,
          claimedBy: this.workerId,
          status: NotificationJobStatus.PROCESSING,
        },
      });

      this.logger.log(`Worker ${this.workerId} claimed ${claimResult.count} jobs for processing`);

      // 3. Dispatch each claimed job
      for (const jobId of jobIds) {
        try {
          await this.dispatcher.dispatchJob(jobId);
          processedCount++;
        } catch (jobErr: any) {
          this.logger.error(`Unexpected dispatch error for job ${jobId}: ${jobErr.message}`, jobErr.stack);
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }
}
