import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  CreateScheduleExceptionDto,
  UpdateScheduleExceptionDto,
} from '@matabai/validation';

@Injectable()
export class ScheduleExceptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private canManageSchedules(user: AuthenticatedUser): boolean {
    return user.role === UserRole.SUPER_ADMIN || user.role === UserRole.CLINIC_ADMIN;
  }

  async findAll(doctorId: string, user: AuthenticatedUser, clinicId?: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (user.role !== UserRole.SUPER_ADMIN && user.organizationId !== doctor.organizationId) {
      throw new ForbiddenException('Cross-tenant access forbidden');
    }

    return this.prisma.doctorScheduleException.findMany({
      where: {
        doctorId,
        organizationId: doctor.organizationId,
        ...(clinicId ? { clinicId } : {}),
      },
      orderBy: { exceptionDate: 'asc' },
      include: {
        clinic: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async create(doctorId: string, dto: CreateScheduleExceptionDto, user: AuthenticatedUser) {
    if (!this.canManageSchedules(user)) {
      throw new ForbiddenException('Only administrators can manage doctor schedule exceptions');
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const orgId = user.organizationId || doctor.organizationId;
    if (user.role !== UserRole.SUPER_ADMIN && doctor.organizationId !== orgId) {
      throw new ForbiddenException('Doctor does not belong to authorized organization');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });
    if (!clinic || clinic.organizationId !== orgId) {
      throw new BadRequestException('Clinic does not belong to authorized organization');
    }

    // Check unique conflict for doctor, clinic, date
    const existing = await this.prisma.doctorScheduleException.findUnique({
      where: {
        doctorId_clinicId_exceptionDate: {
          doctorId,
          clinicId: dto.clinicId,
          exceptionDate: dto.exceptionDate,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `A schedule exception already exists for this doctor on date ${dto.exceptionDate}`,
      );
    }

    const exception = await this.prisma.doctorScheduleException.create({
      data: {
        organizationId: orgId,
        clinicId: dto.clinicId,
        doctorId,
        exceptionDate: dto.exceptionDate,
        exceptionType: dto.exceptionType,
        startTime: dto.startTime || null,
        endTime: dto.endTime || null,
        reason: dto.reason || null,
      },
      include: {
        clinic: { select: { id: true, name: true } },
      },
    });

    await this.audit.log({
      organizationId: orgId,
      clinicId: dto.clinicId,
      actorUserId: user.id,
      action: 'DOCTOR_SCHEDULE_EXCEPTION_CREATE',
      resourceType: 'doctor_schedule_exceptions',
      resourceId: exception.id,
      metadata: { doctorId, date: dto.exceptionDate, type: dto.exceptionType, reason: dto.reason },
    });

    return exception;
  }

  async update(doctorId: string, id: string, dto: UpdateScheduleExceptionDto, user: AuthenticatedUser) {
    if (!this.canManageSchedules(user)) {
      throw new ForbiddenException('Only administrators can update doctor schedule exceptions');
    }

    const existing = await this.prisma.doctorScheduleException.findUnique({
      where: { id },
    });
    if (!existing || existing.doctorId !== doctorId) {
      throw new NotFoundException('Schedule exception not found');
    }

    if (user.role !== UserRole.SUPER_ADMIN && existing.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cross-tenant access forbidden');
    }

    const updated = await this.prisma.doctorScheduleException.update({
      where: { id },
      data: {
        exceptionType: dto.exceptionType ?? existing.exceptionType,
        startTime: dto.startTime !== undefined ? dto.startTime : existing.startTime,
        endTime: dto.endTime !== undefined ? dto.endTime : existing.endTime,
        reason: dto.reason !== undefined ? dto.reason : existing.reason,
      },
    });

    await this.audit.log({
      organizationId: existing.organizationId,
      clinicId: existing.clinicId,
      actorUserId: user.id,
      action: 'DOCTOR_SCHEDULE_EXCEPTION_UPDATE',
      resourceType: 'doctor_schedule_exceptions',
      resourceId: updated.id,
      metadata: { doctorId, changes: dto },
    });

    return updated;
  }

  async remove(doctorId: string, id: string, user: AuthenticatedUser) {
    if (!this.canManageSchedules(user)) {
      throw new ForbiddenException('Only administrators can remove doctor schedule exceptions');
    }

    const existing = await this.prisma.doctorScheduleException.findUnique({
      where: { id },
    });
    if (!existing || existing.doctorId !== doctorId) {
      throw new NotFoundException('Schedule exception not found');
    }

    if (user.role !== UserRole.SUPER_ADMIN && existing.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cross-tenant access forbidden');
    }

    await this.prisma.doctorScheduleException.delete({ where: { id } });

    await this.audit.log({
      organizationId: existing.organizationId,
      clinicId: existing.clinicId,
      actorUserId: user.id,
      action: 'DOCTOR_SCHEDULE_EXCEPTION_DELETE',
      resourceType: 'doctor_schedule_exceptions',
      resourceId: id,
      metadata: { doctorId, date: existing.exceptionDate },
    });

    return { success: true, message: 'Schedule exception removed successfully' };
  }
}

