import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { QueueRealtimeService } from './queue-realtime.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import {
  UserRole,
  QueueSessionStatus,
  QueueTokenStatus,
  VALID_QUEUE_SESSION_TRANSITIONS,
} from '@matabai/shared';
import { CreateQueueSessionInput, QueryQueueSessionsInput } from '@matabai/validation';

@Injectable()
export class QueueSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: QueueRealtimeService,
  ) {}

  getTodayInTimezone(timezone: string): string {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone || 'Asia/Karachi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0] || '';
    }
  }

  async findAll(user: AuthenticatedUser, query: QueryQueueSessionsInput) {
    if (user.role === UserRole.LAB_STAFF) {
      throw new ForbiddenException('Lab staff are not authorized to view queue sessions');
    }

    const { clinicId, doctorId, sessionDate, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (user.role !== UserRole.SUPER_ADMIN && user.organizationId) {
      where.organizationId = user.organizationId;
    }

    if (clinicId) where.clinicId = clinicId;
    if (doctorId) where.doctorId = doctorId;
    if (sessionDate) where.sessionDate = sessionDate;
    if (status) where.status = status;

    const [total, sessions] = await Promise.all([
      this.prisma.clinicQueueSession.count({ where }),
      this.prisma.clinicQueueSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          clinic: { select: { id: true, name: true, timezone: true } },
          doctor: { select: { id: true, fullName: true, specialty: true } },
          queueSettings: { select: { id: true, queueName: true, tokenPrefix: true, publicQueueId: true } },
        },
      }),
    ]);

    return {
      data: sessions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(user: AuthenticatedUser, id: string) {
    const session = await this.prisma.clinicQueueSession.findUnique({
      where: { id },
      include: {
        clinic: { select: { id: true, name: true, timezone: true } },
        doctor: { select: { id: true, fullName: true, specialty: true } },
        queueSettings: true,
        tokens: {
          where: {
            status: { in: [QueueTokenStatus.CALLED, QueueTokenStatus.SERVING] },
          },
          take: 2,
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Queue session ${id} not found`);
    }

    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.organizationId &&
      session.organizationId !== user.organizationId
    ) {
      throw new ForbiddenException('Access denied to other organization queue sessions');
    }

    // Compute live session stats
    const [waitingCount, servingCount, completedCount, skippedCount, cancelledCount] =
      await Promise.all([
        this.prisma.queueToken.count({
          where: { queueSessionId: id, status: QueueTokenStatus.WAITING },
        }),
        this.prisma.queueToken.count({
          where: { queueSessionId: id, status: QueueTokenStatus.SERVING },
        }),
        this.prisma.queueToken.count({
          where: { queueSessionId: id, status: QueueTokenStatus.COMPLETED },
        }),
        this.prisma.queueToken.count({
          where: { queueSessionId: id, status: QueueTokenStatus.SKIPPED },
        }),
        this.prisma.queueToken.count({
          where: { queueSessionId: id, status: QueueTokenStatus.CANCELLED },
        }),
      ]);

    const activeCalledToken = session.tokens.find((t) => t.status === QueueTokenStatus.CALLED);
    const activeServingToken = session.tokens.find((t) => t.status === QueueTokenStatus.SERVING);

    return {
      ...session,
      stats: {
        waitingCount,
        servingCount,
        completedCount,
        skippedCount,
        cancelledCount,
        totalRegistered: session.totalRegistered,
      },
      activeCalledToken: activeCalledToken || null,
      activeServingToken: activeServingToken || null,
    };
  }

  async create(user: AuthenticatedUser, dto: CreateQueueSessionInput) {
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.CLINIC_ADMIN &&
      user.role !== UserRole.RECEPTIONIST
    ) {
      throw new ForbiddenException('Not authorized to create queue sessions');
    }

    const settings = await this.prisma.clinicQueueSettings.findUnique({
      where: { id: dto.queueSettingsId },
      include: { clinic: true },
    });

    if (!settings) {
      throw new NotFoundException(`Queue settings ${dto.queueSettingsId} not found`);
    }

    const sessionDate =
      dto.sessionDate || this.getTodayInTimezone(settings.clinic.timezone);

    // Prevent duplicate session for same settings on same date
    const existing = await this.prisma.clinicQueueSession.findUnique({
      where: {
        queueSettingsId_sessionDate: {
          queueSettingsId: settings.id,
          sessionDate,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `A queue session already exists for this queue on ${sessionDate}`,
      );
    }

    const session = await this.prisma.clinicQueueSession.create({
      data: {
        organizationId: settings.organizationId,
        clinicId: settings.clinicId,
        doctorId: dto.doctorId || settings.doctorId || null,
        queueSettingsId: settings.id,
        sessionDate,
        status: QueueSessionStatus.ACTIVE,
        startedAt: new Date(),
      },
      include: {
        clinic: { select: { id: true, name: true, timezone: true } },
        doctor: { select: { id: true, fullName: true, specialty: true } },
        queueSettings: true,
      },
    });

    await this.audit.log({
      organizationId: session.organizationId,
      clinicId: session.clinicId,
      actorUserId: user.id,
      action: 'QUEUE_SESSION_CREATED',
      resourceType: 'QUEUE_SESSION',
      resourceId: session.id,
      metadata: { sessionDate: session.sessionDate, queueName: settings.queueName },
    });

    return session;
  }

  async getOrCreateTodaySession(clinicId: string, queueSettingsId?: string, doctorId?: string) {
    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException(`Clinic ${clinicId} not found`);

    const today = this.getTodayInTimezone(clinic.timezone);

    // Find setting
    let settings = queueSettingsId
      ? await this.prisma.clinicQueueSettings.findUnique({ where: { id: queueSettingsId } })
      : null;

    if (!settings && doctorId) {
      settings = await this.prisma.clinicQueueSettings.findFirst({
        where: { clinicId, doctorId, isActive: true },
      });
    }

    if (!settings) {
      settings = await this.prisma.clinicQueueSettings.findFirst({
        where: { clinicId, isActive: true },
      });
    }

    if (!settings) {
      // Auto-create default settings
      settings = await this.prisma.clinicQueueSettings.create({
        data: {
          organizationId: clinic.organizationId,
          clinicId,
          queueName: 'Main OPD Queue',
          tokenPrefix: 'A',
          tokenResetPolicy: 'DAILY',
          allowWalkIns: true,
          allowAppointmentCheckIn: true,
          estimatedConsultationMinutes: 15,
          publicQueueId: `${clinic.slug || 'clinic'}-opd`,
          isPublicDisplayEnabled: true,
        },
      });
    }

    // Check if session exists for today
    let session = await this.prisma.clinicQueueSession.findUnique({
      where: {
        queueSettingsId_sessionDate: {
          queueSettingsId: settings.id,
          sessionDate: today,
        },
      },
      include: {
        queueSettings: true,
      },
    });

    if (!session) {
      session = await this.prisma.clinicQueueSession.create({
        data: {
          organizationId: clinic.organizationId,
          clinicId,
          doctorId: settings.doctorId || doctorId || null,
          queueSettingsId: settings.id,
          sessionDate: today,
          status: QueueSessionStatus.ACTIVE,
          startedAt: new Date(),
        },
        include: {
          queueSettings: true,
        },
      });
    }

    return session;
  }

  async start(user: AuthenticatedUser, id: string) {
    const session = await this.validateSessionAccess(user, id);

    this.validateSessionTransition(
      session.status as QueueSessionStatus,
      QueueSessionStatus.ACTIVE,
    );

    const updated = await this.prisma.clinicQueueSession.update({
      where: { id },
      data: {
        status: QueueSessionStatus.ACTIVE,
        startedAt: session.startedAt || new Date(),
      },
    });

    this.realtime.emit({
      eventType: 'QUEUE_RESUMED',
      clinicId: session.clinicId,
      sessionId: session.id,
    });

    await this.audit.log({
      organizationId: session.organizationId,
      clinicId: session.clinicId,
      actorUserId: user.id,
      action: 'QUEUE_STARTED',
      resourceType: 'QUEUE_SESSION',
      resourceId: session.id,
    });

    return updated;
  }

  async pause(user: AuthenticatedUser, id: string) {
    const session = await this.validateSessionAccess(user, id);

    this.validateSessionTransition(
      session.status as QueueSessionStatus,
      QueueSessionStatus.PAUSED,
    );

    const updated = await this.prisma.clinicQueueSession.update({
      where: { id },
      data: { status: QueueSessionStatus.PAUSED },
    });

    this.realtime.emit({
      eventType: 'QUEUE_PAUSED',
      clinicId: session.clinicId,
      sessionId: session.id,
    });

    await this.audit.log({
      organizationId: session.organizationId,
      clinicId: session.clinicId,
      actorUserId: user.id,
      action: 'QUEUE_PAUSED',
      resourceType: 'QUEUE_SESSION',
      resourceId: session.id,
    });

    return updated;
  }

  async resume(user: AuthenticatedUser, id: string) {
    return this.start(user, id);
  }

  async close(user: AuthenticatedUser, id: string, force = false) {
    const session = await this.validateSessionAccess(user, id);

    this.validateSessionTransition(
      session.status as QueueSessionStatus,
      QueueSessionStatus.CLOSED,
    );

    // Rule: "A queue cannot be closed while a patient is actively being served unless the authorized user confirms"
    if (!force) {
      const activeServing = await this.prisma.queueToken.findFirst({
        where: {
          queueSessionId: id,
          status: QueueTokenStatus.SERVING,
        },
      });

      if (activeServing) {
        throw new BadRequestException(
          `Cannot close queue while patient ${activeServing.tokenDisplay} is actively being served. Pass force=true to override.`,
        );
      }
    }

    const updated = await this.prisma.clinicQueueSession.update({
      where: { id },
      data: {
        status: QueueSessionStatus.CLOSED,
        closedAt: new Date(),
      },
    });

    this.realtime.emit({
      eventType: 'QUEUE_CLOSED',
      clinicId: session.clinicId,
      sessionId: session.id,
    });

    await this.audit.log({
      organizationId: session.organizationId,
      clinicId: session.clinicId,
      actorUserId: user.id,
      action: 'QUEUE_CLOSED',
      resourceType: 'QUEUE_SESSION',
      resourceId: session.id,
      metadata: { force },
    });

    return updated;
  }

  private async validateSessionAccess(user: AuthenticatedUser, id: string) {
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.CLINIC_ADMIN &&
      user.role !== UserRole.DOCTOR &&
      user.role !== UserRole.RECEPTIONIST
    ) {
      throw new ForbiddenException('Not authorized to operate queue session');
    }

    const session = await this.prisma.clinicQueueSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`Queue session ${id} not found`);
    }

    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.organizationId &&
      session.organizationId !== user.organizationId
    ) {
      throw new ForbiddenException('Access denied to other organization queue session');
    }

    return session;
  }

  private validateSessionTransition(
    current: QueueSessionStatus,
    target: QueueSessionStatus,
  ) {
    const allowed = VALID_QUEUE_SESSION_TRANSITIONS[current] || [];
    if (!allowed.includes(target)) {
      throw new BadRequestException(
        `Invalid session transition from ${current} to ${target}`,
      );
    }
  }
}
