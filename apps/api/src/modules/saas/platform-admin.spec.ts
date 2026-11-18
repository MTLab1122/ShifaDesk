import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAdminService } from './services/platform-admin.service';
import { PrismaService } from '../../common/database/prisma.service';
import { SubscriptionStatus } from '@matabai/shared';

describe('PlatformAdminService', () => {
  let service: PlatformAdminService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      organization: {
        count: jest.fn().mockResolvedValue(25),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'org-1',
            name: 'Al-Shifa Polyclinic',
            slug: 'al-shifa',
            status: 'ACTIVE',
            createdAt: new Date('2026-11-01'),
            subscriptions: [{ status: SubscriptionStatus.ACTIVE, plan: { name: 'Professional' } }],
          },
        ]),
        findUnique: jest.fn(),
      },
      tenantSubscription: {
        count: jest.fn().mockImplementation(({ where }) => {
          if (where?.status === SubscriptionStatus.ACTIVE) return Promise.resolve(18);
          if (where?.status === SubscriptionStatus.TRIALING) return Promise.resolve(5);
          if (where?.status === SubscriptionStatus.SUSPENDED) return Promise.resolve(1);
          if (where?.status === SubscriptionStatus.CANCELLED) return Promise.resolve(1);
          return Promise.resolve(0);
        }),
        findMany: jest.fn().mockResolvedValue([
          { unitPricePaisa: 1499900, billingInterval: 'MONTHLY', plan: { code: 'PROFESSIONAL' } },
          { unitPricePaisa: 699900, billingInterval: 'MONTHLY', plan: { code: 'STARTER' } },
        ]),
        update: jest.fn(),
      },
      subscriptionInvoice: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { outstandingPaisa: 4500000 },
        }),
      },
      subscriptionPlan: {
        findMany: jest.fn().mockResolvedValue([
          { code: 'STARTER', name: 'Starter' },
          { code: 'PROFESSIONAL', name: 'Professional' },
        ]),
      },
      tenantEntitlementOverride: {
        upsert: jest.fn().mockResolvedValue({ id: 'override-1' }),
      },
      promotionalCredit: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'promo-1', ...data })),
      },
      platformAdminAuditLog: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      subscriptionStatusHistory: {
        create: jest.fn(),
      },
      trialRecord: {
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PlatformAdminService>(PlatformAdminService);
  });

  it('should compute authoritative platform overview metrics (MRR, ARR, active subscriptions)', async () => {
    const overview = await service.getPlatformOverview();

    expect(overview.totalTenants).toBe(25);
    expect(overview.activeSubscriptions).toBe(18);
    expect(overview.trialingSubscriptions).toBe(5);
    expect(overview.mrrPaisa).toBe(2199800); // 14,999 + 6,999 = PKR 21,998 (2199800 paisa)
    expect(overview.arrPaisa).toBe(2199800 * 12);
    expect(overview.outstandingInvoicesPaisa).toBe(4500000);
    expect(overview.planDistribution).toHaveLength(2);
    expect(overview.recentSignups).toHaveLength(1);
  });

  it('should execute tenant suspension with audit log reason', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-target-1',
      subscriptions: [{ id: 'sub-1', status: SubscriptionStatus.ACTIVE }],
    });

    const result = await service.handleTenantAction(
      'org-target-1',
      'SUSPEND',
      'Non-payment beyond extended grace period',
      0,
      { id: 'admin-1' } as any,
    );

    expect(result.success).toBe(true);
    expect(mockPrisma.tenantSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: { status: SubscriptionStatus.SUSPENDED },
      }),
    );
    expect(mockPrisma.platformAdminAuditLog.create).toHaveBeenCalled();
  });

  it('should grant promotional credits in integer paisa', async () => {
    const credit = await service.grantPromotionalCredit(
      'org-target-1',
      {
        amountPaisa: 500000, // PKR 5,000 credit
        reason: 'Early adopter pilot partner grant',
      },
      { id: 'admin-1' } as any,
    );

    expect(credit.amountPaisa).toBe(500000);
    expect(credit.code).toMatch(/^PROMO-[A-F0-9]+$/);
    expect(mockPrisma.platformAdminAuditLog.create).toHaveBeenCalled();
  });
});
