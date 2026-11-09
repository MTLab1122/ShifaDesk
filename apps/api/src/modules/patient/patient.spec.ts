import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PatientService } from './patient.service';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { UserRole } from '@matabai/shared';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';

describe('Phase 3: Patient Management Unit Tests', () => {
  let patientService: PatientService;

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
    email: 'rec@alshifa.local',
    fullName: 'Receptionist User',
    role: UserRole.RECEPTIONIST,
    organizationId: 'org-1',
    permissions: [],
  };

  const mockPatientUserSelf: AuthenticatedUser = {
    id: 'user-pat-profile-1',
    authUserId: 'auth-pat-1',
    email: 'usman@patient.local',
    fullName: 'Usman Ali',
    role: UserRole.PATIENT,
    organizationId: 'org-1',
    permissions: [],
  };

  const mockOtherPatientUser: AuthenticatedUser = {
    id: 'user-pat-profile-2',
    authUserId: 'auth-pat-2',
    email: 'other@patient.local',
    fullName: 'Other Patient',
    role: UserRole.PATIENT,
    organizationId: 'org-1',
    permissions: [],
  };

  const mockPatient = {
    id: 'pat-1',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    userProfileId: 'user-pat-profile-1',
    patientNumber: 'MRN-2026-0001',
    fullName: 'Usman Ali',
    dateOfBirth: '1992-05-14',
    gender: 'Male',
    phone: '03211122334',
    email: 'usman@gmail.com',
    address: 'Street 4, Sector F-8/2, Islamabad',
    emergencyContactName: 'Hamza Ali (Brother)',
    emergencyContactPhone: '03009988776',
    consentStatus: 'GRANTED',
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
    patient: {
      findMany: jest.fn().mockResolvedValue([mockPatient]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'pat-1') return Promise.resolve(mockPatient);
        if (where.organizationId_patientNumber) {
          if (where.organizationId_patientNumber.patientNumber === 'MRN-2026-0001') {
            return Promise.resolve(mockPatient);
          }
        }
        return Promise.resolve(null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where.phone === '03211122334') return Promise.resolve(mockPatient);
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pat-new', ...data })),
      update: jest.fn().mockImplementation(({ where: _where, data }) => Promise.resolve({ ...mockPatient, ...data })),
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
        PatientService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    patientService = module.get<PatientService>(PatientService);
    jest.clearAllMocks();
  });

  it('1. retrieves paginated patients with search query', async () => {
    const res = await patientService.findAll(mockReceptionistUser, 'org-1', undefined, 1, 20, 'Usman');
    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.fullName).toBe('Usman Ali');
    expect(res.items[0]?.patientNumber).toBe('MRN-2026-0001');
  });

  it('2. registers a new patient with auto-generated MRN number and logs audit', async () => {
    const newPatient = {
      clinicId: 'clinic-1',
      fullName: 'Zainab Bibi',
      phone: '03335566778',
      gender: 'Female' as const,
      dateOfBirth: '1998-11-20',
      consentStatus: 'GRANTED' as const,
      status: 'ACTIVE' as const,
    };

    const created = await patientService.create(newPatient, mockReceptionistUser);
    expect(created.fullName).toBe('Zainab Bibi');
    expect(created.patientNumber).toBeDefined();
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PATIENT_REGISTER',
        resourceType: 'patient',
      }),
    );
  });

  it('3. rejects duplicate patient registration with identical name and phone', async () => {
    const duplicatePatient = {
      clinicId: 'clinic-1',
      fullName: 'Usman Ali',
      phone: '03211122334', // Already registered
      consentStatus: 'GRANTED' as const,
      status: 'ACTIVE' as const,
    };

    await expect(patientService.create(duplicatePatient, mockReceptionistUser)).rejects.toThrow(
      ConflictException,
    );
  });

  it('4. allows patient to view their own profile', async () => {
    const patient = await patientService.findOne('pat-1', mockPatientUserSelf);
    expect(patient.id).toBe('pat-1');
    expect(patient.fullName).toBe('Usman Ali');
  });

  it('5. blocks patient from viewing another patient record with ForbiddenException', async () => {
    await expect(patientService.findOne('pat-1', mockOtherPatientUser)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('6. updates patient emergency contact details', async () => {
    const updateDto = {
      emergencyContactName: 'Rashid Ali (Father)',
      emergencyContactPhone: '03001234999',
    };

    const updated = await patientService.update('pat-1', updateDto, mockReceptionistUser);
    expect(updated.emergencyContactName).toBe('Rashid Ali (Father)');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PATIENT_UPDATE',
      }),
    );
  });

  it('7. updates patient active/inactive status', async () => {
    const updated = await patientService.updateStatus('pat-1', 'INACTIVE', mockAdminUser);
    expect(updated.status).toBe('INACTIVE');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PATIENT_STATUS_UPDATE',
      }),
    );
  });

  it('8. blocks cross-tenant staff access with ForbiddenException', async () => {
    const crossTenantAdmin: AuthenticatedUser = {
      id: 'foreign-admin-1',
      authUserId: 'foreign-auth-1',
      email: 'foreign@otherorg.local',
      fullName: 'Foreign Admin',
      role: UserRole.CLINIC_ADMIN,
      organizationId: 'org-foreign',
      permissions: [],
    };

    await expect(patientService.findOne('pat-1', crossTenantAdmin)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
