import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationJobStatus } from '@matabai/shared';

@Injectable()
export class NotificationRetryService {
  private readonly logger = new Logger(NotificationRetryService.name);

  // Configuration constants
  private readonly baseDelayMs = 30 * 1000; // 30 seconds
  private readonly maxBackoffMs = 60 * 60 * 1000; // 1 hour
  private readonly jitterMs = 5 * 1000; // 5 seconds jitter

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate bounded exponential backoff with random jitter
   */
  calculateBackoff(attempt: number): number {
    const exponential = this.baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
    const jitter = Math.floor(Math.random() * this.jitterMs);
    return Math.min(this.maxBackoffMs, exponential + jitter);
  }

  /**
   * Handle failure for a notification job: either schedule next retry or mark as DEAD_LETTER
   */
  async handleFailure(params: {
    jobId: string;
    attempts: number;
    maxAttempts: number;
    error: string;
    isPermanent: boolean;
  }): Promise<{ status: string; nextScheduledAt?: Date }> {
    const { jobId, attempts, maxAttempts, error, isPermanent } = params;

    const currentAttempts = attempts + 1;

    // Permanent failure or max attempts exhausted -> transition to DEAD_LETTER
    if (isPermanent || currentAttempts >= maxAttempts) {
      this.logger.warn(`Job ${jobId} failed permanently or exhausted attempts (${currentAttempts}/${maxAttempts}). Moving to DEAD_LETTER.`);

      await this.prisma.notificationJob.update({
        where: { id: jobId },
        data: {
          status: NotificationJobStatus.DEAD_LETTER,
          attempts: currentAttempts,
          lastError: error,
          claimedAt: null,
          claimedBy: null,
        },
      });

      await this.prisma.notificationEvent.create({
        data: {
          notificationJobId: jobId,
          eventType: 'DEAD_LETTERED',
          eventPayload: { error, attempts: currentAttempts, maxAttempts },
        },
      });

      return { status: NotificationJobStatus.DEAD_LETTER };
    }

    // Temporary failure -> schedule retry with backoff
    const delay = this.calculateBackoff(currentAttempts);
    const nextScheduledAt = new Date(Date.now() + delay);

    this.logger.log(`Job ${jobId} scheduled for retry #${currentAttempts} at ${nextScheduledAt.toISOString()} (delay: ${delay}ms)`);

    await this.prisma.notificationJob.update({
      where: { id: jobId },
      data: {
        status: NotificationJobStatus.RETRYING,
        attempts: currentAttempts,
        scheduledAt: nextScheduledAt,
        lastError: error,
        claimedAt: null,
        claimedBy: null,
      },
    });

    await this.prisma.notificationEvent.create({
      data: {
        notificationJobId: jobId,
        eventType: 'RETRY_SCHEDULED',
        eventPayload: {
          error,
          attempt: currentAttempts,
          maxAttempts,
          nextScheduledAt: nextScheduledAt.toISOString(),
          delayMs: delay,
        },
      },
    });

    return {
      status: NotificationJobStatus.RETRYING,
      nextScheduledAt,
    };
  }
}
