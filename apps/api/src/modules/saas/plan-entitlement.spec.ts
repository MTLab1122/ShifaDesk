import { Test, TestingModule } from '@nestjs/testing';
import { PlanService } from './services/plan.service';
import { EntitlementService } from './services/entitlement.service';
import { PrismaService } from '../../common/database/prisma.service';
import { FeatureCode, SubscriptionStatus } from '@matabai/shared';

describe('PlanService & EntitlementService', () => {
  let planService: PlanService;
  let entitlementService: EntitlementService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      subscriptionPlan: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([
          { id: 'plan-1', code: 'STARTER', name: 'Starter', isActive: true, versions: [{ version: 1 }] },
          { id: 'plan-2', code: 'PROFESSIONAL', name: 'Professional', isActive: true, versions: [{ version: 1 }] },
        ]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.code === 'STARTER') {
            return Promise.resolve({
              id: 'plan-1',
              code: 'STARTER',
              name: 'Starter',
              versions: [
                {
                  id: 'v-1',
                  version: 1,
                  monthlyPricePaisa: 699900,
                  annualPricePaisa: 6999000,
                  features: [
                    FeatureCode.APPOINTMENT_MANAGEMENT,
                    FeatureCode.QUEUE_MANAGEMENT,
                    FeatureCode.CLINICAL_EMR,
                  ],
                  limits: { [FeatureCode.DOCTORS_COUNT]: 1, [FeatureCode.CLINIC_BRANCHES]: 1 },
                  entitlements: [
                    { featureCode: FeatureCode.APPOINTMENT_MANAGEMENT, isIncluded: true, limitType: 'UNLIMITED' },
                    { featureCode: FeatureCode.DOCTORS_COUNT, isIncluded: true, limitType: 'COUNT', limitValue: 1 },
                  ],
                },
              ],
            });
          }
          return Promise.resolve(null);
        }),
      },
      tenantSubscription: {
        findFirst: jest.fn(),
      },
      tenantEntitlementOverride: {
        findUnique: jest.fn(),
      },
      doctor: {
        count: jest.fn().mockResolvedValue(1),
      },
      clinic: {
        count: jest.fn().mockResolvedValue(1),
      },
      usagePeriodSummary: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      usageEvent: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 0 } }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanService,
        EntitlementService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    planService = module.get<PlanService>(PlanService);
    entitlementService = module.get<EntitlementService>(EntitlementService);
  });

  it('should list available subscription plans', async () => {
    const plans = await planService.listPlans();
    expect(plans).toHaveLength(2);
    expect(plans[0]?.code).toBe('STARTER');
  });

  it('should permit included features for active subscription', async () => {
    mockPrisma.tenantSubscription.findFirst.mockResolvedValue({
      id: 'sub-active-1',
      organizationId: 'org-1',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date('2026-11-01'),
      currentPeriodEnd: new Date('2026-12-01'),
      plan: { name: 'Starter' },
      planVersion: {
        features: [FeatureCode.APPOINTMENT_MANAGEMENT, FeatureCode.CLINICAL_EMR],
        limits: {},
        entitlements: [
          { featureCode: FeatureCode.APPOINTMENT_MANAGEMENT, isIncluded: true, limitType: 'UNLIMITED', limitValue: 0 },
        ],
      },
    });

    const check = await entitlementService.checkFeature('org-1', FeatureCode.APPOINTMENT_MANAGEMENT);
    expect(check.hasAccess).toBe(true);
    expect(check.isIncluded).toBe(true);
  });

  it('should enforce doctor count limit when resource count exceeds plan entitlement', async () => {
    mockPrisma.tenantSubscription.findFirst.mockResolvedValue({
      id: 'sub-active-1',
      organizationId: 'org-1',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date('2026-11-01'),
      currentPeriodEnd: new Date('2026-12-01'),
      plan: { name: 'Starter' },
      planVersion: {
        features: [FeatureCode.DOCTORS_COUNT],
        limits: { [FeatureCode.DOCTORS_COUNT]: 1 },
        entitlements: [
          { featureCode: FeatureCode.DOCTORS_COUNT, isIncluded: true, limitType: 'COUNT', limitValue: 1 },
        ],
      },
    });

    // 1 doctor already registered in organization
    mockPrisma.doctor.count.mockResolvedValue(1);

    // Requesting to add 1 more doctor (increment = 1) -> 1 + 1 = 2 > limit of 1
    const check = await entitlementService.checkFeature('org-1', FeatureCode.DOCTORS_COUNT, 1);
    expect(check.hasAccess).toBe(false);
    expect(check.isOverLimit).toBe(true);
    expect(check.remaining).toBe(0);
  });

  it('should prioritize platform admin entitlement override over plan configuration', async () => {
    mockPrisma.tenantSubscription.findFirst.mockResolvedValue({
      id: 'sub-active-1',
      organizationId: 'org-1',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date('2026-11-01'),
      currentPeriodEnd: new Date('2026-12-01'),
      plan: { name: 'Starter' },
      planVersion: {
        features: [], // Laboratory not in starter
        limits: {},
        entitlements: [],
      },
    });

    // Admin explicitly overrides and grants LABORATORY_MANAGEMENT with custom limit 5
    mockPrisma.tenantEntitlementOverride.findUnique.mockResolvedValue({
      organizationId: 'org-1',
      featureCode: FeatureCode.LABORATORY_MANAGEMENT,
      isIncluded: true,
      limitValue: 5,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const check = await entitlementService.checkFeature('org-1', FeatureCode.LABORATORY_MANAGEMENT);
    expect(check.hasAccess).toBe(true);
    expect(check.isIncluded).toBe(true);
    expect(check.limitValue).toBe(5);
  });

  it('should restrict write features when subscription is suspended', async () => {
    mockPrisma.tenantSubscription.findFirst.mockResolvedValue({
      id: 'sub-suspended-1',
      organizationId: 'org-1',
      status: SubscriptionStatus.SUSPENDED,
      currentPeriodStart: new Date('2026-10-01'),
      currentPeriodEnd: new Date('2026-11-01'),
      plan: { name: 'Starter' },
      planVersion: { features: [FeatureCode.APPOINTMENT_MANAGEMENT], entitlements: [] },
    });

    const check = await entitlementService.checkFeature('org-1', FeatureCode.APPOINTMENT_MANAGEMENT);
    expect(check.hasAccess).toBe(false);
    expect(check.subscriptionStatus).toBe(SubscriptionStatus.SUSPENDED);
    expect(check.reason).toContain('restricted');
  });
});
