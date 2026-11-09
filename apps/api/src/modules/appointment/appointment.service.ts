import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { SlotGenerationService } from './slot-generation.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import {
  UserRole,
  AppointmentStatus,
  VALID_APPOINTMENT_TRANSITIONS,
} from '@matabai/shared';
import {
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  UpdateAppointmentStatusDto,
  QueryAppointmentsDto,
} from '@matabai/validation';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly slotGen: SlotGenerationService,
  ) {}

  async findAll(user: AuthenticatedUser, query: QueryAppointmentsDto) {
    if (user.role === UserRole.LAB_STAFF) {
      throw new ForbiddenException('Lab staff are not authorized to view appointments');
    }

    const {
      page = 1,
      limit = 20,
      clinicId,
      doctorId,
      patientId,
      status,
      startDate,
      endDate,
      search,
      sortBy = 'appointmentDate',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    // Tenant isolation
    if (user.role !== UserRole.SUPER_ADMIN && user.organizationId) {
      where.organizationId = user.organizationId;
    }

    // Role-based visibility
    if (user.role === UserRole.PATIENT) {
      where.patient = { userProfileId: user.id };
    } else if (user.role === UserRole.DOCTOR) {
      // Find doctor linked to user
      const linkedDoc = await this.prisma.doctor.findFirst({
        where: { userProfileId: user.id },
      });
      if (linkedDoc) {
        where.doctorId = linkedDoc.id;
      }
    }

    if (clinicId) where.clinicId = clinicId;
    if (doctorId && user.role !== UserRole.DOCTOR) where.doctorId = doctorId;
    if (patientId && user.role !== UserRole.PATIENT) where.patientId = patientId;
    if (status && status !== 'ALL') where.status = status;

    if (startDate && endDate) {
      where.appointmentDate = { gte: startDate, lte: endDate };
    } else if (startDate) {
      where.appointmentDate = { gte: startDate };
    } else if (endDate) {
      where.appointmentDate = { lte: endDate };
    }

    if (search) {
      where.OR = [
        { appointmentNumber: { contains: search, mode: 'insensitive' } },
        { patient: { fullName: { contains: search, mode: 'insensitive' } } },
        { doctor: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ [sortBy]: sortOrder }, { startTime: 'asc' }],
        include: {
          clinic: { select: { id: true, name: true, slug: true, timezone: true } },
          doctor: { select: { id: true, fullName: true, specialty: true, consultationFee: true } },
          patient: {
            select: {
              id: true,
              patientNumber: true,
              fullName: true,
              phone: true,
              email: true,
              gender: true,
            },
          },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    if (user.role === UserRole.LAB_STAFF) {
      throw new ForbiddenException('Lab staff are not authorized to view appointments');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        clinic: true,
        doctor: true,
        patient: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');

    if (user.role !== UserRole.SUPER_ADMIN && appointment.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cross-tenant access forbidden');
    }

    if (user.role === UserRole.PATIENT && appointment.patient.userProfileId !== user.id) {
      throw new ForbiddenException('Patients may only view their own appointments');
    }

    return appointment;
  }

  async create(dto: CreateAppointmentDto, user: AuthenticatedUser) {
    if (user.role === UserRole.LAB_STAFF) {
      throw new ForbiddenException('Lab staff are not authorized to book appointments');
    }

    // Patient access validation
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) throw new NotFoundException('Patient record not found');

    if (user.role === UserRole.PATIENT) {
      if (patient.userProfileId !== user.id) {
        throw new ForbiddenException('Patients may only book appointments for themselves');
      }
    }

    const orgId = user.organizationId || patient.organizationId;
    if (user.role !== UserRole.SUPER_ADMIN && patient.organizationId !== orgId) {
      throw new ForbiddenException('Cross-tenant access forbidden');
    }

    // Verify clinic and doctor
    const [clinic, doctor] = await Promise.all([
      this.prisma.clinic.findUnique({ where: { id: dto.clinicId } }),
      this.prisma.doctor.findUnique({ where: { id: dto.doctorId } }),
    ]);

    if (!clinic || clinic.organizationId !== orgId || clinic.status !== 'ACTIVE') {
      throw new BadRequestException('Clinic is invalid or inactive');
    }
    if (!doctor || doctor.organizationId !== orgId || doctor.status !== 'ACTIVE') {
      throw new BadRequestException('Doctor is invalid or inactive');
    }

    // Verify doctor is associated with this clinic
    const isPrimary = doctor.clinicId === dto.clinicId;
    if (!isPrimary) {
      const assignment = await this.prisma.doctorClinicAssignment.findUnique({
        where: { doctorId_clinicId: { doctorId: dto.doctorId, clinicId: dto.clinicId } },
      });
      if (!assignment || assignment.status !== 'ACTIVE') {
        throw new BadRequestException('Doctor is not assigned to practice at this clinic');
      }
    }

    // Verify requested slot is available
    const availableSlots = await this.slotGen.generateSlots(
      dto.clinicId,
      dto.doctorId,
      dto.appointmentDate,
    );

    const slotExists = availableSlots.some(
      (s) => s.startTime === dto.startTime && s.endTime === dto.endTime,
    );
    if (!slotExists) {
      throw new BadRequestException('The requested time slot is not available for booking');
    }

    // Transactional creation with double-booking prevention check
    const appointment = await this.prisma.$transaction(async (tx) => {
      // Concurrency check for active conflicting appointment
      const conflict = await tx.appointment.findFirst({
        where: {
          doctorId: dto.doctorId,
          clinicId: dto.clinicId,
          appointmentDate: dto.appointmentDate,
          status: { not: 'CANCELLED' },
          OR: [
            { startTime: { lte: dto.startTime }, endTime: { gt: dto.startTime } },
            { startTime: { lt: dto.endTime }, endTime: { gte: dto.endTime } },
            { startTime: { gte: dto.startTime }, endTime: { lte: dto.endTime } },
          ],
        },
      });

      if (conflict) {
        throw new ConflictException(
          'The selected doctor slot was just booked by another user. Please choose an alternate slot.',
        );
      }

      // Generate sequential appointment number
      const year = new Date().getFullYear();
      const count = await tx.appointment.count({
        where: {
          organizationId: orgId,
          appointmentNumber: { startsWith: `APT-${year}-` },
        },
      });
      const appointmentNumber = `APT-${year}-${String(count + 1).padStart(4, '0')}`;

      const created = await tx.appointment.create({
        data: {
          organizationId: orgId,
          clinicId: dto.clinicId,
          doctorId: dto.doctorId,
          patientId: dto.patientId,
          appointmentNumber,
          appointmentDate: dto.appointmentDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          timezone: clinic.timezone || 'Asia/Karachi',
          status: 'CONFIRMED',
          bookingSource: dto.bookingSource || (user.role === UserRole.PATIENT ? 'PATIENT_PORTAL' : 'RECEPTIONIST'),
          reasonForVisit: dto.reasonForVisit || null,
          internalNotes: dto.internalNotes || null,
          createdBy: user.id,
        },
        include: {
          clinic: { select: { id: true, name: true, timezone: true } },
          doctor: { select: { id: true, fullName: true, specialty: true, consultationFee: true } },
          patient: { select: { id: true, patientNumber: true, fullName: true, phone: true } },
        },
      });

      // Record initial status history
      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: created.id,
          organizationId: orgId,
          clinicId: dto.clinicId,
          previousStatus: null,
          newStatus: 'CONFIRMED',
          changedBy: user.id,
          changeReason: 'Initial appointment booking confirmed',
        },
      });

      return created;
    });

    await this.audit.log({
      organizationId: orgId,
      clinicId: dto.clinicId,
      actorUserId: user.id,
      action: 'APPOINTMENT_CREATE',
      resourceType: 'appointments',
      resourceId: appointment.id,
      metadata: {
        appointmentNumber: appointment.appointmentNumber,
        date: appointment.appointmentDate,
        time: `${appointment.startTime}-${appointment.endTime}`,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
      },
    });

    return appointment;
  }

  async reschedule(id: string, dto: RescheduleAppointmentDto, user: AuthenticatedUser) {
    if (user.role === UserRole.LAB_STAFF) {
      throw new ForbiddenException('Lab staff are not authorized to reschedule appointments');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (user.role !== UserRole.SUPER_ADMIN && appointment.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cross-tenant access forbidden');
    }

    if (user.role === UserRole.PATIENT && appointment.patient.userProfileId !== user.id) {
      throw new ForbiddenException('Patients may only reschedule their own appointments');
    }

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) {
      throw new BadRequestException(
        `Cannot reschedule an appointment in "${appointment.status}" status`,
      );
    }

    // Verify new slot availability
    const availableSlots = await this.slotGen.generateSlots(
      appointment.clinicId,
      appointment.doctorId,
      dto.appointmentDate,
    );

    const slotExists = availableSlots.some(
      (s) => s.startTime === dto.startTime && s.endTime === dto.endTime,
    );
    if (!slotExists) {
      throw new BadRequestException('The requested destination slot is not available');
    }

    const previousStatus = appointment.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Concurrency check for destination slot
      const conflict = await tx.appointment.findFirst({
        where: {
          id: { not: id },
          doctorId: appointment.doctorId,
          clinicId: appointment.clinicId,
          appointmentDate: dto.appointmentDate,
          status: { not: 'CANCELLED' },
          OR: [
            { startTime: { lte: dto.startTime }, endTime: { gt: dto.startTime } },
            { startTime: { lt: dto.endTime }, endTime: { gte: dto.endTime } },
            { startTime: { gte: dto.startTime }, endTime: { lte: dto.endTime } },
          ],
        },
      });

      if (conflict) {
        throw new ConflictException(
          'The target destination slot was just booked by another user.',
        );
      }

      const res = await tx.appointment.update({
        where: { id },
        data: {
          appointmentDate: dto.appointmentDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          status: 'CONFIRMED',
          rescheduledFromId: id,
        },
        include: {
          clinic: { select: { id: true, name: true, timezone: true } },
          doctor: { select: { id: true, fullName: true, specialty: true } },
          patient: { select: { id: true, fullName: true, phone: true } },
        },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          organizationId: appointment.organizationId,
          clinicId: appointment.clinicId,
          previousStatus,
          newStatus: 'CONFIRMED',
          changedBy: user.id,
          changeReason: dto.reason || 'Appointment rescheduled by user',
        },
      });

      return res;
    });

    await this.audit.log({
      organizationId: appointment.organizationId,
      clinicId: appointment.clinicId,
      actorUserId: user.id,
      action: 'APPOINTMENT_RESCHEDULE',
      resourceType: 'appointments',
      resourceId: updated.id,
      metadata: {
        appointmentNumber: updated.appointmentNumber,
        newDate: dto.appointmentDate,
        newTime: `${dto.startTime}-${dto.endTime}`,
        reason: dto.reason,
      },
    });

    return updated;
  }

  async cancel(id: string, dto: CancelAppointmentDto, user: AuthenticatedUser) {
    if (user.role === UserRole.LAB_STAFF) {
      throw new ForbiddenException('Lab staff are not authorized to cancel appointments');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (user.role !== UserRole.SUPER_ADMIN && appointment.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cross-tenant access forbidden');
    }

    if (user.role === UserRole.PATIENT && appointment.patient.userProfileId !== user.id) {
      throw new ForbiddenException('Patients may only cancel their own appointments');
    }

    if (appointment.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel an already completed appointment');
    }
    if (appointment.status === 'CANCELLED') {
      throw new BadRequestException('Appointment is already cancelled');
    }

    const previousStatus = appointment.status;

    const cancelled = await this.prisma.$transaction(async (tx) => {
      const res = await tx.appointment.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancellationReason: dto.reason,
          cancelledBy: user.id,
        },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          organizationId: appointment.organizationId,
          clinicId: appointment.clinicId,
          previousStatus,
          newStatus: 'CANCELLED',
          changedBy: user.id,
          changeReason: dto.reason,
        },
      });

      return res;
    });

    await this.audit.log({
      organizationId: appointment.organizationId,
      clinicId: appointment.clinicId,
      actorUserId: user.id,
      action: 'APPOINTMENT_CANCEL',
      resourceType: 'appointments',
      resourceId: cancelled.id,
      metadata: {
        appointmentNumber: cancelled.appointmentNumber,
        reason: dto.reason,
      },
    });

    return {
      success: true,
      message: 'Appointment cancelled successfully. Slot has been released.',
      appointment: cancelled,
    };
  }

  async updateStatus(id: string, dto: UpdateAppointmentStatusDto, user: AuthenticatedUser) {
    if (user.role === UserRole.PATIENT || user.role === UserRole.LAB_STAFF) {
      throw new ForbiddenException('Patients and lab staff cannot perform generic status updates');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (user.role !== UserRole.SUPER_ADMIN && appointment.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cross-tenant access forbidden');
    }

    const currentStatus = appointment.status as AppointmentStatus;
    const targetStatus = dto.status as AppointmentStatus;

    const allowedNext = VALID_APPOINTMENT_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid status transition from "${currentStatus}" to "${targetStatus}". Allowed transitions: [${allowedNext.join(', ')}]`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.appointment.update({
        where: { id },
        data: {
          status: targetStatus,
          ...(targetStatus === 'CANCELLED' ? { cancelledBy: user.id, cancellationReason: dto.reason } : {}),
        },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          organizationId: appointment.organizationId,
          clinicId: appointment.clinicId,
          previousStatus: currentStatus,
          newStatus: targetStatus,
          changedBy: user.id,
          changeReason: dto.reason || `Status updated to ${targetStatus}`,
        },
      });

      return res;
    });

    await this.audit.log({
      organizationId: appointment.organizationId,
      clinicId: appointment.clinicId,
      actorUserId: user.id,
      action: 'APPOINTMENT_STATUS_UPDATE',
      resourceType: 'appointments',
      resourceId: updated.id,
      metadata: {
        appointmentNumber: updated.appointmentNumber,
        fromStatus: currentStatus,
        toStatus: targetStatus,
      },
    });

    return updated;
  }
}
