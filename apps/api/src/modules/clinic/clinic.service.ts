import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { CreateClinicDto, UpdateClinicDto } from '@matabai/validation';
import { UserRole, buildPaginationMeta } from '@matabai/shared';

@Injectable()
export class ClinicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    user: AuthenticatedUser,
    organizationId?: string,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
  ) {
    const skip = (Math.max(1, page) - 1) * limit;
    const targetOrgId = organizationId || user.organizationId;

    if (!targetOrgId && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Organization context required to list clinics');
    }

    const where: any = {};
    if (targetOrgId) {
      where.organizationId = targetOrgId;
    }

    if (user.role !== UserRole.SUPER_ADMIN && targetOrgId) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: targetOrgId,
          userProfileId: user.id,
          status: 'ACTIVE',
        },
      });

      if (!membership) {
        throw new ForbiddenException('Access denied to clinics in this organization');
      }
    }

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { address: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (status && status.trim()) {
      where.status = status.trim();
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.clinic.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.clinic.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(page, limit, totalItems),
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${id} not found`);
    }

    // Tenant check
    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: clinic.organizationId,
          userProfileId: user.id,
          status: 'ACTIVE',
        },
      });

      if (!membership) {
        throw new ForbiddenException('Access denied to this clinic');
      }
    }

    return clinic;
  }

  async create(dto: CreateClinicDto, user: AuthenticatedUser) {
    // Validate that user is admin of target organization
    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: dto.organizationId,
          userProfileId: user.id,
          role: { in: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] },
          status: 'ACTIVE',
        },
      });

      if (!membership) {
        throw new ForbiddenException('Only organization admins can create clinics');
      }
    }

    // Check slug uniqueness within organization
    const existingSlug = await this.prisma.clinic.findUnique({
      where: {
        organizationId_slug: {
          organizationId: dto.organizationId,
          slug: dto.slug,
        },
      },
    });

    if (existingSlug) {
      throw new ConflictException(`Clinic with slug '${dto.slug}' already exists in this organization`);
    }

    const clinic = await this.prisma.clinic.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name,
        slug: dto.slug,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        timezone: dto.timezone || 'Asia/Karachi',
        status: dto.status || 'ACTIVE',
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      organizationId: dto.organizationId,
      clinicId: clinic.id,
      action: 'CLINIC_CREATE',
      resourceType: 'clinic',
      resourceId: clinic.id,
      metadata: { name: clinic.name, slug: clinic.slug },
    });

    return clinic;
  }

  async update(id: string, dto: UpdateClinicDto, user: AuthenticatedUser) {
    const clinic = await this.findOne(id, user);

    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: clinic.organizationId,
          userProfileId: user.id,
          role: { in: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] },
          status: 'ACTIVE',
        },
      });

      if (!membership) {
        throw new ForbiddenException('Only clinic administrators can update clinic details');
      }
    }

    if (dto.slug && dto.slug !== clinic.slug) {
      const existingSlug = await this.prisma.clinic.findUnique({
        where: {
          organizationId_slug: {
            organizationId: clinic.organizationId,
            slug: dto.slug,
          },
        },
      });

      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException(`Clinic with slug '${dto.slug}' already exists`);
      }
    }

    const updated = await this.prisma.clinic.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        timezone: dto.timezone,
        status: dto.status,
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      organizationId: clinic.organizationId,
      clinicId: id,
      action: 'CLINIC_UPDATE',
      resourceType: 'clinic',
      resourceId: id,
      metadata: { changes: dto },
    });

    return updated;
  }

  async updateStatus(id: string, status: string, user: AuthenticatedUser) {
    const clinic = await this.findOne(id, user);

    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: clinic.organizationId,
          userProfileId: user.id,
          role: { in: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] },
          status: 'ACTIVE',
        },
      });

      if (!membership) {
        throw new ForbiddenException('Only clinic administrators can change clinic operational status');
      }
    }

    const updated = await this.prisma.clinic.update({
      where: { id },
      data: { status },
    });

    await this.audit.log({
      actorUserId: user.id,
      organizationId: clinic.organizationId,
      clinicId: id,
      action: 'CLINIC_STATUS_UPDATE',
      resourceType: 'clinic',
      resourceId: id,
      metadata: { previousStatus: clinic.status, newStatus: status },
    });

    return updated;
  }
}
