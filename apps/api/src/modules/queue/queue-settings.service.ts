import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import { CreateQueueSettingsInput, UpdateQueueSettingsInput } from '@matabai/validation';
import { randomUUID } from 'crypto';

@Injectable()
export class QueueSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(user: AuthenticatedUser, clinicId?: string) {
    if (user.role === UserRole.LAB_STAFF) {
      throw new ForbiddenException('Lab staff are not authorized to view queue settings');
    }

    const where: any = { isActive: true };

    if (user.role !== UserRole.SUPER_ADMIN && user.organizationId) {
      where.organizationId = user.organizationId;
    }

    if (clinicId) {
      where.clinicId = clinicId;
    }

    let settings = await this.prisma.clinicQueueSettings.findMany({
      where,
      include: {
        clinic: { select: { id: true, name: true, timezone: true } },
        doctor: { select: { id: true, fullName: true, specialty: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Auto-initialize default setting for clinic if requested and none exists
    if (clinicId && settings.length === 0) {
      const defaultSetting = await this.getOrCreateDefault(clinicId, user.organizationId || '');
      if (defaultSetting) {
        settings = [defaultSetting as any];
      }
    }

    return settings;
  }

  async findById(user: AuthenticatedUser, id: string) {
    const setting = await this.prisma.clinicQueueSettings.findUnique({
      where: { id },
      include: {
        clinic: { select: { id: true, name: true, timezone: true } },
        doctor: { select: { id: true, fullName: true, specialty: true } },
      },
    });

    if (!setting) {
      throw new NotFoundException(`Queue settings with ID ${id} not found`);
    }

    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.organizationId &&
      setting.organizationId !== user.organizationId
    ) {
      throw new ForbiddenException('Access denied to other organization queue settings');
    }

    return setting;
  }

  async create(user: AuthenticatedUser, dto: CreateQueueSettingsInput) {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.CLINIC_ADMIN) {
      throw new ForbiddenException('Only administrators can configure queue settings');
    }

    // Verify clinic exists and belongs to organization
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic ${dto.clinicId} not found`);
    }

    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.organizationId &&
      clinic.organizationId !== user.organizationId
    ) {
      throw new ForbiddenException('Cannot configure queue for a clinic outside your organization');
    }

    // Verify doctor if provided
    if (dto.doctorId) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: dto.doctorId },
      });
      if (!doctor || doctor.clinicId !== dto.clinicId) {
        throw new BadRequestException('Doctor does not belong to the selected clinic');
      }
    }

    const setting = await this.prisma.clinicQueueSettings.create({
      data: {
        organizationId: clinic.organizationId,
        clinicId: dto.clinicId,
        doctorId: dto.doctorId || null,
        queueName: dto.queueName,
        tokenPrefix: dto.tokenPrefix.toUpperCase(),
        tokenResetPolicy: dto.tokenResetPolicy || 'DAILY',
        allowWalkIns: dto.allowWalkIns ?? true,
        allowAppointmentCheckIn: dto.allowAppointmentCheckIn ?? true,
        estimatedConsultationMinutes: dto.estimatedConsultationMinutes || 15,
        maxQueueCapacity: dto.maxQueueCapacity || null,
        publicQueueId: randomUUID(),
        isPublicDisplayEnabled: dto.isPublicDisplayEnabled ?? true,
      },
      include: {
        clinic: { select: { id: true, name: true, timezone: true } },
        doctor: { select: { id: true, fullName: true, specialty: true } },
      },
    });

    await this.audit.log({
      organizationId: setting.organizationId,
      clinicId: setting.clinicId,
      actorUserId: user.id,
      action: 'QUEUE_SETTINGS_CREATED',
      resourceType: 'QUEUE_SETTINGS',
      resourceId: setting.id,
      metadata: { queueName: setting.queueName, tokenPrefix: setting.tokenPrefix },
    });

    return setting;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateQueueSettingsInput) {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.CLINIC_ADMIN) {
      throw new ForbiddenException('Only administrators can modify queue settings');
    }

    const existing = await this.findById(user, id);

    const updated = await this.prisma.clinicQueueSettings.update({
      where: { id },
      data: {
        queueName: dto.queueName ?? existing.queueName,
        tokenPrefix: dto.tokenPrefix ? dto.tokenPrefix.toUpperCase() : existing.tokenPrefix,
        allowWalkIns: dto.allowWalkIns ?? existing.allowWalkIns,
        allowAppointmentCheckIn: dto.allowAppointmentCheckIn ?? existing.allowAppointmentCheckIn,
        estimatedConsultationMinutes:
          dto.estimatedConsultationMinutes ?? existing.estimatedConsultationMinutes,
        maxQueueCapacity:
          dto.maxQueueCapacity !== undefined ? dto.maxQueueCapacity : existing.maxQueueCapacity,
        isPublicDisplayEnabled:
          dto.isPublicDisplayEnabled ?? existing.isPublicDisplayEnabled,
        isActive: dto.isActive ?? existing.isActive,
      },
      include: {
        clinic: { select: { id: true, name: true, timezone: true } },
        doctor: { select: { id: true, fullName: true, specialty: true } },
      },
    });

    await this.audit.log({
      organizationId: updated.organizationId,
      clinicId: updated.clinicId,
      actorUserId: user.id,
      action: 'QUEUE_SETTINGS_UPDATED',
      resourceType: 'QUEUE_SETTINGS',
      resourceId: updated.id,
      metadata: { dto },
    });

    return updated;
  }

  async regeneratePublicKey(user: AuthenticatedUser, id: string) {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.CLINIC_ADMIN) {
      throw new ForbiddenException('Only administrators can regenerate public display keys');
    }

    await this.findById(user, id);

    const newPublicQueueId = randomUUID();

    const updated = await this.prisma.clinicQueueSettings.update({
      where: { id },
      data: { publicQueueId: newPublicQueueId },
    });

    await this.audit.log({
      organizationId: updated.organizationId,
      clinicId: updated.clinicId,
      actorUserId: user.id,
      action: 'QUEUE_PUBLIC_KEY_REGENERATED',
      resourceType: 'QUEUE_SETTINGS',
      resourceId: updated.id,
      metadata: { newPublicQueueId },
    });

    return { publicQueueId: newPublicQueueId };
  }

  async getOrCreateDefault(clinicId: string, organizationId: string) {
    const existing = await this.prisma.clinicQueueSettings.findFirst({
      where: { clinicId, isActive: true },
    });

    if (existing) return existing;

    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) return null;

    return this.prisma.clinicQueueSettings.create({
      data: {
        organizationId: clinic.organizationId || organizationId,
        clinicId,
        queueName: 'Main OPD Queue',
        tokenPrefix: 'A',
        tokenResetPolicy: 'DAILY',
        allowWalkIns: true,
        allowAppointmentCheckIn: true,
        estimatedConsultationMinutes: 15,
        publicQueueId: randomUUID(),
        isPublicDisplayEnabled: true,
      },
      include: {
        clinic: { select: { id: true, name: true, timezone: true } },
        doctor: { select: { id: true, fullName: true, specialty: true } },
      },
    });
  }
}
