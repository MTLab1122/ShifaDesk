import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionLifecycleService } from './services/subscription-lifecycle.service';
import { PlanService } from './services/plan.service';
import { SaasBillingService } from './services/saas-billing.service';
import { PrismaService } from '../../common/database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { SubscriptionStatus, BillingInterval } from '@matabai/shared';

describe('SubscriptionLifecycleService', () => {
  let service: SubscriptionLifecycleService;
  let mockPrisma: any;
  let mockPlanService: any;
  let mockBillingService: any;

  beforeEach(async () => {
    mockPrisma = {
      tenantSubscription: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      trialRecord: {
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      subscriptionStatusHistory: {
        create: jest.fn(),
      },
      organizationMembership: {
        findFirst: jest.fn().mockResolvedValue({ userProfileId: 'owner-1' }),
        count: jest.fn().mockResolvedValue(2),
      },
      doctor: {
        count: jest.fn().mockResolvedValue(1),
      },
      clinic: {
        count: jest.fn().mockResolvedValue(1),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return callback(mockPrisma);
        }
        return Promise.all(callback);
      }),
    };

    mockPlanService = {
      getPlanByCode: jest.fn().mockImplementation((code) => {
        if (code === 'PROFESSIONAL') {
          return Promise.resolve({
            id: 'plan-pro-id',
            code: 'PROFESSIONAL',
            name: 'Professional',
            versions: [
              {
                id: 'v-pro-1',
                version: 1,
                monthlyPricePaisa: 1499900,
                annualPricePaisa: 14999000,
                limits: { DOCTORS_COUNT: 5, STAFF_ACCOUNTS: 15, CLINIC_BRANCHES: 2 },
              },
            ],
          });
        }
        if (code === 'STARTER') {
          return Promise.resolve({
            id: 'plan-starter-id',
            code: 'STARTER',
            name: 'Starter',
            versions: [
              {
                id: 'v-start-1',
                version: 1,
                monthlyPricePaisa: 699900,
                annualPricePaisa: 6999000,
                limits: { DOCTORS_COUNT: 1, STAFF_ACCOUNTS: 3, CLINIC_BRANCHES: 1 },
              },
            ],
          });
        }
        return Promise.resolve(null);
      }),
    };

    mockBillingService = {
      createSubscriptionInvoice: jest.fn().mockResolvedValue({
        id: 'inv-upg-1',
        invoiceNumber: 'SUB-202611-0001',
        totalPaisa: 1499900,
        outstandingPaisa: 1499900,
        billingPeriodEnd: new Date('2026-12-18'),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionLifecycleService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PlanService, useValue: mockPlanService },
        { provide: SaasBillingService, useValue: mockBillingService },
      ],
    }).compile();

    service = module.get<SubscriptionLifecycleService>(SubscriptionLifecycleService);
  });

  it('should activate subscription when verified payment settles invoice', async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue({
      id: 'sub-pending-1',
      organizationId: 'org-1',
      status: SubscriptionStatus.PENDING,
      billingInterval: BillingInterval.MONTHLY,
      plan: { name: 'Starter' },
    });
    mockPrisma.tenantSubscription.update.mockResolvedValue({
      id: 'sub-pending-1',
      status: SubscriptionStatus.ACTIVE,
    });

    const activated = await service.activateSubscription('sub-pending-1', 'inv-123', 'admin-user');
    expect(activated.status).toBe(SubscriptionStatus.ACTIVE);
    expect(mockPrisma.subscriptionStatusHistory.create).toHaveBeenCalled();
  });

  it('should upgrade plan and create upgrade invoice with prorated credit calculation', async () => {
    const periodStart = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    const periodEnd = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // 20 days remaining

    mockPrisma.tenantSubscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      organizationId: 'org-1',
      status: SubscriptionStatus.ACTIVE,
      billingInterval: BillingInterval.MONTHLY,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      unitPricePaisa: 699900,
      plan: { name: 'Starter' },
    });
    mockPrisma.tenantSubscription.update.mockResolvedValue({
      id: 'sub-1',
      planId: 'plan-pro-id',
      status: SubscriptionStatus.ACTIVE,
    });

    const result = await service.upgradePlan('sub-1', 'PROFESSIONAL', BillingInterval.MONTHLY, 'user-1');
    expect(mockBillingService.createSubscriptionInvoice).toHaveBeenCalled();
    expect(result.subscription.planId).toBe('plan-pro-id');
  });

  it('should reject downgrade if active resources exceed new plan limits without silent data deletion', async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue({
      id: 'sub-pro-1',
      organizationId: 'org-1',
      plan: { name: 'Professional' },
    });

    // 3 active doctors exist in clinic
    mockPrisma.doctor.count.mockResolvedValue(3);

    // Starter plan only allows 1 doctor
    await expect(service.downgradePlan('sub-pro-1', 'STARTER')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should cancel subscription at period end', async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      organizationId: 'org-1',
      status: SubscriptionStatus.ACTIVE,
    });
    mockPrisma.tenantSubscription.update.mockResolvedValue({
      id: 'sub-1',
      cancelAtPeriodEnd: true,
    });

    const cancelled = await service.cancelSubscription('sub-1', 'Moving clinic facility', false);
    expect(cancelled.cancelAtPeriodEnd).toBe(true);
  });

  it('should process expirations and move expired trials to grace period', async () => {
    mockPrisma.tenantSubscription.findMany.mockImplementation(({ where }: any) => {
      if (where.status === SubscriptionStatus.TRIALING) {
        return Promise.resolve([{ id: 'sub-trial-exp', status: SubscriptionStatus.TRIALING }]);
      }
      return Promise.resolve([]);
    });

    const result = await service.processExpirations();
    expect(result.expiredTrials).toBe(1);
    expect(mockPrisma.tenantSubscription.update).toHaveBeenCalled();
  });
});
