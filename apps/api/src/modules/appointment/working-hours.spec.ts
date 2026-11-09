import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { WorkingHoursService } from './working-hours.service';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { UserRole } from '@matabai/shared';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';

describe('Phase 4: Doctor Working Hours Unit Tests', () => {
  let service: WorkingHoursService;

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
    id: 'user-doc-1',
    authUserId: 'auth-doc-1',
    email: 'doctor@alshifa.local',
    fullName: 'Dr. Talha',
    role: UserRole.DOCTOR,
    organizationId: 'org-1',
    permissions: [],
  };

  const mockDoctor = {
    id: 'doc-1',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    userProfileId: 'user-doc-1',
    fullName: 'Dr. Muhammad Talha',
    status: 'ACTIVE',
  };

  const mockClinic = {
    id: 'clinic-1',
    organizationId: 'org-1',
    name: 'Al-Shifa Main',
    status: 'ACTIVE',
  };

  const mockWorkingHours = {
    id: 'wh-1',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    doctorId: 'doc-1',
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '13:00',
    slotDurationMinutes: 20,
    breakStartTime: null,
    breakEndTime: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    doctor: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'doc-1') return Promise.resolve(mockDoctor);
        return Promise.resolve(null);
      }),
    },
    clinic: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'clinic-1') return Promise.resolve(mockClinic);
        return Promise.resolve(null);
      }),
    },
    doctorWorkingHours: {
      findMany: jest.fn().mockResolvedValue([mockWorkingHours]),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'wh-1') return Promise.resolve(mockWorkingHours);
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'wh-new', ...data, clinic: { id: 'clinic-1', name: 'Al-Shifa Main' } }),
      ),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ ...mockWorkingHours, ...data }),
      ),
      delete: jest.fn().mockResolvedValue(mockWorkingHours),
    },
  };

  const mockAudit = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkingHoursService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<WorkingHoursService>(WorkingHoursService);
    jest.clearAllMocks();
  });

  it('1. retrieves doctor working hours for authorized doctor', async () => {
    const result = await service.findAll('doc-1', mockDoctorUser);
    expect(result).toHaveLength(1);
    expect(result[0]?.startTime).toBe('09:00');
  });

  it('2. creates working hours successfully and logs audit', async () => {
    mockPrisma.doctorWorkingHours.findMany.mockResolvedValueOnce([]); // no existing overlap

    const created = await service.create(
      'doc-1',
      {
        clinicId: 'clinic-1',
        doctorId: 'doc-1',
        dayOfWeek: 2,
        startTime: '14:00',
        endTime: '18:00',
        slotDurationMinutes: 15,
        isActive: true,
      },
      mockAdminUser,
    );

    expect(created.startTime).toBe('14:00');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DOCTOR_WORKING_HOURS_CREATE',
        organizationId: 'org-1',
      }),
    );
  });

  it('3. rejects overlapping working hours for same doctor, clinic, and day', async () => {
    // mock existing Monday 09:00 - 13:00
    mockPrisma.doctorWorkingHours.findMany.mockResolvedValueOnce([mockWorkingHours]);

    await expect(
      service.create(
        'doc-1',
        {
          clinicId: 'clinic-1',
          doctorId: 'doc-1',
          dayOfWeek: 1,
          startTime: '11:00', // overlaps with 09:00 - 13:00
          endTime: '15:00',
          slotDurationMinutes: 20,
          isActive: true,
        },
        mockAdminUser,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('4. blocks non-admin from creating working hours with ForbiddenException', async () => {
    await expect(
      service.create(
        'doc-1',
        {
          clinicId: 'clinic-1',
          doctorId: 'doc-1',
          dayOfWeek: 3,
          startTime: '09:00',
          endTime: '13:00',
          slotDurationMinutes: 20,
          isActive: true,
        },
        mockDoctorUser,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('5. blocks cross-tenant schedule modification with ForbiddenException', async () => {
    const crossTenantAdmin: AuthenticatedUser = {
      id: 'admin-foreign',
      authUserId: 'auth-foreign',
      email: 'foreign@other.local',
      fullName: 'Foreign Admin',
      role: UserRole.CLINIC_ADMIN,
      organizationId: 'org-other',
      permissions: [],
    };

    await expect(
      service.create(
        'doc-1',
        {
          clinicId: 'clinic-1',
          doctorId: 'doc-1',
          dayOfWeek: 4,
          startTime: '09:00',
          endTime: '12:00',
          slotDurationMinutes: 20,
          isActive: true,
        },
        crossTenantAdmin,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('6. deletes working hours and logs audit event', async () => {
    const res = await service.remove('doc-1', 'wh-1', mockAdminUser);
    expect(res.success).toBe(true);
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DOCTOR_WORKING_HOURS_DELETE',
      }),
    );
  });
});
