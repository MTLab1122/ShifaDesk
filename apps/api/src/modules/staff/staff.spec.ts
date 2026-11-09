import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { StaffService } from './staff.service';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { UserRole } from '@matabai/shared';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';

describe('Phase 3: Staff Management Unit Tests', () => {
  let staffService: StaffService;

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

  const mockStaffMember = {
    id: 'staff-1',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    userProfileId: 'user-rec-1',
    fullName: 'Fatima Zahra',
    email: 'fatima@alshifa.local',
    phone: '03001234567',
    designation: 'RECEPTIONIST',
    department: 'Front Desk OPD',
    employmentStatus: 'ACTIVE',
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
    staffMember: {
      findMany: jest.fn().mockResolvedValue([mockStaffMember]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'staff-1') return Promise.resolve(mockStaffMember);
        return Promise.resolve(null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where.email === 'fatima@alshifa.local') return Promise.resolve(mockStaffMember);
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'staff-new', ...data })),
      update: jest.fn().mockImplementation(({ where: _where, data }) => Promise.resolve({ ...mockStaffMember, ...data })),
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
        StaffService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    staffService = module.get<StaffService>(StaffService);
    jest.clearAllMocks();
  });

  it('1. retrieves paginated staff members under organization with filters', async () => {
    const res = await staffService.findAll(mockAdminUser, 'org-1', undefined, 1, 20, undefined, 'RECEPTIONIST');
    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.fullName).toBe('Fatima Zahra');
    expect(res.items[0]?.designation).toBe('RECEPTIONIST');
  });

  it('2. registers a new receptionist staff member', async () => {
    const newStaff = {
      clinicId: 'clinic-1',
      fullName: 'Bilal Ahmed',
      email: 'bilal@alshifa.local',
      phone: '03007654321',
      designation: 'RECEPTIONIST',
      department: 'Evening Shift',
      employmentStatus: 'ACTIVE' as const,
    };

    const created = await staffService.create(newStaff, mockAdminUser);
    expect(created.fullName).toBe('Bilal Ahmed');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STAFF_CREATE',
        resourceType: 'staff_member',
      }),
    );
  });

  it('3. registers a laboratory staff member', async () => {
    const labTech = {
      clinicId: 'clinic-1',
      fullName: 'Dr. Zeeshan Ali (Technologist)',
      email: 'zeeshan.lab@alshifa.local',
      phone: '03211122334',
      designation: 'LAB_STAFF',
      department: 'Pathology & Diagnostic Laboratory',
      employmentStatus: 'ACTIVE' as const,
    };

    const created = await staffService.create(labTech, mockAdminUser);
    expect(created.designation).toBe('LAB_STAFF');
  });

  it('4. rejects duplicate staff email in organization', async () => {
    const duplicate = {
      clinicId: 'clinic-1',
      fullName: 'Another Fatima',
      email: 'fatima@alshifa.local', // Already registered
      phone: '03009999999',
      designation: 'RECEPTIONIST',
      department: 'Front Desk',
      employmentStatus: 'ACTIVE' as const,
    };

    await expect(staffService.create(duplicate, mockAdminUser)).rejects.toThrow(ConflictException);
  });

  it('5. updates staff member department and designation', async () => {
    const updateDto = {
      department: 'Senior Reception Coordinator',
      phone: '03009988776',
    };

    const updated = await staffService.update('staff-1', updateDto, mockAdminUser);
    expect(updated.department).toBe('Senior Reception Coordinator');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STAFF_UPDATE',
      }),
    );
  });

  it('6. updates staff employment status', async () => {
    const updated = await staffService.updateStatus('staff-1', 'INACTIVE', mockAdminUser);
    expect(updated.employmentStatus).toBe('INACTIVE');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STAFF_STATUS_UPDATE',
      }),
    );
  });

  it('7. blocks ordinary staff member from creating staff to prevent privilege escalation', async () => {
    const rogueStaff = {
      clinicId: 'clinic-1',
      fullName: 'Rogue Employee',
      email: 'rogue@alshifa.local',
      phone: '03000000000',
      designation: 'CLINIC_ADMIN',
      department: 'Administration',
      employmentStatus: 'ACTIVE' as const,
    };

    await expect(staffService.create(rogueStaff, mockReceptionistUser)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
