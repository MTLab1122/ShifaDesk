import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { QueueSessionService } from './queue-session.service';
import { QueueRealtimeService } from './queue-realtime.service';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { UserRole, QueueSessionStatus, QueueTokenStatus } from '@matabai/shared';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';

describe('Phase 5: Queue Session Management Unit Tests', () => {
  let service: QueueSessionService;
  let prisma: any;
  let realtime: any;

  const mockAdminUser: AuthenticatedUser = {
    id: 'user-admin-1',
    authUserId: 'auth-admin-1',
    email: 'admin@alshifa.local',
    fullName: 'Admin User',
    role: UserRole.CLINIC_ADMIN,
    organizationId: 'org-1',
    permissions: [],
  };

  const mockSettings = {
    id: 'qs-1',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    queueName: 'Main OPD',
    tokenPrefix: 'A',
    clinic: { id: 'clinic-1', timezone: 'Asia/Karachi' },
  };

  beforeEach(async () => {
    prisma = {
      clinicQueueSettings: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      clinicQueueSession: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      queueToken: { count: jest.fn(), findFirst: jest.fn() },
      clinic: { findUnique: jest.fn() },
    };

    realtime = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueSessionService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
        { provide: QueueRealtimeService, useValue: realtime },
      ],
    }).compile();

    service = module.get<QueueSessionService>(QueueSessionService);
  });

  describe('Session Lifecycle', () => {
    it('should successfully create daily queue session', async () => {
      prisma.clinicQueueSettings.findUnique.mockResolvedValue(mockSettings);
      prisma.clinicQueueSession.findUnique.mockResolvedValue(null); // No existing
      prisma.clinicQueueSession.create.mockResolvedValue({
        id: 'sess-new',
        organizationId: 'org-1',
        clinicId: 'clinic-1',
        queueSettingsId: 'qs-1',
        sessionDate: '2026-11-09',
        status: QueueSessionStatus.ACTIVE,
      });

      const session = await service.create(mockAdminUser, {
        clinicId: 'clinic-1',
        queueSettingsId: 'qs-1',
      });

      expect(session.id).toBe('sess-new');
      expect(session.status).toBe(QueueSessionStatus.ACTIVE);
    });

    it('should prevent multiple active sessions for same queue on same date', async () => {
      prisma.clinicQueueSettings.findUnique.mockResolvedValue(mockSettings);
      prisma.clinicQueueSession.findUnique.mockResolvedValue({
        id: 'sess-already-exists',
        sessionDate: '2026-11-09',
      });

      await expect(
        service.create(mockAdminUser, {
          clinicId: 'clinic-1',
          queueSettingsId: 'qs-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should pause and resume active queue session', async () => {
      const activeSession = {
        id: 'sess-1',
        organizationId: 'org-1',
        clinicId: 'clinic-1',
        status: QueueSessionStatus.ACTIVE,
      };
      prisma.clinicQueueSession.findUnique.mockResolvedValue(activeSession);
      prisma.clinicQueueSession.update.mockResolvedValue({
        ...activeSession,
        status: QueueSessionStatus.PAUSED,
      });

      const paused = await service.pause(mockAdminUser, 'sess-1');
      expect(paused.status).toBe(QueueSessionStatus.PAUSED);
      expect(realtime.emit).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'QUEUE_PAUSED' }),
      );

      // Resume
      prisma.clinicQueueSession.findUnique.mockResolvedValue({
        ...activeSession,
        status: QueueSessionStatus.PAUSED,
      });
      prisma.clinicQueueSession.update.mockResolvedValue({
        ...activeSession,
        status: QueueSessionStatus.ACTIVE,
      });

      const resumed = await service.resume(mockAdminUser, 'sess-1');
      expect(resumed.status).toBe(QueueSessionStatus.ACTIVE);
      expect(realtime.emit).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'QUEUE_RESUMED' }),
      );
    });

    it('should reject closing queue when patient is actively being served without force override', async () => {
      const activeSession = {
        id: 'sess-1',
        organizationId: 'org-1',
        clinicId: 'clinic-1',
        status: QueueSessionStatus.ACTIVE,
      };
      prisma.clinicQueueSession.findUnique.mockResolvedValue(activeSession);
      prisma.queueToken.findFirst.mockResolvedValue({
        id: 'tok-serving',
        tokenDisplay: 'A004',
        status: QueueTokenStatus.SERVING,
      });

      await expect(service.close(mockAdminUser, 'sess-1', false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow closing queue when patient is actively served if force=true', async () => {
      const activeSession = {
        id: 'sess-1',
        organizationId: 'org-1',
        clinicId: 'clinic-1',
        status: QueueSessionStatus.ACTIVE,
      };
      prisma.clinicQueueSession.findUnique.mockResolvedValue(activeSession);
      prisma.clinicQueueSession.update.mockResolvedValue({
        ...activeSession,
        status: QueueSessionStatus.CLOSED,
      });

      const closed = await service.close(mockAdminUser, 'sess-1', true);
      expect(closed.status).toBe(QueueSessionStatus.CLOSED);
      expect(realtime.emit).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'QUEUE_CLOSED' }),
      );
    });

    it('should reject invalid session transitions (e.g. CLOSED to ACTIVE)', async () => {
      const closedSession = {
        id: 'sess-1',
        organizationId: 'org-1',
        clinicId: 'clinic-1',
        status: QueueSessionStatus.CLOSED,
      };
      prisma.clinicQueueSession.findUnique.mockResolvedValue(closedSession);

      await expect(service.start(mockAdminUser, 'sess-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
