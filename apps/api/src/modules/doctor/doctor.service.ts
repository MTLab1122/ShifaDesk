import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { CreateDoctorDto, UpdateDoctorDto } from '@matabai/validation';
import { UserRole, buildPaginationMeta } from '@matabai/shared';

@Injectable()
export class DoctorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private canViewRegistrationNumber(role: UserRole): boolean {
    return role === UserRole.SUPER_ADMIN || role === UserRole.CLINIC_ADMIN;
  }

  private sanitizeDoctor(doctor: any, userRole: UserRole) {
    if (!this.canViewRegistrationNumber(userRole)) {
      const { registrationNumber: _reg, ...sanitized } = doctor;
      return { ...sanitized, registrationNumber: '***RESTRICTED***' };
    }
    return doctor;
  }

  async findAll(
    user: AuthenticatedUser,
    organizationId?: string,
    clinicId?: string,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
    specialty?: string,
  ) {
    const skip = (Math.max(1, page) - 1) * limit;
    const targetOrgId = organizationId || user.organizationId;

    if (!targetOrgId && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Organization context required to list doctors');
    }

    const where: any = {};
    if (targetOrgId) {
      where.organizationId = targetOrgId;
    }
    if (clinicId) {
      where.clinicId = clinicId;
    }

    // Tenant check
    if (user.role !== UserRole.SUPER_ADMIN && targetOrgId) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: targetOrgId,
          userProfileId: user.id,
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new ForbiddenException('Access denied to doctors in this organization');
      }
    }

    if (search && search.trim()) {
      where.OR = [
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
        { specialty: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (status && status.trim()) {
      where.status = status.trim();
    }
    if (specialty && specialty.trim()) {
      where.specialty = { contains: specialty.trim(), mode: 'insensitive' };
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.doctor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          clinic: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.doctor.count({ where }),
    ]);

    const sanitizedItems = items.map((doc) => this.sanitizeDoctor(doc, user.role));

    return {
      items: sanitizedItems,
      meta: buildPaginationMeta(page, limit, totalItems),
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        clinic: true,
        organization: true,
        userProfile: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    // Tenant check
    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: doctor.organizationId,
          userProfileId: user.id,
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new ForbiddenException('Access denied to this doctor record');
      }
    }

    return this.sanitizeDoctor(doctor, user.role);
  }

  async create(dto: CreateDoctorDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.CLINIC_ADMIN) {
      throw new ForbiddenException('Only clinic administrators can register doctors');
    }

    // Find clinic and ensure it belongs to an organization the user can manage
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });

    if (!clinic) {
      throw new NotFoundException(`Target clinic with ID ${dto.clinicId} not found`);
    }

    const organizationId = dto.organizationId || clinic.organizationId;

    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId,
          userProfileId: user.id,
          role: { in: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] },
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new ForbiddenException('Only clinic administrators can register doctors');
      }
    }

    // Check duplicate registration number within the clinic/organization
    const existingDoctor = await this.prisma.doctor.findFirst({
      where: {
        organizationId,
        registrationNumber: dto.registrationNumber,
      },
    });

    if (existingDoctor) {
      throw new ConflictException(
        `Doctor with registration number '${dto.registrationNumber}' is already registered in this organization`,
      );
    }

    const doctor = await this.prisma.doctor.create({
      data: {
        organizationId,
        clinicId: dto.clinicId,
        userProfileId: dto.userProfileId,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        specialty: dto.specialty,
        qualification: dto.qualification,
        registrationNumber: dto.registrationNumber,
        consultationFee: dto.consultationFee ?? 0,
        biography: dto.biography,
        profileImageUrl: dto.profileImageUrl,
        status: dto.status || 'ACTIVE',
      },
      include: {
        clinic: {
          select: { id: true, name: true },
        },
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      organizationId,
      clinicId: dto.clinicId,
      action: 'DOCTOR_CREATE',
      resourceType: 'doctor',
      resourceId: doctor.id,
      metadata: { fullName: doctor.fullName, specialty: doctor.specialty },
    });

    return doctor;
  }

  async update(id: string, dto: UpdateDoctorDto, user: AuthenticatedUser) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: doctor.organizationId,
          userProfileId: user.id,
          role: { in: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] },
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new ForbiddenException('Only clinic administrators can update doctor details');
      }
    }

    if (dto.registrationNumber && dto.registrationNumber !== doctor.registrationNumber) {
      const duplicate = await this.prisma.doctor.findFirst({
        where: {
          organizationId: doctor.organizationId,
          registrationNumber: dto.registrationNumber,
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException(
          `Doctor with registration number '${dto.registrationNumber}' already exists`,
        );
      }
    }

    const updated = await this.prisma.doctor.update({
      where: { id },
      data: {
        clinicId: dto.clinicId,
        userProfileId: dto.userProfileId,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        specialty: dto.specialty,
        qualification: dto.qualification,
        registrationNumber: dto.registrationNumber,
        consultationFee: dto.consultationFee,
        biography: dto.biography,
        profileImageUrl: dto.profileImageUrl,
        status: dto.status,
      },
      include: {
        clinic: {
          select: { id: true, name: true },
        },
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      organizationId: doctor.organizationId,
      clinicId: updated.clinicId,
      action: 'DOCTOR_UPDATE',
      resourceType: 'doctor',
      resourceId: id,
      metadata: { changes: dto },
    });

    return updated;
  }

  async updateStatus(id: string, status: string, user: AuthenticatedUser) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: doctor.organizationId,
          userProfileId: user.id,
          role: { in: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] },
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new ForbiddenException('Only clinic administrators can update doctor status');
      }
    }

    const updated = await this.prisma.doctor.update({
      where: { id },
      data: { status },
    });

    await this.audit.log({
      actorUserId: user.id,
      organizationId: doctor.organizationId,
      clinicId: doctor.clinicId,
      action: 'DOCTOR_STATUS_UPDATE',
      resourceType: 'doctor',
      resourceId: id,
      metadata: { previousStatus: doctor.status, newStatus: status },
    });

    return updated;
  }
}
