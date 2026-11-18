import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentAnalyticsService } from './services/appointment-analytics.service';
import { QueueAnalyticsService } from './services/queue-analytics.service';
import { PrismaService } from '../../common/database/prisma.service';

describe('Appointment & Queue Analytics', () => {
  let apptService: AppointmentAnalyticsService;
  let queueService: QueueAnalyticsService;
  let mockPrisma: any;

  const mockOrgId = 'org-123';
  const mockClinicId = 'clinic-1';

  beforeEach(async () => {
    mockPrisma = {
      appointment: {
        findMany: jest.fn(),
      },
      queueToken: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentAnalyticsService,
        QueueAnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    apptService = module.get<AppointmentAnalyticsService>(AppointmentAnalyticsService);
    queueService = module.get<QueueAnalyticsService>(QueueAnalyticsService);
  });

  describe('AppointmentAnalyticsService', () => {
    it('should aggregate appointment metrics, lead times, and peak hours', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // booked 24h earlier

      mockPrisma.appointment.findMany.mockResolvedValue([
        {
          id: 'apt-1',
          appointmentNumber: 'APT-001',
          appointmentDate: '2026-11-18',
          startTime: '10:00',
          status: 'COMPLETED',
          bookingSource: 'RECEPTIONIST',
          rescheduledFromId: null,
          createdAt,
          doctor: { id: 'doc-1', fullName: 'Dr. Sarah Khan', specialty: 'Cardiology' },
          clinic: { id: 'cl-1', name: 'Main Clinic' },
        },
        {
          id: 'apt-2',
          appointmentNumber: 'APT-002',
          appointmentDate: '2026-11-18',
          startTime: '11:00',
          status: 'CANCELLED',
          bookingSource: 'WALK_IN',
          rescheduledFromId: 'apt-prior',
          createdAt,
          doctor: { id: 'doc-1', fullName: 'Dr. Sarah Khan', specialty: 'Cardiology' },
          clinic: { id: 'cl-1', name: 'Main Clinic' },
        },
        {
          id: 'apt-3',
          appointmentNumber: 'APT-003',
          appointmentDate: '2026-11-18',
          startTime: '12:00',
          status: 'NO_SHOW',
          bookingSource: 'RECEPTIONIST',
          rescheduledFromId: null,
          createdAt,
          doctor: { id: 'doc-2', fullName: 'Dr. Tariq Mahmood', specialty: 'General Practice' },
          clinic: { id: 'cl-1', name: 'Main Clinic' },
        },
      ]);

      const result = await apptService.getAppointmentAnalytics(mockOrgId, mockClinicId);

      expect(result.totalAppointments).toBe(3);
      expect(result.completedAppointments).toBe(1);
      expect(result.cancelledAppointments).toBe(1);
      expect(result.noShowAppointments).toBe(1);
      expect(result.completionRate).toBe(33.3);
      expect(result.cancellationRate).toBe(33.3);
      expect(result.noShowRate).toBe(33.3);
      expect(result.reschedulingCount).toBe(1);
      expect(result.walkInCount).toBe(1);
      expect(result.scheduledCount).toBe(2);

      // Verify demand by doctor and specialty
      expect(result.demandBySpecialty).toEqual(
        expect.arrayContaining([
          { specialty: 'Cardiology', count: 2 },
          { specialty: 'General Practice', count: 1 },
        ]),
      );
      expect(result.demandByDoctor).toEqual(
        expect.arrayContaining([
          { doctorId: 'doc-1', doctorName: 'Dr. Sarah Khan', count: 2 },
          { doctorId: 'doc-2', doctorName: 'Dr. Tariq Mahmood', count: 1 },
        ]),
      );
      expect(result.peakBookingHours).toHaveLength(24);
    });
  });

  describe('QueueAnalyticsService', () => {
    it('should compute exact average and median wait times with sample size reporting', async () => {
      const baseTime = new Date('2026-11-18T09:00:00Z');

      // Token 1: wait 10 mins, service 15 mins
      const t1 = {
        id: 'tok-1',
        status: 'COMPLETED',
        checkedInAt: baseTime,
        calledAt: new Date(baseTime.getTime() + 10 * 60 * 1000),
        serviceStartedAt: new Date(baseTime.getTime() + 10 * 60 * 1000),
        completedAt: new Date(baseTime.getTime() + 25 * 60 * 1000),
        clinic: { id: 'cl-1', name: 'Central OPD' },
        queueSession: { doctor: { id: 'doc-1', fullName: 'Dr. Sarah Khan' } },
      };

      // Token 2: wait 20 mins, service 10 mins
      const t2 = {
        id: 'tok-2',
        status: 'COMPLETED',
        checkedInAt: baseTime,
        calledAt: new Date(baseTime.getTime() + 20 * 60 * 1000),
        serviceStartedAt: new Date(baseTime.getTime() + 20 * 60 * 1000),
        completedAt: new Date(baseTime.getTime() + 30 * 60 * 1000),
        clinic: { id: 'cl-1', name: 'Central OPD' },
        queueSession: { doctor: { id: 'doc-1', fullName: 'Dr. Sarah Khan' } },
      };

      // Token 3: wait 30 mins, service 20 mins
      const t3 = {
        id: 'tok-3',
        status: 'COMPLETED',
        checkedInAt: baseTime,
        calledAt: new Date(baseTime.getTime() + 30 * 60 * 1000),
        serviceStartedAt: new Date(baseTime.getTime() + 30 * 60 * 1000),
        completedAt: new Date(baseTime.getTime() + 50 * 60 * 1000),
        clinic: { id: 'cl-1', name: 'Central OPD' },
        queueSession: { doctor: { id: 'doc-1', fullName: 'Dr. Sarah Khan' } },
      };

      // Token 4: skipped token
      const t4 = {
        id: 'tok-4',
        status: 'SKIPPED',
        checkedInAt: baseTime,
        calledAt: null,
        serviceStartedAt: null,
        completedAt: null,
        clinic: { id: 'cl-1', name: 'Central OPD' },
        queueSession: { doctor: { id: 'doc-1', fullName: 'Dr. Sarah Khan' } },
      };

      mockPrisma.queueToken.findMany.mockResolvedValue([t1, t2, t3, t4]);

      const queueResult = await queueService.getQueueAnalytics(mockOrgId, mockClinicId);

      expect(queueResult.tokensIssued).toBe(4);
      expect(queueResult.tokensCompleted).toBe(3);
      expect(queueResult.tokensSkipped).toBe(1);

      // Wait times: [10, 20, 30] -> avg = 20, median = 20, sampleSize = 3
      expect(queueResult.sampleSizeWaitTime).toBe(3);
      expect(queueResult.avgWaitTimeMinutes).toBe(20);
      expect(queueResult.medianWaitTimeMinutes).toBe(20);

      // Service durations: [15, 10, 20] -> avg = 45 / 3 = 15, sampleSize = 3
      expect(queueResult.sampleSizeServiceDuration).toBe(3);
      expect(queueResult.avgServiceDurationMinutes).toBe(15);

      // Doctor performance
      expect(queueResult.doctorQueuePerformance).toEqual([
        {
          doctorId: 'doc-1',
          doctorName: 'Dr. Sarah Khan',
          tokensServed: 3,
          avgServiceMinutes: 15,
        },
      ]);
    });
  });
});
