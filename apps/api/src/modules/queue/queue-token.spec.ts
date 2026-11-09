import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { QueueTokenService } from './queue-token.service';
import { QueueSessionService } from './queue-session.service';
import { QueueRealtimeService } from './queue-realtime.service';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  UserRole,
  QueueSessionStatus,
  QueueTokenStatus,
  TokenPriorityType,
  AppointmentStatus,
} from '@matabai/shared';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';

describe('Phase 5: Queue Token & Operations Engine Unit Tests', () => {
  let service: QueueTokenService;
  let prisma: any;
  let sessionService: any;
  let realtime: any;

  const mockAdminUser: AuthenticatedUser = {
    id: 'user-admin-1',
    authUserId: 'auth-admin-1',
    email: 'admin@alshifa.local',
    fullName: 'Admin User',
    role: UserRole.CLINIC_ADMIN,
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    permissions: [],
  };

  const mockReceptionistUser: AuthenticatedUser = {
    id: 'user-rec-1',
    authUserId: 'auth-rec-1',
    email: 'rec@alshifa.local',
    fullName: 'Receptionist User',
    role: UserRole.RECEPTIONIST,
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    permissions: [],
  };

  const mockClinic = {
    id: 'clinic-1',
    organizationId: 'org-1',
    name: 'Al-Shifa Main Hospital',
    timezone: 'Asia/Karachi',
  };

  const mockQueueSettings = {
    id: 'qs-1',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    queueName: 'Main OPD',
    tokenPrefix: 'A',
    tokenResetPolicy: 'DAILY',
    allowWalkIns: true,
    allowAppointmentCheckIn: true,
    estimatedConsultationMinutes: 15,
    maxQueueCapacity: 100,
    publicQueueId: 'pub-queue-1',
    isPublicDisplayEnabled: true,
    isActive: true,
  };

  const mockSession = {
    id: 'sess-1',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    doctorId: 'doc-1',
    queueSettingsId: 'qs-1',
    sessionDate: '2026-11-09',
    status: QueueSessionStatus.ACTIVE,
    lastTokenNumber: 0,
    currentTokenNumber: null,
    totalRegistered: 0,
    totalCompleted: 0,
    queueSettings: mockQueueSettings,
    clinic: mockClinic,
  };

  beforeEach(async () => {
    prisma = {
      appointment: { findUnique: jest.fn(), update: jest.fn() },
      patient: { findUnique: jest.fn(), findFirst: jest.fn() },
      clinicQueueSession: { findUnique: jest.fn(), update: jest.fn() },
      queueToken: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      queueStatusHistory: { create: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    sessionService = {
      getTodayInTimezone: jest.fn().mockReturnValue('2026-11-09'),
      getOrCreateTodaySession: jest.fn().mockResolvedValue(mockSession),
    };

    realtime = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueTokenService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
        { provide: QueueRealtimeService, useValue: realtime },
        { provide: QueueSessionService, useValue: sessionService },
      ],
    }).compile();

    service = module.get<QueueTokenService>(QueueTokenService);
  });

  describe('Appointment Check-in & Sequential Token Generation', () => {
    it('should successfully check in appointment and generate sequential token A001', async () => {
      const mockAppointment = {
        id: 'apt-1',
        organizationId: 'org-1',
        clinicId: 'clinic-1',
        doctorId: 'doc-1',
        patientId: 'pat-1',
        appointmentDate: '2026-11-09',
        status: AppointmentStatus.CONFIRMED,
        reasonForVisit: 'General checkup',
        clinic: mockClinic,
        doctor: { id: 'doc-1', fullName: 'Dr. Talha' },
        patient: { id: 'pat-1', fullName: 'Ahmed Khan' },
      };

      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      prisma.queueToken.findFirst.mockResolvedValue(null); // No existing active token
      prisma.clinicQueueSession.findUnique.mockResolvedValue({
        ...mockSession,
        lastTokenNumber: 0,
        totalRegistered: 0,
      });
      prisma.queueToken.count.mockResolvedValue(0);
      prisma.queueToken.create.mockImplementation(({ data }: any) => ({
        id: 'token-1',
        ...data,
      }));
      prisma.queueToken.findMany.mockResolvedValue([]);

      const result = await service.checkInAppointment(mockReceptionistUser, {
        appointmentId: 'apt-1',
      });

      expect(result.tokenDisplay).toBe('A001');
      expect(result.tokenNumber).toBe(1);
      expect(result.status).toBe(QueueTokenStatus.WAITING);
      expect(result.queuePosition).toBe(1);
      expect(realtime.emit).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'TOKEN_CREATED', tokenDisplay: 'A001' }),
      );
    });

    it('should reject appointment check-in if appointment date is not today', async () => {
      const futureAppointment = {
        id: 'apt-2',
        organizationId: 'org-1',
        clinicId: 'clinic-1',
        appointmentDate: '2026-11-15',
        status: AppointmentStatus.CONFIRMED,
        clinic: mockClinic,
      };

      prisma.appointment.findUnique.mockResolvedValue(futureAppointment);

      await expect(
        service.checkInAppointment(mockReceptionistUser, { appointmentId: 'apt-2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent duplicate active token for the same appointment', async () => {
      const mockAppointment = {
        id: 'apt-1',
        organizationId: 'org-1',
        clinicId: 'clinic-1',
        appointmentDate: '2026-11-09',
        status: AppointmentStatus.CONFIRMED,
        clinic: mockClinic,
      };

      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      prisma.queueToken.findFirst.mockResolvedValue({
        id: 'tok-existing',
        tokenDisplay: 'A001',
        status: QueueTokenStatus.WAITING,
      });

      await expect(
        service.checkInAppointment(mockReceptionistUser, { appointmentId: 'apt-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Walk-in Check-in', () => {
    it('should successfully check in walk-in patient with priority', async () => {
      prisma.patient.findUnique.mockResolvedValue({
        id: 'pat-walkin-1',
        organizationId: 'org-1',
        clinicId: 'clinic-1',
        fullName: 'Fatima Bibi',
      });
      prisma.queueToken.findFirst.mockResolvedValue(null);
      prisma.clinicQueueSession.findUnique.mockResolvedValue({
        ...mockSession,
        lastTokenNumber: 5,
        totalRegistered: 5,
      });
      prisma.queueToken.count.mockResolvedValue(3);
      prisma.queueToken.create.mockImplementation(({ data }: any) => ({
        id: 'token-6',
        ...data,
      }));
      prisma.queueToken.findMany.mockResolvedValue([]);

      const result = await service.checkInWalkIn(mockReceptionistUser, {
        clinicId: 'clinic-1',
        patientId: 'pat-walkin-1',
        priorityType: TokenPriorityType.PRIORITY,
        notes: 'Elderly patient with mobility assistance',
      });

      expect(result.tokenDisplay).toBe('A006');
      expect(result.priorityType).toBe(TokenPriorityType.PRIORITY);
      expect(prisma.clinicQueueSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lastTokenNumber: 6, totalRegistered: 6 }),
        }),
      );
    });

    it('should prevent duplicate active token for walk-in patient in same session', async () => {
      prisma.patient.findUnique.mockResolvedValue({
        id: 'pat-walkin-1',
        organizationId: 'org-1',
        clinicId: 'clinic-1',
      });
      prisma.queueToken.findFirst.mockResolvedValue({
        id: 'existing-active',
        tokenDisplay: 'A003',
        status: QueueTokenStatus.WAITING,
      });

      await expect(
        service.checkInWalkIn(mockReceptionistUser, {
          clinicId: 'clinic-1',
          patientId: 'pat-walkin-1',
          priorityType: TokenPriorityType.NORMAL,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Queue Operations & State Machine Transitions', () => {
    it('should call next patient in deterministic order (PRIORITY before NORMAL)', async () => {
      prisma.clinicQueueSession.findUnique.mockResolvedValue(mockSession);
      const token1Normal = {
        id: 'tok-1',
        tokenNumber: 1,
        tokenDisplay: 'A001',
        priorityType: TokenPriorityType.NORMAL,
        checkedInAt: new Date('2026-11-09T09:00:00Z'),
        status: QueueTokenStatus.WAITING,
      };
      const token2Priority = {
        id: 'tok-2',
        tokenNumber: 2,
        tokenDisplay: 'A002',
        priorityType: TokenPriorityType.PRIORITY,
        checkedInAt: new Date('2026-11-09T09:05:00Z'),
        status: QueueTokenStatus.WAITING,
      };

      prisma.queueToken.findMany.mockResolvedValue([token1Normal, token2Priority]);
      prisma.queueToken.findFirst.mockResolvedValue(null); // No existing CALLED
      prisma.queueToken.update.mockImplementation(({ data }: any) => ({
        ...token2Priority,
        ...data,
      }));

      const called = await service.callNext(mockAdminUser, 'sess-1');

      // PRIORITY token (tok-2) should be selected ahead of earlier NORMAL token
      expect(called.status).toBe(QueueTokenStatus.CALLED);
      expect(called.tokenDisplay).toBe('A002');
      expect(realtime.emit).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'TOKEN_CALLED', tokenDisplay: 'A002' }),
      );
    });

    it('should transition token through full lifecycle: CALLED -> SERVING -> COMPLETED', async () => {
      // 1. CALLED -> SERVING
      const calledToken = {
        id: 'tok-3',
        status: QueueTokenStatus.CALLED,
        queueSessionId: 'sess-1',
        clinicId: 'clinic-1',
        organizationId: 'org-1',
        queueSession: { queueSettings: mockQueueSettings, totalCompleted: 0 },
      };
      prisma.queueToken.findUnique.mockResolvedValue(calledToken);
      prisma.queueToken.update.mockResolvedValue({
        ...calledToken,
        status: QueueTokenStatus.SERVING,
      });

      const serving = await service.startServing(mockAdminUser, 'tok-3');
      expect(serving.status).toBe(QueueTokenStatus.SERVING);

      // 2. SERVING -> COMPLETED
      const servingToken = {
        ...calledToken,
        status: QueueTokenStatus.SERVING,
        appointmentId: 'apt-3',
      };
      prisma.queueToken.findUnique.mockResolvedValue(servingToken);
      prisma.queueToken.update.mockResolvedValue({
        ...servingToken,
        status: QueueTokenStatus.COMPLETED,
      });

      const completed = await service.complete(mockAdminUser, 'tok-3');
      expect(completed.status).toBe(QueueTokenStatus.COMPLETED);
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'apt-3' },
        data: { status: AppointmentStatus.COMPLETED },
      });
      expect(prisma.clinicQueueSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { totalCompleted: 1 },
        }),
      );
    });

    it('should support skip and restore workflow', async () => {
      // 1. Skip token
      const waitingToken = {
        id: 'tok-4',
        status: QueueTokenStatus.WAITING,
        queueSessionId: 'sess-1',
        clinicId: 'clinic-1',
        organizationId: 'org-1',
        queueSession: { queueSettings: mockQueueSettings },
      };
      prisma.queueToken.findUnique.mockResolvedValue(waitingToken);
      prisma.queueToken.update.mockResolvedValue({
        ...waitingToken,
        status: QueueTokenStatus.SKIPPED,
      });
      prisma.queueToken.findMany.mockResolvedValue([]);

      const skipped = await service.skip(mockAdminUser, 'tok-4', 'Patient not in waiting room');
      expect(skipped.status).toBe(QueueTokenStatus.SKIPPED);

      // 2. Restore token
      const skippedToken = {
        ...waitingToken,
        status: QueueTokenStatus.SKIPPED,
      };
      prisma.queueToken.findUnique.mockResolvedValue(skippedToken);
      prisma.queueToken.update.mockResolvedValue({
        ...skippedToken,
        status: QueueTokenStatus.WAITING,
      });

      const restored = await service.restore(mockAdminUser, 'tok-4');
      expect(restored.status).toBe(QueueTokenStatus.WAITING);
    });

    it('should reject invalid state transitions', async () => {
      const waitingToken = {
        id: 'tok-5',
        status: QueueTokenStatus.WAITING,
        queueSessionId: 'sess-1',
        clinicId: 'clinic-1',
        organizationId: 'org-1',
        queueSession: { queueSettings: mockQueueSettings },
      };
      prisma.queueToken.findUnique.mockResolvedValue(waitingToken);

      // WAITING directly to COMPLETED is invalid
      await expect(service.complete(mockAdminUser, 'tok-5')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject unauthorized role from operating queue controls', async () => {
      const labStaffUser: AuthenticatedUser = {
        id: 'lab-1',
        authUserId: 'auth-lab-1',
        email: 'lab@alshifa.local',
        fullName: 'Lab Staff',
        role: UserRole.LAB_STAFF,
        organizationId: 'org-1',
        permissions: [],
      };

      await expect(service.callNext(labStaffUser, 'sess-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
