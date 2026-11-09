import { NotificationWorkerService } from './notification-worker.service';
import { NotificationRetryService } from './notification-retry.service';
import { NotificationJobStatus } from '@matabai/shared';

describe('NotificationWorkerService & RetryService', () => {
  describe('NotificationWorkerService', () => {
    let worker: NotificationWorkerService;
    let mockPrisma: any;
    let mockDispatcher: any;

    beforeEach(() => {
      mockPrisma = {
        notificationJob: {
          findMany: jest.fn(),
          updateMany: jest.fn(),
        },
      };

      mockDispatcher = {
        dispatchJob: jest.fn().mockResolvedValue(true),
      };

      worker = new NotificationWorkerService(mockPrisma, mockDispatcher);
    });

    it('should claim due jobs atomically and dispatch each job', async () => {
      mockPrisma.notificationJob.findMany.mockResolvedValue([
        { id: 'job-1' },
        { id: 'job-2' },
      ]);
      mockPrisma.notificationJob.updateMany.mockResolvedValue({ count: 2 });

      const count = await worker.processDueJobs();

      expect(count).toBe(2);
      expect(mockPrisma.notificationJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['job-1', 'job-2'] },
          }),
          data: expect.objectContaining({
            status: NotificationJobStatus.PROCESSING,
            claimedBy: expect.stringContaining('worker-'),
          }),
        }),
      );
      expect(mockDispatcher.dispatchJob).toHaveBeenCalledWith('job-1');
      expect(mockDispatcher.dispatchJob).toHaveBeenCalledWith('job-2');
    });

    it('should return 0 when no jobs are due', async () => {
      mockPrisma.notificationJob.findMany.mockResolvedValue([]);

      const count = await worker.processDueJobs();

      expect(count).toBe(0);
      expect(mockPrisma.notificationJob.updateMany).not.toHaveBeenCalled();
      expect(mockDispatcher.dispatchJob).not.toHaveBeenCalled();
    });
  });

  describe('NotificationRetryService', () => {
    let retryService: NotificationRetryService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        notificationJob: {
          update: jest.fn().mockResolvedValue({ id: 'job-1' }),
        },
        notificationEvent: {
          create: jest.fn().mockResolvedValue({ id: 'event-1' }),
        },
      };

      retryService = new NotificationRetryService(mockPrisma);
    });

    it('should schedule retry with exponential backoff when attempts < maxAttempts', async () => {
      const result = await retryService.handleFailure({
        jobId: 'job-1',
        attempts: 0,
        maxAttempts: 3,
        error: 'Network timeout',
        isPermanent: false,
      });

      expect(result.status).toBe(NotificationJobStatus.RETRYING);
      expect(result.nextScheduledAt).toBeDefined();
      expect(mockPrisma.notificationJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-1' },
          data: expect.objectContaining({
            status: NotificationJobStatus.RETRYING,
            attempts: 1,
            lastError: 'Network timeout',
          }),
        }),
      );
      expect(mockPrisma.notificationEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'RETRY_SCHEDULED',
          }),
        }),
      );
    });

    it('should transition to DEAD_LETTER when attempts reach maxAttempts', async () => {
      const result = await retryService.handleFailure({
        jobId: 'job-1',
        attempts: 2,
        maxAttempts: 3,
        error: 'Repeated 500 error from Meta',
        isPermanent: false,
      });

      expect(result.status).toBe(NotificationJobStatus.DEAD_LETTER);
      expect(mockPrisma.notificationJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-1' },
          data: expect.objectContaining({
            status: NotificationJobStatus.DEAD_LETTER,
            attempts: 3,
          }),
        }),
      );
      expect(mockPrisma.notificationEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'DEAD_LETTERED',
          }),
        }),
      );
    });

    it('should transition to DEAD_LETTER immediately on permanent failure', async () => {
      const result = await retryService.handleFailure({
        jobId: 'job-1',
        attempts: 0,
        maxAttempts: 3,
        error: 'Invalid recipient phone number',
        isPermanent: true,
      });

      expect(result.status).toBe(NotificationJobStatus.DEAD_LETTER);
    });
  });
});
