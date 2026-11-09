import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { SlotGenerationService } from './slot-generation.service';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { UserRole } from '@matabai/shared';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';

describe('Phase 4: Appointment Booking & Management Engine Unit Tests', () => {
  let service: AppointmentService;

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

  const mockPatientUser: AuthenticatedUser = {
    id: 'user-pat-profile-1',
    authUserId: 'auth-pat-1',
    email: 'patient@alshifa.local',
    fullName: 'Usman Ali',
    role: UserRole.PATIENT,
    organizationId: 'org-1',
    permissions: [],
  };

  const mockLabStaffUser: AuthenticatedUser = {
    id: 'user-lab-1',
    authUserId: 'auth-lab-1',
    email: 'lab@alshifa.local',
    fullName: 'Lab Tech',
    role: UserRole.LAB_STAFF,
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
  };

  const mockDoctor = {
    id: 'doc-1',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    fullName: 'Dr. Muhammad Talha',
    status: 'ACTIVE',
  };

  const mockClinic = {
    id: 'clinic-1',
    organizationId: 'org-1',
    name: 'Al-Shifa Main',
    timezone: 'Asia/Karachi',
    status: 'ACTIVE',
  };

  const mockAppointment = {
    id: 'apt-1',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    doctorId: 'doc-1',
    patientId: 'pat-1',
    appointmentNumber: 'APT-2026-0001',
    appointmentDate: '2030-01-07',
    startTime: '09:00',
    endTime: '09:30',
    timezone: 'Asia/Karachi',
    status: 'CONFIRMED',
    bookingSource: 'RECEPTIONIST',
    reasonForVisit: 'General Consultation',
    internalNotes: null,
    cancellationReason: null,
    createdBy: 'user-rec-1',
    cancelledBy: null,
    rescheduledFromId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: mockPatient,
    doctor: mockDoctor,
    clinic: mockClinic,
    statusHistory: [],
  };

  const mockSlotGen = {
    generateSlots: jest.fn().mockResolvedValue([
      { date: '2030-01-07', startTime: '09:00', endTime: '09:30', timezone: 'Asia/Karachi', isAvailable: true },
      { date: '2030-01-07', startTime: '09:30', endTime: '10:00', timezone: 'Asia/Karachi', isAvailable: true },
      { date: '2030-01-08', startTime: '11:00', endTime: '11:30', timezone: 'Asia/Karachi', isAvailable: true },
    ]),
  };

  const mockPrisma = {
    patient: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'pat-1') return Promise.resolve(mockPatient);
        return Promise.resolve(null);
      }),
    },
    doctor: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'doc-1') return Promise.resolve(mockDoctor);
        return Promise.resolve(null);
      }),
      findFirst: jest.fn().mockResolvedValue(mockDoctor),
    },
    clinic: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'clinic-1') return Promise.resolve(mockClinic);
        return Promise.resolve(null);
      }),
    },
    doctorClinicAssignment: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    appointment: {
      findMany: jest.fn().mockResolvedValue([mockAppointment]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'apt-1') return Promise.resolve(mockAppointment);
        return Promise.resolve(null);
      }),
      findFirst: jest.fn().mockResolvedValue(null), // no conflict by default
    },
    appointmentStatusHistory: {
      create: jest.fn().mockResolvedValue({ id: 'hist-1' }),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => {
      return callback({
        appointment: {
          findFirst: mockPrisma.appointment.findFirst,
          count: mockPrisma.appointment.count,
          create: jest.fn().mockImplementation(({ data }) =>
            Promise.resolve({
              id: 'apt-new',
              ...data,
              clinic: mockClinic,
              doctor: mockDoctor,
              patient: mockPatient,
            }),
          ),
          update: jest.fn().mockImplementation(({ data }) =>
            Promise.resolve({
              ...mockAppointment,
              ...data,
            }),
          ),
        },
        appointmentStatusHistory: {
          create: jest.fn().mockResolvedValue({ id: 'hist-new' }),
        },
      });
    }),
  };

  const mockAudit = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: SlotGenerationService, useValue: mockSlotGen },
      ],
    }).compile();

    service = module.get<AppointmentService>(AppointmentService);
    jest.clearAllMocks();
  });

  it('1. books an appointment successfully with auto-generated appointment number and audit', async () => {
    const created = await service.create(
      {
        clinicId: 'clinic-1',
        doctorId: 'doc-1',
        patientId: 'pat-1',
        appointmentDate: '2030-01-07',
        startTime: '09:00',
        endTime: '09:30',
        bookingSource: 'RECEPTIONIST',
        reasonForVisit: 'Flu symptoms and fever',
      },
      mockReceptionistUser,
    );

    expect(created.appointmentNumber).toBe('APT-2026-0002');
    expect(created.status).toBe('CONFIRMED');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'APPOINTMENT_CREATE',
        organizationId: 'org-1',
      }),
    );
  });

  it('2. rejects booking when requested time slot is not available in slot generator', async () => {
    await expect(
      service.create(
        {
          clinicId: 'clinic-1',
          doctorId: 'doc-1',
          patientId: 'pat-1',
          appointmentDate: '2030-01-07',
          startTime: '03:00', // slot not in slotGen return
          endTime: '03:30',
          bookingSource: 'RECEPTIONIST',
        },
        mockReceptionistUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('3. prevents double booking under concurrent requests with ConflictException', async () => {
    // Mock conflict in transaction query
    mockPrisma.appointment.findFirst.mockResolvedValueOnce({
      id: 'apt-competing',
      startTime: '09:00',
      endTime: '09:30',
      status: 'CONFIRMED',
    });

    await expect(
      service.create(
        {
          clinicId: 'clinic-1',
          doctorId: 'doc-1',
          patientId: 'pat-1',
          appointmentDate: '2030-01-07',
          startTime: '09:00',
          endTime: '09:30',
          bookingSource: 'RECEPTIONIST',
        },
        mockReceptionistUser,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('4. reschedules existing appointment to new valid slot and updates status history', async () => {
    const rescheduled = await service.reschedule(
      'apt-1',
      {
        appointmentDate: '2030-01-08',
        startTime: '11:00',
        endTime: '11:30',
        reason: 'Patient travel conflict',
      },
      mockAdminUser,
    );

    expect(rescheduled.appointmentDate).toBe('2030-01-08');
    expect(rescheduled.startTime).toBe('11:00');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'APPOINTMENT_RESCHEDULE',
      }),
    );
  });

  it('5. rejects rescheduling if destination slot is occupied', async () => {
    mockSlotGen.generateSlots.mockResolvedValueOnce([]); // no available slots

    await expect(
      service.reschedule(
        'apt-1',
        {
          appointmentDate: '2030-01-07',
          startTime: '14:00',
          endTime: '14:30',
        },
        mockAdminUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('6. cancels appointment, records reason, and releases slot', async () => {
    const res = await service.cancel(
      'apt-1',
      {
        reason: 'Patient called to cancel due to recovery',
      },
      mockReceptionistUser,
    );

    expect(res.success).toBe(true);
    expect(res.appointment.status).toBe('CANCELLED');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'APPOINTMENT_CANCEL',
      }),
    );
  });

  it('7. allows valid status transitions and rejects invalid transitions', async () => {
    // Valid: CONFIRMED -> COMPLETED
    const completed = await service.updateStatus(
      'apt-1',
      { status: 'COMPLETED' },
      mockAdminUser,
    );
    expect(completed.status).toBe('COMPLETED');

    // Invalid: COMPLETED -> PENDING should throw BadRequestException
    mockPrisma.appointment.findUnique.mockResolvedValueOnce({
      ...mockAppointment,
      status: 'COMPLETED',
    });

    await expect(
      service.updateStatus(
        'apt-1',
        { status: 'PENDING' },
        mockAdminUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('8. blocks lab staff from booking or modifying appointments with ForbiddenException', async () => {
    await expect(
      service.create(
        {
          clinicId: 'clinic-1',
          doctorId: 'doc-1',
          patientId: 'pat-1',
          appointmentDate: '2030-01-07',
          startTime: '09:00',
          endTime: '09:30',
          bookingSource: 'RECEPTIONIST',
        },
        mockLabStaffUser,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('9. blocks patient from booking appointments for a different patient', async () => {
    await expect(
      service.create(
        {
          clinicId: 'clinic-1',
          doctorId: 'doc-1',
          patientId: 'pat-1',
          appointmentDate: '2030-01-07',
          startTime: '09:00',
          endTime: '09:30',
          bookingSource: 'PATIENT_PORTAL',
        },
        {
          ...mockPatientUser,
          id: 'user-different-patient',
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('10. blocks cross-tenant access with ForbiddenException', async () => {
    const crossTenantAdmin: AuthenticatedUser = {
      id: 'admin-foreign',
      authUserId: 'auth-foreign',
      email: 'foreign@other.local',
      fullName: 'Foreign Admin',
      role: UserRole.CLINIC_ADMIN,
      organizationId: 'org-foreign',
      permissions: [],
    };

    await expect(service.findOne('apt-1', crossTenantAdmin)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
