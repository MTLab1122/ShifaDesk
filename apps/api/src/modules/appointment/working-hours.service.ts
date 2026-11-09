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
  CreateWorkingHoursDto,
  UpdateWorkingHoursDto,
} from '@matabai/validation';

@Injectable()
export class WorkingHoursService {
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

    return this.prisma.doctorWorkingHours.findMany({
      where: {
        doctorId,
        organizationId: doctor.organizationId,
        ...(clinicId ? { clinicId } : {}),
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: {
        clinic: { select: { id: true, name: true, slug: true, timezone: true } },
      },
    });
  }

  async create(doctorId: string, dto: CreateWorkingHoursDto, user: AuthenticatedUser) {
    if (!this.canManageSchedules(user)) {
      throw new ForbiddenException('Only administrators can manage doctor working hours');
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const orgId = user.organizationId || doctor.organizationId;
    if (user.role !== UserRole.SUPER_ADMIN && doctor.organizationId !== orgId) {
      throw new ForbiddenException('Doctor does not belong to authorized organization');
    }

    // Verify clinic belongs to organization
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });
    if (!clinic || clinic.organizationId !== orgId) {
      throw new BadRequestException('Clinic does not belong to this organization');
    }

    // Check for overlapping working periods for the same doctor, clinic, and dayOfWeek
    const existing = await this.prisma.doctorWorkingHours.findMany({
      where: {
        doctorId,
        clinicId: dto.clinicId,
        dayOfWeek: dto.dayOfWeek,
        isActive: true,
      },
    });

    const [newStartH, newStartM] = dto.startTime.split(':').map(Number);
    const [newEndH, newEndM] = dto.endTime.split(':').map(Number);
    const newStart = (newStartH ?? 0) * 60 + (newStartM ?? 0);
    const newEnd = (newEndH ?? 0) * 60 + (newEndM ?? 0);

    for (const item of existing) {
      const [curStartH, curStartM] = item.startTime.split(':').map(Number);
      const [curEndH, curEndM] = item.endTime.split(':').map(Number);
      const curStart = (curStartH ?? 0) * 60 + (curStartM ?? 0);
      const curEnd = (curEndH ?? 0) * 60 + (curEndM ?? 0);

      // Overlap condition: not strictly before and not strictly after
      if (!(newEnd <= curStart || newStart >= curEnd)) {
        throw new ConflictException(
          `Overlapping working period exists on day ${dto.dayOfWeek} (${item.startTime} - ${item.endTime})`,
        );
      }
    }

    const record = await this.prisma.doctorWorkingHours.create({
      data: {
        organizationId: orgId,
        clinicId: dto.clinicId,
        doctorId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        slotDurationMinutes: dto.slotDurationMinutes || 20,
        breakStartTime: dto.breakStartTime || null,
        breakEndTime: dto.breakEndTime || null,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
        isActive: dto.isActive ?? true,
      },
      include: {
        clinic: { select: { id: true, name: true, timezone: true } },
      },
    });

    await this.audit.log({
      organizationId: orgId,
      clinicId: dto.clinicId,
      actorUserId: user.id,
      action: 'DOCTOR_WORKING_HOURS_CREATE',
      resourceType: 'doctor_working_hours',
      resourceId: record.id,
      metadata: { doctorId, dayOfWeek: dto.dayOfWeek, startTime: dto.startTime, endTime: dto.endTime },
    });

    return record;
  }

  async update(doctorId: string, id: string, dto: UpdateWorkingHoursDto, user: AuthenticatedUser) {
    if (!this.canManageSchedules(user)) {
      throw new ForbiddenException('Only administrators can update doctor working hours');
    }

    const existing = await this.prisma.doctorWorkingHours.findUnique({
      where: { id },
    });
    if (!existing || existing.doctorId !== doctorId) {
      throw new NotFoundException('Working hours record not found');
    }

    if (user.role !== UserRole.SUPER_ADMIN && existing.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cross-tenant access forbidden');
    }

    const updated = await this.prisma.doctorWorkingHours.update({
      where: { id },
      data: {
        dayOfWeek: dto.dayOfWeek ?? existing.dayOfWeek,
        startTime: dto.startTime ?? existing.startTime,
        endTime: dto.endTime ?? existing.endTime,
        slotDurationMinutes: dto.slotDurationMinutes ?? existing.slotDurationMinutes,
        breakStartTime: dto.breakStartTime !== undefined ? dto.breakStartTime : existing.breakStartTime,
        breakEndTime: dto.breakEndTime !== undefined ? dto.breakEndTime : existing.breakEndTime,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : existing.effectiveFrom,
        effectiveUntil: dto.effectiveUntil !== undefined ? (dto.effectiveUntil ? new Date(dto.effectiveUntil) : null) : existing.effectiveUntil,
        isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
      },
    });

    await this.audit.log({
      organizationId: existing.organizationId,
      clinicId: existing.clinicId,
      actorUserId: user.id,
      action: 'DOCTOR_WORKING_HOURS_UPDATE',
      resourceType: 'doctor_working_hours',
      resourceId: updated.id,
      metadata: { doctorId, changes: dto },
    });

    return updated;
  }

  async remove(doctorId: string, id: string, user: AuthenticatedUser) {
    if (!this.canManageSchedules(user)) {
      throw new ForbiddenException('Only administrators can remove doctor working hours');
    }

    const existing = await this.prisma.doctorWorkingHours.findUnique({
      where: { id },
    });
    if (!existing || existing.doctorId !== doctorId) {
      throw new NotFoundException('Working hours record not found');
    }

    if (user.role !== UserRole.SUPER_ADMIN && existing.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cross-tenant access forbidden');
    }

    await this.prisma.doctorWorkingHours.delete({ where: { id } });

    await this.audit.log({
      organizationId: existing.organizationId,
      clinicId: existing.clinicId,
      actorUserId: user.id,
      action: 'DOCTOR_WORKING_HOURS_DELETE',
      resourceType: 'doctor_working_hours',
      resourceId: id,
      metadata: { doctorId },
    });

    return { success: true, message: 'Working hours deleted successfully' };
  }
}
