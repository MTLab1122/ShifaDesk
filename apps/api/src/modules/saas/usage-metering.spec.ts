import { Test, TestingModule } from '@nestjs/testing';
import { UsageMeteringService } from './services/usage-metering.service';
import { EntitlementService } from './services/entitlement.service';
import { PrismaService } from '../../common/database/prisma.service';
import { FeatureCode } from '@matabai/shared';

describe('UsageMeteringService', () => {
  let service: UsageMeteringService;
  let mockPrisma: any;
  let mockEntitlementService: any;

  beforeEach(async () => {
    mockPrisma = {
      usageEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      usagePeriodSummary: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      doctor: {
        count: jest.fn().mockResolvedValue(2),
      },
      organizationMembership: {
        count: jest.fn().mockResolvedValue(5),
      },
      clinic: {
        count: jest.fn().mockResolvedValue(1),
      },
      scheduledReport: {
        count: jest.fn().mockResolvedValue(3),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockEntitlementService = {
      getActiveSubscription: jest.fn().mockResolvedValue({
        id: 'sub-1',
        currentPeriodStart: new Date('2026-11-01'),
        currentPeriodEnd: new Date('2026-12-01'),
        planVersion: {
          features: [FeatureCode.DOCTORS_COUNT, FeatureCode.MONTHLY_WHATSAPP_MESSAGES],
          limits: {
            [FeatureCode.DOCTORS_COUNT]: 5,
            [FeatureCode.MONTHLY_WHATSAPP_MESSAGES]: 1000,
          },
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageMeteringService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EntitlementService, useValue: mockEntitlementService },
      ],
    }).compile();

    service = module.get<UsageMeteringService>(UsageMeteringService);
  });

  it('should record usage event and update period summary', async () => {
    mockPrisma.usageEvent.findUnique.mockResolvedValue(null);
    mockPrisma.usageEvent.create.mockResolvedValue({ id: 'event-1', quantity: 1 });
    mockPrisma.usagePeriodSummary.findUnique.mockResolvedValue({
      id: 'sum-1',
      totalUsage: 50,
    });

    const result = await service.recordUsage({
      organizationId: 'org-1',
      featureCode: FeatureCode.MONTHLY_WHATSAPP_MESSAGES,
      quantity: 1,
      source: 'WHATSAPP',
      idempotencyKey: 'msg-wa-uuid-1',
    });

    expect(result.id).toBe('event-1');
    expect(mockPrisma.usagePeriodSummary.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalUsage: 51 }),
      }),
    );
  });

  it('should suppress duplicate usage event with identical idempotencyKey', async () => {
    mockPrisma.usageEvent.findUnique.mockResolvedValue({
      id: 'existing-event-id',
      idempotencyKey: 'msg-wa-uuid-1',
    });

    const result = await service.recordUsage({
      organizationId: 'org-1',
      featureCode: FeatureCode.MONTHLY_WHATSAPP_MESSAGES,
      quantity: 1,
      source: 'WHATSAPP',
      idempotencyKey: 'msg-wa-uuid-1',
    });

    expect(result.id).toBe('existing-event-id');
    expect(mockPrisma.usageEvent.create).not.toHaveBeenCalled();
  });

  it('should generate comprehensive tenant usage summary for dashboard', async () => {
    mockPrisma.usagePeriodSummary.findUnique.mockResolvedValue({
      totalUsage: 850, // 850 / 1000 = 85% -> WARNING status
    });

    const summary = await service.getTenantUsageSummary('org-1');
    expect(summary.items).toBeDefined();

    const waItem = summary.items.find((i) => i.featureCode === FeatureCode.MONTHLY_WHATSAPP_MESSAGES);
    expect(waItem).toBeDefined();
    expect(waItem?.currentUsage).toBe(850);
    expect(waItem?.limitValue).toBe(1000);
    expect(waItem?.percentageUsed).toBe(85);
    expect(waItem?.status).toBe('WARNING');
  });
});
