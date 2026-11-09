import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { CreateStaffDto, UpdateStaffDto } from '@matabai/validation';
import { UserRole, buildPaginationMeta } from '@matabai/shared';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    user: AuthenticatedUser,
    organizationId?: string,
    clinicId?: string,
    page = 1,
    limit = 20,
    search?: string,
    designation?: string,
    department?: string,
    status?: string,
  ) {
    const skip = (Math.max(1, page) - 1) * limit;
    const targetOrgId = organizationId || user.organizationId;

    if (!targetOrgId && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Organization context required to list staff members');
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
        throw new ForbiddenException('Access denied to staff in this organization');
      }
    }

    if (search && search.trim()) {
      where.OR = [
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (designation && designation.trim()) {
      where.designation = designation.trim();
    }
    if (department && department.trim()) {
      where.department = { contains: department.trim(), mode: 'insensitive' };
    }
    if (status && status.trim()) {
      where.employmentStatus = status.trim();
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.staffMember.findMany({
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
      this.prisma.staffMember.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(page, limit, totalItems),
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const staff = await this.prisma.staffMember.findUnique({
      where: { id },
      include: {
        clinic: true,
        organization: true,
        userProfile: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    // Tenant check
    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: staff.organizationId,
          userProfileId: user.id,
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new ForbiddenException('Access denied to this staff record');
      }
    }

    return staff;
  }

  async create(dto: CreateStaffDto, user: AuthenticatedUser) {
    // Only SUPER_ADMIN and CLINIC_ADMIN can register staff members
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.CLINIC_ADMIN) {
      throw new ForbiddenException('Only administrators can register operational staff members');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${dto.clinicId} not found`);
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
        throw new ForbiddenException('Administrative membership in this organization is required');
      }
    }

    // Check duplicate staff email in clinic
    const existing = await this.prisma.staffMember.findFirst({
      where: {
        organizationId,
        email: dto.email,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Staff member with email '${dto.email}' is already registered in this organization`,
      );
    }

    const staff = await this.prisma.staffMember.create({
      data: {
        organizationId,
        clinicId: dto.clinicId,
        userProfileId: dto.userProfileId,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        designation: dto.designation,
        department: dto.department,
        employmentStatus: dto.employmentStatus || 'ACTIVE',
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
      action: 'STAFF_CREATE',
      resourceType: 'staff_member',
      resourceId: staff.id,
      metadata: { fullName: staff.fullName, designation: staff.designation },
    });

    return staff;
  }

  async update(id: string, dto: UpdateStaffDto, user: AuthenticatedUser) {
    const staff = await this.prisma.staffMember.findUnique({
      where: { id },
    });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    // Privilege check: prevent ordinary staff members from editing staff records
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.CLINIC_ADMIN) {
      throw new ForbiddenException('Only administrators can update staff profiles');
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: staff.organizationId,
          userProfileId: user.id,
          role: { in: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] },
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new ForbiddenException('Access denied to update staff in this organization');
      }
    }

    const updated = await this.prisma.staffMember.update({
      where: { id },
      data: {
        clinicId: dto.clinicId,
        userProfileId: dto.userProfileId,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        designation: dto.designation,
        department: dto.department,
        employmentStatus: dto.employmentStatus,
      },
      include: {
        clinic: {
          select: { id: true, name: true },
        },
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      organizationId: staff.organizationId,
      clinicId: updated.clinicId,
      action: 'STAFF_UPDATE',
      resourceType: 'staff_member',
      resourceId: id,
      metadata: { changes: dto },
    });

    return updated;
  }

  async updateStatus(id: string, status: string, user: AuthenticatedUser) {
    const staff = await this.prisma.staffMember.findUnique({
      where: { id },
    });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.CLINIC_ADMIN) {
      throw new ForbiddenException('Only administrators can update staff status');
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: staff.organizationId,
          userProfileId: user.id,
          role: { in: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] },
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new ForbiddenException('Access denied to manage staff status');
      }
    }

    const updated = await this.prisma.staffMember.update({
      where: { id },
      data: { employmentStatus: status },
    });

    await this.audit.log({
      actorUserId: user.id,
      organizationId: staff.organizationId,
      clinicId: staff.clinicId,
      action: 'STAFF_STATUS_UPDATE',
      resourceType: 'staff_member',
      resourceId: id,
      metadata: { previousStatus: staff.employmentStatus, newStatus: status },
    });

    return updated;
  }
}

