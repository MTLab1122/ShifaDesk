import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TenantService } from '../tenant/tenant.service';
import { ClinicService } from '../clinic/clinic.service';
import { RolesGuard } from '../../common/auth/roles.guard';
import { TenantGuard } from '../../common/auth/tenant.guard';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { UserRole } from '@matabai/shared';
import { Reflector } from '@nestjs/core';

describe('Phase 2: Auth, RBAC & Tenant Isolation Unit Tests', () => {
  let authService: AuthService;
  let tenantService: TenantService;
  let clinicService: ClinicService;
  let rolesGuard: RolesGuard;
  let tenantGuard: TenantGuard;

  const mockOrgA = {
    id: 'org-a-uuid',
    name: 'Al-Shifa Healthcare',
    slug: 'al-shifa',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    clinics: [],
  };

  const mockOrgB = {
    id: 'org-b-uuid',
    name: 'Capital Polyclinic',
    slug: 'capital-poly',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    clinics: [],
  };

  const mockClinicA = {
    id: 'clinic-a-uuid',
    organizationId: 'org-a-uuid',
    name: 'Al-Shifa Main Branch',
    slug: 'main-branch',
    timezone: 'Asia/Karachi',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserAdmin = {
    id: 'user-admin-uuid',
    authUserId: 'auth-admin',
    email: 'admin@alshifa.com',
    fullName: 'Dr. Talha Admin',
    role: UserRole.CLINIC_ADMIN,
    organizationId: 'org-a-uuid',
    permissions: [],
  };

  const mockUserOrgB = {
    id: 'user-org-b-uuid',
    authUserId: 'auth-b',
    email: 'doctor@capital.com',
    fullName: 'Dr. Capital',
    role: UserRole.CLINIC_ADMIN,
    organizationId: 'org-b-uuid',
    permissions: [],
  };

  const mockPrisma = {
    userProfile: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockUserAdmin.id) {
          return {
            ...mockUserAdmin,
            createdAt: new Date(),
            updatedAt: new Date(),
            organizationMemberships: [
              {
                id: 'om-1',
                organizationId: 'org-a-uuid',
                role: 'CLINIC_ADMIN',
                status: 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date(),
                organization: mockOrgA,
              },
            ],
            clinicMemberships: [],
          };
        }
        return null;
      }),
    },
    organization: {
      findMany: jest.fn().mockResolvedValue([mockOrgA]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'org-a-uuid') return mockOrgA;
        if (where.id === 'org-b-uuid') return mockOrgB;
        return null;
      }),
      create: jest.fn().mockResolvedValue(mockOrgA),
    },
    clinic: {
      findMany: jest.fn().mockResolvedValue([mockClinicA]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'clinic-a-uuid') return mockClinicA;
        return null;
      }),
    },
    organizationMembership: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where.organizationId === 'org-a-uuid' && where.userProfileId === mockUserAdmin.id) {
          return { id: 'om-1', organizationId: 'org-a-uuid', userProfileId: mockUserAdmin.id, role: 'CLINIC_ADMIN', status: 'ACTIVE' };
        }
        return null;
      }),
    },
    $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
  };

  const mockAudit = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        TenantService,
        ClinicService,
        RolesGuard,
        TenantGuard,
        Reflector,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    tenantService = module.get<TenantService>(TenantService);
    clinicService = module.get<ClinicService>(ClinicService);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    tenantGuard = module.get<TenantGuard>(TenantGuard);
  });

  describe('1. Authentication Service', () => {
    it('returns session information on getMe for authenticated user', async () => {
      const res = await authService.getMe(mockUserAdmin);
      expect(res).toBeDefined();
      expect(res.user.email).toBe(mockUserAdmin.email);
      expect(res.activeRole).toBe(UserRole.CLINIC_ADMIN);
      expect(res.organizationMemberships).toHaveLength(1);
    });

    it('validates active session token', () => {
      const session = authService.validateSession(mockUserAdmin);
      expect(session.valid).toBe(true);
      expect(session.userId).toBe(mockUserAdmin.id);
    });

    it('handles user logout cleanly', async () => {
      const res = await authService.logout(mockUserAdmin);
      expect(res.success).toBe(true);
    });
  });

  describe('2. Role-Based Access Control (RBAC Guard)', () => {
    it('allows SUPER_ADMIN to access any restricted route', () => {
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.SUPER_ADMIN } }),
        }),
      } as any;

      jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([UserRole.CLINIC_ADMIN]);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('allows matching role (CLINIC_ADMIN) to access endpoint', () => {
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.CLINIC_ADMIN } }),
        }),
      } as any;

      jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN]);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('rejects unauthorized role with HTTP 403 Forbidden', () => {
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.DOCTOR } }),
        }),
      } as any;

      jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([UserRole.CLINIC_ADMIN]);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('3. Multi-Tenant Isolation', () => {
    it('allows user to access their own organization (Org A)', async () => {
      const org = await tenantService.findOne('org-a-uuid', mockUserAdmin);
      expect(org.id).toBe('org-a-uuid');
      expect(org.name).toBe('Al-Shifa Healthcare');
    });

    it('blocks user from Org A trying to access Org B with 403 Forbidden', async () => {
      await expect(tenantService.findOne('org-b-uuid', mockUserAdmin)).rejects.toThrow(ForbiddenException);
    });

    it('blocks user from Org B trying to list clinics in Org A', async () => {
      await expect(clinicService.findAll(mockUserOrgB, 'org-a-uuid')).rejects.toThrow(ForbiddenException);
    });

    it('enforces tenant guard when organization header is provided', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            params: {},
            body: {},
            headers: { 'x-organization-id': 'org-a-uuid' },
            user: mockUserAdmin,
          }),
        }),
      } as any;
      const can = await tenantGuard.canActivate(context);
      expect(can).toBe(true);
    });
  });
});
