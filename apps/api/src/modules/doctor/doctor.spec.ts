import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { UserRole } from '@matabai/shared';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';

describe('Phase 3: Doctor Management Unit Tests', () => {
  let doctorService: DoctorService;

  const mockAdminUser: AuthenticatedUser = {
    id: 'user-admin-1',
    authUserId: 'auth-admin-1',
    email: 'admin@alshifa.local',
    fullName: 'Admin User',
    role: UserRole.CLINIC_ADMIN,
    organizationId: 'org-1',
    permissions: [],
  };

  const mockReceptionistUser: AuthenticatedUser = {
    id: 'user-rec-1',
    authUserId: 'auth-rec-1',
    email: 'reception@alshifa.local',
    fullName: 'Receptionist User',
    role: UserRole.RECEPTIONIST,
    organizationId: 'org-1',
    permissions: [],
  };

  const mockDoctor = {
    id: 'doc-1',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    userProfileId: 'user-doc-profile-1',
    fullName: 'Dr. Muhammad Talha',
    email: 'talha@alshifa.local',
    phone: '03001234567',
    specialty: 'Internal Medicine',
    qualification: 'MBBS, FCPS',
    registrationNumber: 'PMC-12345-P',
    consultationFee: 2500,
    biography: 'Consultant physician with 10 years experience',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    clinic: { id: 'clinic-1', name: 'Al-Shifa Main' },
  };

  const mockClinic = {
    id: 'clinic-1',
    organizationId: 'org-1',
    name: 'Al-Shifa Main',
  };

  const mockPrisma = {
    doctor: {
      findMany: jest.fn().mockResolvedValue([mockDoctor]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'doc-1') return Promise.resolve(mockDoctor);
        return Promise.resolve(null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where.registrationNumber === 'PMC-12345-P') return Promise.resolve(mockDoctor);
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'doc-new', ...data })),
      update: jest.fn().mockImplementation(({ where: _where, data }) => Promise.resolve({ ...mockDoctor, ...data })),
    },
    clinic: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'clinic-1') return Promise.resolve(mockClinic);
        return Promise.resolve(null);
      }),
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
        if (where.organizationId === 'org-1' && where.userProfileId === mockReceptionistUser.id) {
          return Promise.resolve({
            id: 'mem-2',
            organizationId: 'org-1',
            userProfileId: mockReceptionistUser.id,
            role: UserRole.RECEPTIONIST,
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
        DoctorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    doctorService = module.get<DoctorService>(DoctorService);
    jest.clearAllMocks();
  });

  it('1. retrieves paginated doctors and displays registrationNumber for clinic admin', async () => {
    const res = await doctorService.findAll(mockAdminUser, 'org-1');
    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.fullName).toBe('Dr. Muhammad Talha');
    expect(res.items[0]?.registrationNumber).toBe('PMC-12345-P');
  });

  it('2. masks doctor registration number when queried by non-admin staff', async () => {
    const res = await doctorService.findAll(mockReceptionistUser, 'org-1');
    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.registrationNumber).toBe('***RESTRICTED***');
  });

  it('3. creates doctor profile with clinic assignment and fees', async () => {
    const newDoc = {
      clinicId: 'clinic-1',
      fullName: 'Dr. Ayesha Malik',
      phone: '03339988776',
      specialty: 'Pediatrics',
      qualification: 'MBBS, MCPS',
      registrationNumber: 'PMC-99887-P',
      consultationFee: 2000,
      status: 'ACTIVE' as const,
    };

    const created = await doctorService.create(newDoc, mockAdminUser);
    expect(created.fullName).toBe('Dr. Ayesha Malik');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DOCTOR_CREATE',
        resourceType: 'doctor',
      }),
    );
  });

  it('4. rejects duplicate doctor registration number within the organization', async () => {
    const duplicateDoc = {
      clinicId: 'clinic-1',
      fullName: 'Dr. Impostor',
      phone: '03000000000',
      specialty: 'Cardiology',
      qualification: 'MBBS',
      registrationNumber: 'PMC-12345-P', // Already registered
      consultationFee: 1500,
      status: 'ACTIVE' as const,
    };

    await expect(doctorService.create(duplicateDoc, mockAdminUser)).rejects.toThrow(ConflictException);
  });

  it('5. updates doctor profile information and consultation fee', async () => {
    const updateDto = {
      consultationFee: 3000,
      specialty: 'Advanced Internal Medicine',
    };

    const updated = await doctorService.update('doc-1', updateDto, mockAdminUser);
    expect(updated.consultationFee).toBe(3000);
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DOCTOR_UPDATE',
      }),
    );
  });

  it('6. updates doctor active status', async () => {
    const updated = await doctorService.updateStatus('doc-1', 'INACTIVE', mockAdminUser);
    expect(updated.status).toBe('INACTIVE');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DOCTOR_STATUS_UPDATE',
      }),
    );
  });

  it('7. blocks receptionist from creating doctors with ForbiddenException', async () => {
    const newDoc = {
      clinicId: 'clinic-1',
      fullName: 'Dr. Unauthorized',
      phone: '03112233445',
      specialty: 'General',
      qualification: 'MBBS',
      registrationNumber: 'PMC-00000-P',
      consultationFee: 1000,
      status: 'ACTIVE' as const,
    };

    await expect(doctorService.create(newDoc, mockReceptionistUser)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
