import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ClinicService } from './clinic.service';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { UserRole } from '@matabai/shared';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';

describe('Phase 3: Clinic Management Unit Tests', () => {
  let clinicService: ClinicService;

  const mockAdminUser: AuthenticatedUser = {
    id: 'user-admin-1',
    authUserId: 'auth-admin-1',
    email: 'admin@alshifa.local',
    fullName: 'Admin User',
    role: UserRole.CLINIC_ADMIN,
    organizationId: 'org-1',
    permissions: [],
  };

  const mockDoctorUser: AuthenticatedUser = {
    id: 'user-doctor-1',
    authUserId: 'auth-doc-1',
    email: 'doctor@alshifa.local',
    fullName: 'Doctor User',
    role: UserRole.DOCTOR,
    organizationId: 'org-1',
    permissions: [],
  };

  const mockClinic = {
    id: 'clinic-1',
    organizationId: 'org-1',
    name: 'Al-Shifa Main Branch',
    slug: 'al-shifa-main',
    address: 'Sector G-9 Markaz, Islamabad',
    phone: '051-2289901',
    email: 'main@alshifa.local',
    timezone: 'Asia/Karachi',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    clinic: {
      findMany: jest.fn().mockResolvedValue([mockClinic]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'clinic-1') return Promise.resolve(mockClinic);
        if (where.organizationId_slug) {
          if (where.organizationId_slug.slug === 'al-shifa-main') return Promise.resolve(mockClinic);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'clinic-new', ...data })),
      update: jest.fn().mockImplementation(({ where: _where, data }) => Promise.resolve({ ...mockClinic, ...data })),
    },
    organizationMembership: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where.organizationId === 'org-1' && where.userProfileId === mockAdminUser.id) {
          return Promise.resolve({
            id: 'mem-1',
            organizationId: 'org-1',
            userProfileId: mockAdminUser.id,
            role: UserRole.CLINIC_ADMIN,
            status: 'ACTIVE',
          });
        }
        if (where.organizationId === 'org-1' && where.userProfileId === mockDoctorUser.id) {
          if (where.role && !where.role.in?.includes(UserRole.DOCTOR)) {
            return Promise.resolve(null);
          }
          return Promise.resolve({
            id: 'mem-2',
            organizationId: 'org-1',
            userProfileId: mockDoctorUser.id,
            role: UserRole.DOCTOR,
            status: 'ACTIVE',
          });
        }
        return Promise.resolve(null);
      }),
    },
  };

  const mockAudit = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    clinicService = module.get<ClinicService>(ClinicService);
    jest.clearAllMocks();
  });

  it('1. retrieves paginated clinics under authorized organization', async () => {
    const result = await clinicService.findAll(mockAdminUser, 'org-1', 1, 20);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe('Al-Shifa Main Branch');
    expect(result.meta.totalItems).toBe(1);
  });

  it('2. retrieves single clinic details by ID', async () => {
    const clinic = await clinicService.findOne('clinic-1', mockAdminUser);
    expect(clinic.id).toBe('clinic-1');
    expect(clinic.slug).toBe('al-shifa-main');
  });

  it('3. creates a new clinic successfully and logs audit', async () => {
    const newClinicDto = {
      organizationId: 'org-1',
      name: 'Al-Shifa Rawalpindi Branch',
      slug: 'al-shifa-rwp',
      address: 'Saddar, Rawalpindi',
      phone: '051-5566778',
      timezone: 'Asia/Karachi',
      status: 'ACTIVE' as const,
    };

    const created = await clinicService.create(newClinicDto, mockAdminUser);
    expect(created.name).toBe('Al-Shifa Rawalpindi Branch');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CLINIC_CREATE',
        organizationId: 'org-1',
      }),
    );
  });

  it('4. rejects duplicate clinic slug within the same organization', async () => {
    const duplicateDto = {
      organizationId: 'org-1',
      name: 'Duplicate Branch',
      slug: 'al-shifa-main',
      phone: '051-1122334',
      timezone: 'Asia/Karachi',
      status: 'ACTIVE' as const,
    };

    await expect(clinicService.create(duplicateDto, mockAdminUser)).rejects.toThrow(ConflictException);
  });

  it('5. updates clinic address and contact details', async () => {
    const updateDto = {
      address: 'New Plaza, Blue Area, Islamabad',
      phone: '051-9988776',
    };

    const updated = await clinicService.update('clinic-1', updateDto, mockAdminUser);
    expect(updated.address).toBe('New Plaza, Blue Area, Islamabad');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CLINIC_UPDATE',
      }),
    );
  });

  it('6. updates clinic active/inactive status', async () => {
    const updated = await clinicService.updateStatus('clinic-1', 'INACTIVE', mockAdminUser);
    expect(updated.status).toBe('INACTIVE');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CLINIC_STATUS_UPDATE',
        metadata: { previousStatus: 'ACTIVE', newStatus: 'INACTIVE' },
      }),
    );
  });

  it('7. blocks non-admin from modifying clinic status with ForbiddenException', async () => {
    await expect(clinicService.updateStatus('clinic-1', 'INACTIVE', mockDoctorUser)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('8. throws NotFoundException when querying non-existent clinic ID', async () => {
    await expect(clinicService.findOne('non-existent-id', mockAdminUser)).rejects.toThrow(
      NotFoundException,
    );
  });
});
