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
import { QueueSessionService } from './queue-session.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import {
  UserRole,
  QueueSessionStatus,
  QueueTokenStatus,
  TokenPriorityType,
  VALID_QUEUE_TOKEN_TRANSITIONS,
  AppointmentStatus,
} from '@matabai/shared';
import {
  AppointmentCheckInInput,
  WalkInCheckInInput,
  QueryQueueTokensInput,
} from '@matabai/validation';

@Injectable()
export class QueueTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: QueueRealtimeService,
    private readonly sessionService: QueueSessionService,
  ) {}

  /**
   * Patient Check-in with pre-existing Appointment
   */
  async checkInAppointment(user: AuthenticatedUser, dto: AppointmentCheckInInput) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: {
        clinic: true,
        doctor: true,
        patient: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment ${dto.appointmentId} not found`);
    }

    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.organizationId &&
      appointment.organizationId !== user.organizationId
    ) {
      throw new ForbiddenException('Access denied to appointment from another organization');
    }

    // Role check: If Patient, can only check in own appointment
    if (user.role === UserRole.PATIENT) {
      const patientProfile = await this.prisma.patient.findFirst({
        where: { userProfileId: user.id, id: appointment.patientId },
      });
      if (!patientProfile) {
        throw new ForbiddenException('You can only check in for your own appointment');
      }
    }

    // Verify appointment status
    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.NO_SHOW
    ) {
      throw new BadRequestException(
        `Cannot check in appointment with status ${appointment.status}`,
      );
    }

    // Verify appointment date matches today in clinic timezone
    const today = this.sessionService.getTodayInTimezone(appointment.clinic.timezone);
    if (appointment.appointmentDate !== today) {
      throw new BadRequestException(
        `Appointment is scheduled for ${appointment.appointmentDate}, not today (${today})`,
      );
    }

    // Check for duplicate active token for this appointment
    const existingActiveToken = await this.prisma.queueToken.findFirst({
      where: {
        appointmentId: appointment.id,
        status: {
          in: [QueueTokenStatus.WAITING, QueueTokenStatus.CALLED, QueueTokenStatus.SERVING],
        },
      },
    });

    if (existingActiveToken) {
      throw new ConflictException(
        `Appointment already has an active token: ${existingActiveToken.tokenDisplay}`,
      );
    }

    // Find or initialize today's session
    const session = await this.sessionService.getOrCreateTodaySession(
      appointment.clinicId,
      undefined,
      appointment.doctorId,
    );

    // Atomically create token
    return this.generateTokenAtomic({
      user,
      session,
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      priorityType: TokenPriorityType.NORMAL,
      notes: appointment.reasonForVisit || undefined,
    });
  }

  /**
   * Walk-in Patient Check-in
   */
  async checkInWalkIn(user: AuthenticatedUser, dto: WalkInCheckInInput) {
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.CLINIC_ADMIN &&
      user.role !== UserRole.RECEPTIONIST
    ) {
      throw new ForbiddenException('Only staff can check in walk-in patients');
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      include: { clinic: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }

    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.organizationId &&
      patient.organizationId !== user.organizationId
    ) {
      throw new ForbiddenException('Patient belongs to another organization');
    }

    // Find or get session
    const session = dto.queueSessionId
      ? await this.prisma.clinicQueueSession.findUnique({
          where: { id: dto.queueSessionId },
          include: { queueSettings: true, clinic: true },
        })
      : await this.sessionService.getOrCreateTodaySession(
          dto.clinicId,
          dto.queueSettingsId,
        );

    if (!session) {
      throw new NotFoundException('Could not resolve queue session for walk-in check-in');
    }

    // Verify walk-ins are allowed
    if (!session.queueSettings.allowWalkIns) {
      throw new BadRequestException('Walk-ins are disabled for this queue');
    }

    // Check for duplicate active token for this patient in this session
    const existingActiveToken = await this.prisma.queueToken.findFirst({
      where: {
        queueSessionId: session.id,
        patientId: patient.id,
        status: {
          in: [QueueTokenStatus.WAITING, QueueTokenStatus.CALLED, QueueTokenStatus.SERVING],
        },
      },
    });

    if (existingActiveToken) {
      throw new ConflictException(
        `Patient already has an active token in this queue: ${existingActiveToken.tokenDisplay}`,
      );
    }

    return this.generateTokenAtomic({
      user,
      session,
      patientId: patient.id,
      priorityType: (dto.priorityType as TokenPriorityType) || TokenPriorityType.NORMAL,
      notes: dto.notes,
    });
  }

  /**
   * Atomic Token Generator inside interactive transaction
   */
  private async generateTokenAtomic(params: {
    user: AuthenticatedUser;
    session: any;
    patientId: string;
    appointmentId?: string;
    priorityType: TokenPriorityType;
    notes?: string;
  }) {
    const { user, session, patientId, appointmentId, priorityType, notes } = params;

    return this.prisma.$transaction(async (tx) => {
      // Re-fetch session within transaction to get latest lastTokenNumber
      const currentSession = await tx.clinicQueueSession.findUnique({
        where: { id: session.id },
        include: { queueSettings: true },
      });

      if (!currentSession) {
        throw new NotFoundException(`Queue session ${session.id} not found`);
      }

      if (currentSession.status === QueueSessionStatus.CLOSED) {
        throw new BadRequestException('Queue session is closed for check-ins');
      }

      // Check capacity
      if (
        currentSession.queueSettings.maxQueueCapacity &&
        currentSession.totalRegistered >= currentSession.queueSettings.maxQueueCapacity
      ) {
        throw new BadRequestException('Queue maximum capacity has been reached for today');
      }

      const nextTokenNumber = currentSession.lastTokenNumber + 1;
      const prefix = currentSession.queueSettings.tokenPrefix || 'A';
      const tokenDisplay = `${prefix}${String(nextTokenNumber).padStart(3, '0')}`;

      // Calculate initial queue position: count of waiting tokens ahead + 1
      const waitingCount = await tx.queueToken.count({
        where: {
          queueSessionId: currentSession.id,
          status: QueueTokenStatus.WAITING,
        },
      });
      const initialPosition = waitingCount + 1;
      const estimatedWait =
        (initialPosition - 1) *
        currentSession.queueSettings.estimatedConsultationMinutes;

      // Create token
      const token = await tx.queueToken.create({
        data: {
          organizationId: currentSession.organizationId,
          clinicId: currentSession.clinicId,
          queueSessionId: currentSession.id,
          appointmentId: appointmentId || null,
          patientId,
          tokenNumber: nextTokenNumber,
          tokenDisplay,
          queuePosition: initialPosition,
          status: QueueTokenStatus.WAITING,
          priorityType,
          estimatedWaitMinutes: estimatedWait,
          notes: notes || null,
        },
        include: {
          patient: { select: { id: true, fullName: true, patientNumber: true, phone: true } },
          appointment: { select: { id: true, appointmentNumber: true, appointmentDate: true } },
          queueSession: {
            include: {
              queueSettings: true,
              doctor: { select: { id: true, fullName: true, specialty: true } },
            },
          },
        },
      });

      // Update session statistics
      await tx.clinicQueueSession.update({
        where: { id: currentSession.id },
        data: {
          lastTokenNumber: nextTokenNumber,
          totalRegistered: currentSession.totalRegistered + 1,
        },
      });

      // Initial status history
      await tx.queueStatusHistory.create({
        data: {
          organizationId: currentSession.organizationId,
          clinicId: currentSession.clinicId,
          queueTokenId: token.id,
          previousStatus: null,
          newStatus: QueueTokenStatus.WAITING,
          changedBy: user.id,
          changeReason: appointmentId ? 'Appointment Check-in' : 'Walk-in Registration',
        },
      });

      // Recalculate deterministic positions for the session
      await this.recalculateQueuePositionsTx(tx, currentSession.id, currentSession.queueSettings.estimatedConsultationMinutes);

      // Realtime event
      this.realtime.emit({
        eventType: 'TOKEN_CREATED',
        clinicId: currentSession.clinicId,
        sessionId: currentSession.id,
        tokenId: token.id,
        tokenDisplay: token.tokenDisplay,
        queuePosition: initialPosition,
      });

      // Audit log
      await this.audit.log({
        organizationId: currentSession.organizationId,
        clinicId: currentSession.clinicId,
        actorUserId: user.id,
        action: 'TOKEN_GENERATED',
        resourceType: 'QUEUE_TOKEN',
        resourceId: token.id,
        metadata: {
          tokenDisplay,
          tokenNumber: nextTokenNumber,
          priorityType,
          appointmentId,
        },
      });

      return token;
    });
  }

  /**
   * Find tokens in a session with filtering
   */
  async findAll(user: AuthenticatedUser, query: QueryQueueTokensInput) {
    if (user.role === UserRole.LAB_STAFF) {
      throw new ForbiddenException('Lab staff are not authorized to view queue tokens');
    }

    const { clinicId, queueSessionId, status, priorityType, search, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (user.role !== UserRole.SUPER_ADMIN && user.organizationId) {
      where.organizationId = user.organizationId;
    }

    if (clinicId) where.clinicId = clinicId;
    if (queueSessionId) where.queueSessionId = queueSessionId;
    if (status) where.status = status;
    if (priorityType) where.priorityType = priorityType;

    if (search) {
      where.OR = [
        { tokenDisplay: { contains: search, mode: 'insensitive' } },
        { patient: { fullName: { contains: search, mode: 'insensitive' } } },
        { patient: { patientNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, tokens] = await Promise.all([
      this.prisma.queueToken.count({ where }),
      this.prisma.queueToken.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { queuePosition: 'asc' },
          { tokenNumber: 'asc' },
        ],
        include: {
          patient: { select: { id: true, fullName: true, patientNumber: true, phone: true } },
          appointment: { select: { id: true, appointmentNumber: true, appointmentDate: true, startTime: true } },
          queueSession: {
            select: {
              id: true,
              sessionDate: true,
              status: true,
              queueSettings: { select: { queueName: true, tokenPrefix: true } },
              doctor: { select: { id: true, fullName: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: tokens,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find single token by ID
   */
  async findById(user: AuthenticatedUser, id: string) {
    const token = await this.prisma.queueToken.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, fullName: true, patientNumber: true, phone: true, userProfileId: true } },
        appointment: { select: { id: true, appointmentNumber: true, appointmentDate: true, startTime: true, endTime: true } },
        queueSession: {
          include: {
            clinic: { select: { id: true, name: true, timezone: true } },
            doctor: { select: { id: true, fullName: true, specialty: true } },
            queueSettings: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!token) {
      throw new NotFoundException(`Queue token ${id} not found`);
    }

    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.organizationId &&
      token.organizationId !== user.organizationId
    ) {
      throw new ForbiddenException('Access denied to token from another organization');
    }

    // Role check: If Patient, can only view own token
    if (user.role === UserRole.PATIENT && token.patient.userProfileId !== user.id) {
      throw new ForbiddenException('You can only view your own token');
    }

    return token;
  }

  /**
   * Call next patient in queue
   */
  async callNext(user: AuthenticatedUser, sessionId: string) {
    this.assertStaffOrDoctor(user);

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.clinicQueueSession.findUnique({
        where: { id: sessionId },
        include: { queueSettings: true },
      });

      if (!session) throw new NotFoundException(`Queue session ${sessionId} not found`);

      if (session.status !== QueueSessionStatus.ACTIVE) {
        throw new BadRequestException(
          `Cannot call next patient when queue session is ${session.status}`,
        );
      }

      // Find all WAITING tokens
      const waitingTokens = await tx.queueToken.findMany({
        where: {
          queueSessionId: sessionId,
          status: QueueTokenStatus.WAITING,
        },
      });

      if (waitingTokens.length === 0) {
        throw new BadRequestException('No patients are currently waiting in this queue');
      }

      // Deterministic ordering: PRIORITY first, then checkedInAt ASC, then tokenNumber ASC
      waitingTokens.sort((a, b) => {
        if (a.priorityType === TokenPriorityType.PRIORITY && b.priorityType !== TokenPriorityType.PRIORITY) return -1;
        if (a.priorityType !== TokenPriorityType.PRIORITY && b.priorityType === TokenPriorityType.PRIORITY) return 1;
        const timeDiff = new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        return a.tokenNumber - b.tokenNumber;
      });

      const nextToken = waitingTokens[0];
      if (!nextToken) {
        throw new BadRequestException('No patient available to call');
      }

      // If there is an existing CALLED token, transition it to SKIPPED to prevent multiple active patients
      const existingCalled = await tx.queueToken.findFirst({
        where: {
          queueSessionId: sessionId,
          status: QueueTokenStatus.CALLED,
        },
      });

      if (existingCalled) {
        await tx.queueToken.update({
          where: { id: existingCalled.id },
          data: {
            status: QueueTokenStatus.SKIPPED,
            skippedAt: new Date(),
            queuePosition: 0,
          },
        });
        await tx.queueStatusHistory.create({
          data: {
            organizationId: session.organizationId,
            clinicId: session.clinicId,
            queueTokenId: existingCalled.id,
            previousStatus: QueueTokenStatus.CALLED,
            newStatus: QueueTokenStatus.SKIPPED,
            changedBy: user.id,
            changeReason: 'Auto-skipped upon calling next patient',
          },
        });
      }

      // Update nextToken to CALLED
      const updated = await tx.queueToken.update({
        where: { id: nextToken.id },
        data: {
          status: QueueTokenStatus.CALLED,
          calledAt: new Date(),
          queuePosition: 0,
        },
        include: {
          patient: { select: { id: true, fullName: true, patientNumber: true } },
          queueSession: { select: { id: true, currentTokenNumber: true } },
        },
      });

      // Update session current token
      await tx.clinicQueueSession.update({
        where: { id: sessionId },
        data: { currentTokenNumber: nextToken.tokenNumber },
      });

      // Status history
      await tx.queueStatusHistory.create({
        data: {
          organizationId: session.organizationId,
          clinicId: session.clinicId,
          queueTokenId: nextToken.id,
          previousStatus: QueueTokenStatus.WAITING,
          newStatus: QueueTokenStatus.CALLED,
          changedBy: user.id,
          changeReason: 'Called by practitioner/reception',
        },
      });

      // Recalculate remaining positions
      await this.recalculateQueuePositionsTx(
        tx,
        sessionId,
        session.queueSettings.estimatedConsultationMinutes,
      );

      this.realtime.emit({
        eventType: 'TOKEN_CALLED',
        clinicId: session.clinicId,
        sessionId,
        tokenId: nextToken.id,
        tokenDisplay: nextToken.tokenDisplay,
      });

      await this.audit.log({
        organizationId: session.organizationId,
        clinicId: session.clinicId,
        actorUserId: user.id,
        action: 'TOKEN_CALLED',
        resourceType: 'QUEUE_TOKEN',
        resourceId: nextToken.id,
        metadata: { tokenDisplay: nextToken.tokenDisplay },
      });

      return updated;
    });
  }

  /**
   * Recall current patient
   */
  async recall(user: AuthenticatedUser, tokenId: string) {
    this.assertStaffOrDoctor(user);

    const token = await this.prisma.queueToken.findUnique({
      where: { id: tokenId },
    });

    if (!token) throw new NotFoundException(`Token ${tokenId} not found`);

    if (token.status !== QueueTokenStatus.CALLED) {
      throw new BadRequestException(`Cannot recall a token that is in status ${token.status}`);
    }

    const updated = await this.prisma.queueToken.update({
      where: { id: tokenId },
      data: { calledAt: new Date() },
    });

    this.realtime.emit({
      eventType: 'TOKEN_CALLED',
      clinicId: token.clinicId,
      sessionId: token.queueSessionId,
      tokenId: token.id,
      tokenDisplay: token.tokenDisplay,
    });

    await this.audit.log({
      organizationId: token.organizationId,
      clinicId: token.clinicId,
      actorUserId: user.id,
      action: 'TOKEN_RECALLED',
      resourceType: 'QUEUE_TOKEN',
      resourceId: token.id,
    });

    return updated;
  }

  /**
   * Start serving patient (CALLED -> SERVING)
   */
  async startServing(user: AuthenticatedUser, tokenId: string) {
    this.assertStaffOrDoctor(user);

    return this.transitionToken(user, tokenId, QueueTokenStatus.SERVING, 'Started consultation');
  }

  /**
   * Complete consultation (SERVING -> COMPLETED)
   */
  async complete(user: AuthenticatedUser, tokenId: string) {
    this.assertStaffOrDoctor(user);

    return this.prisma.$transaction(async (tx) => {
      const token = await tx.queueToken.findUnique({
        where: { id: tokenId },
        include: { queueSession: { include: { queueSettings: true } } },
      });

      if (!token) throw new NotFoundException(`Token ${tokenId} not found`);

      this.validateTransition(token.status as QueueTokenStatus, QueueTokenStatus.COMPLETED);

      const updated = await tx.queueToken.update({
        where: { id: tokenId },
        data: {
          status: QueueTokenStatus.COMPLETED,
          completedAt: new Date(),
          queuePosition: 0,
        },
      });

      // Update session totalCompleted
      await tx.clinicQueueSession.update({
        where: { id: token.queueSessionId },
        data: {
          totalCompleted: token.queueSession.totalCompleted + 1,
        },
      });

      // If associated with appointment, complete appointment
      if (token.appointmentId) {
        await tx.appointment.update({
          where: { id: token.appointmentId },
          data: { status: AppointmentStatus.COMPLETED },
        });
      }

      await tx.queueStatusHistory.create({
        data: {
          organizationId: token.organizationId,
          clinicId: token.clinicId,
          queueTokenId: token.id,
          previousStatus: token.status,
          newStatus: QueueTokenStatus.COMPLETED,
          changedBy: user.id,
          changeReason: 'Consultation completed',
        },
      });

      this.realtime.emit({
        eventType: 'CONSULTATION_COMPLETED',
        clinicId: token.clinicId,
        sessionId: token.queueSessionId,
        tokenId: token.id,
        tokenDisplay: token.tokenDisplay,
      });

      await this.audit.log({
        organizationId: token.organizationId,
        clinicId: token.clinicId,
        actorUserId: user.id,
        action: 'CONSULTATION_COMPLETED',
        resourceType: 'QUEUE_TOKEN',
        resourceId: token.id,
      });

      return updated;
    });
  }

  /**
   * Skip patient (WAITING or CALLED -> SKIPPED)
   */
  async skip(user: AuthenticatedUser, tokenId: string, reason?: string) {
    this.assertStaffOrDoctor(user);

    return this.transitionToken(
      user,
      tokenId,
      QueueTokenStatus.SKIPPED,
      reason || 'Patient skipped/absent at calling',
    );
  }

  /**
   * Restore skipped patient (SKIPPED -> WAITING)
   */
  async restore(user: AuthenticatedUser, tokenId: string) {
    this.assertStaffOrDoctor(user);

    return this.transitionToken(
      user,
      tokenId,
      QueueTokenStatus.WAITING,
      'Restored skipped patient back to active waiting queue',
    );
  }

  /**
   * Mark patient as No-Show (WAITING or CALLED -> NO_SHOW)
   */
  async noShow(user: AuthenticatedUser, tokenId: string, reason?: string) {
    this.assertStaffOrDoctor(user);

    return this.prisma.$transaction(async (tx) => {
      const token = await tx.queueToken.findUnique({ where: { id: tokenId } });
      if (!token) throw new NotFoundException(`Token ${tokenId} not found`);

      this.validateTransition(token.status as QueueTokenStatus, QueueTokenStatus.NO_SHOW);

      const updated = await tx.queueToken.update({
        where: { id: tokenId },
        data: {
          status: QueueTokenStatus.NO_SHOW,
          queuePosition: 0,
        },
      });

      if (token.appointmentId) {
        await tx.appointment.update({
          where: { id: token.appointmentId },
          data: { status: AppointmentStatus.NO_SHOW },
        });
      }

      await tx.queueStatusHistory.create({
        data: {
          organizationId: token.organizationId,
          clinicId: token.clinicId,
          queueTokenId: token.id,
          previousStatus: token.status,
          newStatus: QueueTokenStatus.NO_SHOW,
          changedBy: user.id,
          changeReason: reason || 'Marked no-show',
        },
      });

      const session = await tx.clinicQueueSession.findUnique({
        where: { id: token.queueSessionId },
        include: { queueSettings: true },
      });
      if (session) {
        await this.recalculateQueuePositionsTx(
          tx,
          session.id,
          session.queueSettings.estimatedConsultationMinutes,
        );
      }

      this.realtime.emit({
        eventType: 'TOKEN_CANCELLED',
        clinicId: token.clinicId,
        sessionId: token.queueSessionId,
        tokenId: token.id,
        tokenDisplay: token.tokenDisplay,
      });

      return updated;
    });
  }

  /**
   * Cancel token (WAITING or CALLED or SKIPPED -> CANCELLED)
   */
  async cancel(user: AuthenticatedUser, tokenId: string, reason?: string) {
    this.assertStaffOrDoctor(user);

    return this.transitionToken(
      user,
      tokenId,
      QueueTokenStatus.CANCELLED,
      reason || 'Token cancelled',
    );
  }

  /**
   * Change priority of token
   */
  async setPriority(
    user: AuthenticatedUser,
    tokenId: string,
    priorityType: TokenPriorityType,
    reason?: string,
  ) {
    this.assertStaffOrDoctor(user);

    return this.prisma.$transaction(async (tx) => {
      const token = await tx.queueToken.findUnique({
        where: { id: tokenId },
        include: { queueSession: { include: { queueSettings: true } } },
      });

      if (!token) throw new NotFoundException(`Token ${tokenId} not found`);

      const updated = await tx.queueToken.update({
        where: { id: tokenId },
        data: { priorityType },
      });

      await tx.queueStatusHistory.create({
        data: {
          organizationId: token.organizationId,
          clinicId: token.clinicId,
          queueTokenId: token.id,
          previousStatus: token.status,
          newStatus: token.status,
          changedBy: user.id,
          changeReason: `Priority changed to ${priorityType}${reason ? `: ${reason}` : ''}`,
        },
      });

      await this.recalculateQueuePositionsTx(
        tx,
        token.queueSessionId,
        token.queueSession.queueSettings.estimatedConsultationMinutes,
      );

      this.realtime.emit({
        eventType: 'QUEUE_POSITION_CHANGED',
        clinicId: token.clinicId,
        sessionId: token.queueSessionId,
        tokenId: token.id,
      });

      await this.audit.log({
        organizationId: token.organizationId,
        clinicId: token.clinicId,
        actorUserId: user.id,
        action: 'TOKEN_PRIORITY_CHANGED',
        resourceType: 'QUEUE_TOKEN',
        resourceId: token.id,
        metadata: { priorityType, reason },
      });

      return updated;
    });
  }

  /**
   * General state transition helper
   */
  private async transitionToken(
    user: AuthenticatedUser,
    tokenId: string,
    targetStatus: QueueTokenStatus,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const token = await tx.queueToken.findUnique({
        where: { id: tokenId },
        include: { queueSession: { include: { queueSettings: true } } },
      });

      if (!token) throw new NotFoundException(`Token ${tokenId} not found`);

      this.validateTransition(token.status as QueueTokenStatus, targetStatus);

      const updateData: any = { status: targetStatus };

      if (targetStatus === QueueTokenStatus.SERVING) {
        updateData.serviceStartedAt = new Date();
      } else if (targetStatus === QueueTokenStatus.SKIPPED) {
        updateData.skippedAt = new Date();
        updateData.queuePosition = 0;
      } else if (targetStatus === QueueTokenStatus.WAITING) {
        updateData.skippedAt = null;
      } else if (targetStatus === QueueTokenStatus.CANCELLED) {
        updateData.cancelledAt = new Date();
        updateData.queuePosition = 0;
      }

      const updated = await tx.queueToken.update({
        where: { id: tokenId },
        data: updateData,
      });

      await tx.queueStatusHistory.create({
        data: {
          organizationId: token.organizationId,
          clinicId: token.clinicId,
          queueTokenId: token.id,
          previousStatus: token.status,
          newStatus: targetStatus,
          changedBy: user.id,
          changeReason: reason || null,
        },
      });

      // Recalculate positions if position-affecting transition
      if (
        targetStatus === QueueTokenStatus.WAITING ||
        targetStatus === QueueTokenStatus.SKIPPED ||
        targetStatus === QueueTokenStatus.CANCELLED ||
        targetStatus === QueueTokenStatus.CALLED
      ) {
        await this.recalculateQueuePositionsTx(
          tx,
          token.queueSessionId,
          token.queueSession.queueSettings.estimatedConsultationMinutes,
        );
      }

      const eventMap: Record<QueueTokenStatus, any> = {
        [QueueTokenStatus.WAITING]: 'TOKEN_RESTORED',
        [QueueTokenStatus.CALLED]: 'TOKEN_CALLED',
        [QueueTokenStatus.SERVING]: 'PATIENT_SERVING',
        [QueueTokenStatus.COMPLETED]: 'CONSULTATION_COMPLETED',
        [QueueTokenStatus.SKIPPED]: 'TOKEN_SKIPPED',
        [QueueTokenStatus.CANCELLED]: 'TOKEN_CANCELLED',
        [QueueTokenStatus.NO_SHOW]: 'TOKEN_CANCELLED',
      };

      this.realtime.emit({
        eventType: eventMap[targetStatus],
        clinicId: token.clinicId,
        sessionId: token.queueSessionId,
        tokenId: token.id,
        tokenDisplay: token.tokenDisplay,
      });

      await this.audit.log({
        organizationId: token.organizationId,
        clinicId: token.clinicId,
        actorUserId: user.id,
        action: `TOKEN_${targetStatus}`,
        resourceType: 'QUEUE_TOKEN',
        resourceId: token.id,
        metadata: { reason },
      });

      return updated;
    });
  }

  /**
   * Recalculates deterministic queue positions for all WAITING tokens in a session
   */
  private async recalculateQueuePositionsTx(
    tx: any,
    queueSessionId: string,
    estimatedMinutes: number,
  ) {
    const waitingTokens = await tx.queueToken.findMany({
      where: {
        queueSessionId,
        status: QueueTokenStatus.WAITING,
      },
    });

    // Deterministic sort: PRIORITY first, then checkedInAt ASC, then tokenNumber ASC
    waitingTokens.sort((a: any, b: any) => {
      if (a.priorityType === TokenPriorityType.PRIORITY && b.priorityType !== TokenPriorityType.PRIORITY) return -1;
      if (a.priorityType !== TokenPriorityType.PRIORITY && b.priorityType === TokenPriorityType.PRIORITY) return 1;
      const timeDiff = new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.tokenNumber - b.tokenNumber;
    });

    // Update each token's position and estimated wait minutes
    for (let i = 0; i < waitingTokens.length; i++) {
      const t = waitingTokens[i];
      const position = i + 1;
      const waitTime = i * (estimatedMinutes || 15);

      if (t.queuePosition !== position || t.estimatedWaitMinutes !== waitTime) {
        await tx.queueToken.update({
          where: { id: t.id },
          data: {
            queuePosition: position,
            estimatedWaitMinutes: waitTime,
          },
        });
      }
    }
  }

  private validateTransition(current: QueueTokenStatus, target: QueueTokenStatus) {
    const allowed = VALID_QUEUE_TOKEN_TRANSITIONS[current] || [];
    if (!allowed.includes(target)) {
      throw new BadRequestException(
        `Invalid token transition from ${current} to ${target}`,
      );
    }
  }

  private assertStaffOrDoctor(user: AuthenticatedUser) {
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.CLINIC_ADMIN &&
      user.role !== UserRole.DOCTOR &&
      user.role !== UserRole.RECEPTIONIST
    ) {
      throw new ForbiddenException('Not authorized to perform queue operation');
    }
  }
}
