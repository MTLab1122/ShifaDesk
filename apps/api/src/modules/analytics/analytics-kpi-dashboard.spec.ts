import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './services/dashboard.service';
import { PrismaService } from '../../common/database/prisma.service';
import { AnalyticsTimeHelper } from './services/analytics-time.helper';

describe('DashboardService & AnalyticsTimeHelper', () => {
  let service: DashboardService;
  let mockPrisma: any;

  const mockOrgId = 'org-test-123';
  const mockClinicId = 'clinic-test-456';

  beforeEach(async () => {
    mockPrisma = {
      appointment: {
        findMany: jest.fn().mockResolvedValue([
          { status: 'COMPLETED' },
          { status: 'COMPLETED' },
          { status: 'CANCELLED' },
          { status: 'NO_SHOW' },
        ]),
      },
      patient: {
        count: jest.fn().mockResolvedValue(100),
      },
      clinicalEncounter: {
        findMany: jest.fn().mockResolvedValue([
          { status: 'COMPLETED', isFinalized: true },
          { status: 'IN_PROGRESS', isFinalized: false },
        ]),
      },
      doctor: {
        count: jest.fn().mockResolvedValue(5),
      },
      laboratoryOrder: {
        count: jest.fn().mockResolvedValue(40),
      },
      laboratoryReport: {
        findMany: jest.fn().mockResolvedValue([
          { reportStatus: 'RELEASED' },
          { reportStatus: 'PENDING_REVIEW' },
        ]),
      },
      invoice: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { totalMinor: 5000000, paidMinor: 4000000, outstandingMinor: 1000000 },
        }),
      },
      payment: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amountMinor: 4000000 },
        }),
      },
      refund: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amountMinor: 200000 },
        }),
      },
      expense: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amountMinor: 800000 },
        }),
      },
      whatsappMessage: {
        count: jest.fn().mockResolvedValue(150),
      },
      voiceCallSession: {
        count: jest.fn().mockResolvedValue(30),
      },
      aiInteractionLog: {
        findMany: jest.fn().mockResolvedValue([
          { outcome: 'TOOL_EXECUTED' },
          { outcome: 'HANDOVER' },
        ]),
      },
      analyticsAccessLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('AnalyticsTimeHelper', () => {
    it('should correctly resolve predefined date ranges and previous comparison windows', () => {
      const range7d = AnalyticsTimeHelper.resolveDateRange('7d');
      expect(range7d.durationDays).toBeGreaterThanOrEqual(7);
      expect(range7d.startDate.getTime()).toBeLessThan(range7d.endDate.getTime());
      expect(range7d.previousStartDate.getTime()).toBeLessThan(range7d.previousEndDate.getTime());
      expect(range7d.previousEndDate.getTime()).toBeLessThan(range7d.startDate.getTime());
    });

    it('should compute metrics delta with UP trend', () => {
      const metric = AnalyticsTimeHelper.calculateMetric(150, 100);
      expect(metric.value).toBe(150);
      expect(metric.previousValue).toBe(100);
      expect(metric.changePercentage).toBe(50);
      expect(metric.trend).toBe('UP');
    });

    it('should compute metrics delta with DOWN trend', () => {
      const metric = AnalyticsTimeHelper.calculateMetric(80, 100);
      expect(metric.value).toBe(80);
      expect(metric.changePercentage).toBe(-20);
      expect(metric.trend).toBe('DOWN');
    });

    it('should compute NEUTRAL when values match or previous is null', () => {
      const metricEqual = AnalyticsTimeHelper.calculateMetric(100, 100);
      expect(metricEqual.changePercentage).toBe(0);
      expect(metricEqual.trend).toBe('NEUTRAL');

      const metricNull = AnalyticsTimeHelper.calculateMetric(50, null);
      expect(metricNull.changePercentage).toBeNull();
      expect(metricNull.trend).toBe('NEUTRAL');
    });
  });

  describe('getExecutiveMetrics', () => {
    it('should return complete multi-domain executive KPI metrics with period comparison', async () => {
      const metrics = await service.getExecutiveMetrics(
        mockOrgId,
        mockClinicId,
        '30d',
        undefined,
        undefined,
        'user-1',
      );

      expect(metrics).toBeDefined();
      expect(metrics.period).toBeDefined();
      expect(metrics.period.timezone).toBe('Asia/Karachi');

      // Appointments
      expect(metrics.appointments.total.value).toBe(4);
      expect(metrics.appointments.completed.value).toBe(2);
      expect(metrics.appointments.cancelled.value).toBe(1);
      expect(metrics.appointments.noShow.value).toBe(1);
      expect(metrics.appointments.completionRate.value).toBe(50);

      // Financials (in paisa minor units)
      expect(metrics.finance.invoicedAmountPaisa.value).toBe(5000000);
      expect(metrics.finance.collectedPaymentsPaisa.value).toBe(4000000);
      expect(metrics.finance.refundsPaisa.value).toBe(200000);
      expect(metrics.finance.expensesPaisa.value).toBe(800000);
      // Net operating balance = 4,000,000 - 200,000 - 800,000 = 3,000,000
      expect(metrics.finance.netOperatingBalancePaisa.value).toBe(3000000);

      // Communications
      expect(metrics.communications.totalWhatsappMessages.value).toBe(150);
      expect(metrics.communications.totalVoiceCalls.value).toBe(30);
      expect(metrics.communications.aiInteractions.value).toBe(2);
      expect(metrics.communications.aiHandovers.value).toBe(1);

      // Verify access log recorded
      expect(mockPrisma.analyticsAccessLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrgId,
            clinicId: mockClinicId,
            dashboardView: 'EXECUTIVE',
            accessedById: 'user-1',
          }),
        }),
      );
    });
  });
});
