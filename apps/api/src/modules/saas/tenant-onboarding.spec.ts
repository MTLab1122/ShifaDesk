import { Test, TestingModule } from '@nestjs/testing';
import { TenantOnboardingService } from './services/tenant-onboarding.service';
import { PlanService } from './services/plan.service';
import { SubscriptionLifecycleService } from './services/subscription-lifecycle.service';
import { PrismaService } from '../../common/database/prisma.service';
import { ConflictException } from '@nestjs/common';
import { ClinicType, BillingInterval } from '@matabai/shared';

describe('TenantOnboardingService', () => {
  let service: TenantOnboardingService;
  let mockPrisma: any;
  let mockPlanService: any;
  let mockLifecycleService: any;

  beforeEach(async () => {
    mockPrisma = {
      userProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      organization: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      clinic: {
        create: jest.fn(),
      },
      organizationMembership: {
        create: jest.fn(),
      },
      clinicMembership: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      platformAdminAuditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockPlanService = {
      getPlanByCode: jest.fn().mockResolvedValue({
        id: 'plan-starter-id',
        code: 'STARTER',
        name: 'Starter',
        versions: [{ id: 'version-1', version: 1 }],
      }),
    };

    mockLifecycleService = {
      startTrial: jest.fn().mockResolvedValue({
        id: 'sub-trial-123',
        status: 'TRIALING',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantOnboardingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PlanService, useValue: mockPlanService },
        { provide: SubscriptionLifecycleService, useValue: mockLifecycleService },
      ],
    }).compile();

    service = module.get<TenantOnboardingService>(TenantOnboardingService);
  });

  it('should successfully register clinic, owner, tenant, and start trial', async () => {
    mockPrisma.userProfile.findUnique.mockResolvedValue(null);
    mockPrisma.userProfile.create.mockResolvedValue({
      id: 'user-owner-1',
      email: 'dr.ali@shifa.pk',
      fullName: 'Dr. Ali Khan',
    });
    mockPrisma.organization.create.mockResolvedValue({
      id: 'org-shifa-1',
      name: 'Shifa Clinic',
      slug: 'shifa-clinic-123',
    });
    mockPrisma.clinic.create.mockResolvedValue({
      id: 'clinic-shifa-1',
      name: 'Shifa Clinic',
      slug: 'main',
    });

    const result = await service.registerClinic({
      clinicName: 'Shifa Clinic',
      clinicType: ClinicType.SINGLE_DOCTOR,
      ownerFullName: 'Dr. Ali Khan',
      ownerEmail: 'dr.ali@shifa.pk',
      ownerPhone: '+923001234567',
      country: 'Pakistan',
      city: 'Islamabad',
      address: 'F-8 Markaz',
      preferredLanguage: 'en',
      timezone: 'Asia/Karachi',
      password: 'StrongPassword123!',
      planCode: 'STARTER',
      billingInterval: BillingInterval.MONTHLY,
      startTrial: true,
      termsAccepted: true,
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.organizationId).toBe('org-shifa-1');
    expect(result.subscriptionId).toBe('sub-trial-123');
    expect(mockLifecycleService.startTrial).toHaveBeenCalledWith('org-shifa-1', 'user-owner-1', 'STARTER', 14);
  });

  it('should prevent duplicate registration if email already has organization memberships', async () => {
    mockPrisma.userProfile.findUnique.mockResolvedValue({
      id: 'existing-user-id',
      email: 'dr.ali@shifa.pk',
      organizationMemberships: [{ id: 'membership-1' }],
    });

    await expect(
      service.registerClinic({
        clinicName: 'Another Clinic',
        clinicType: ClinicType.POLYCLINIC,
        ownerFullName: 'Dr. Ali Khan',
        ownerEmail: 'dr.ali@shifa.pk',
        ownerPhone: '+923001234567',
        country: 'Pakistan',
        city: 'Lahore',
        address: 'Gulberg III',
        preferredLanguage: 'en',
        timezone: 'Asia/Karachi',
        password: 'Password123!',
        termsAccepted: true,
        planCode: 'STARTER',
        billingInterval: BillingInterval.MONTHLY,
        startTrial: true,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should return accurate onboarding checklist status', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-test',
      clinics: [{ id: 'clinic-1' }],
      subscriptions: [{ id: 'sub-1' }],
      doctorWorkingHours: [{ id: 'dwh-1' }],
      memberships: [{ id: 'm-1' }, { id: 'm-2' }],
    });

    const status = await service.getOnboardingStatus('org-test');
    expect(status.accountRegistered).toBe(true);
    expect(status.clinicProfileCompleted).toBe(true);
    expect(status.planSelected).toBe(true);
    expect(status.operatingHoursConfigured).toBe(true);
    expect(status.staffInvited).toBe(true);
    expect(status.completed).toBe(true);
  });
});
