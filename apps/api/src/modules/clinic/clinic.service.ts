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

  async findAll(user: AuthenticatedUser, organizationId?: string, page = 1, limit = 20) {
    const skip = (Math.max(1, page) - 1) * limit;

    const targetOrgId = organizationId || user.organizationId;

    if (!targetOrgId && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Organization context required to list clinics');
    }

    const where: any = {};
    if (targetOrgId) {
      where.organizationId = targetOrgId;
    }

    // Non-super admins can only see clinics if they belong to the organization
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
    // Validate that user is admin of the target organization
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
        throw new ForbiddenException(
          'Only organization administrators can create clinics',
        );
      }
    }

    const existing = await this.prisma.clinic.findUnique({
      where: {
        organizationId_slug: {
          organizationId: dto.organizationId,
          slug: dto.slug,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Clinic with slug '${dto.slug}' already exists in this organization`,
      );
    }

    const clinic = await this.prisma.$transaction(async (tx) => {
      const createdClinic = await tx.clinic.create({
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

      // Link creator to clinic membership as CLINIC_ADMIN
      await tx.clinicMembership.create({
        data: {
          clinicId: createdClinic.id,
          userProfileId: user.id,
          role: UserRole.CLINIC_ADMIN,
          status: 'ACTIVE',
        },
      });

      return createdClinic;
    });

    await this.audit.log({
      organizationId: clinic.organizationId,
      clinicId: clinic.id,
      actorUserId: user.id,
      action: 'CLINIC_CREATED',
      resourceType: 'Clinic',
      resourceId: clinic.id,
      metadata: { slug: clinic.slug, name: clinic.name },
    });

    return clinic;
  }

  async update(id: string, dto: UpdateClinicDto, user: AuthenticatedUser) {
    const clinic = await this.findOne(id, user);

    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.CLINIC_ADMIN) {
      throw new ForbiddenException('Only administrators can update clinic details');
    }

    if (dto.slug && dto.slug !== clinic.slug) {
      const existing = await this.prisma.clinic.findUnique({
        where: {
          organizationId_slug: {
            organizationId: clinic.organizationId,
            slug: dto.slug,
          },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Clinic with slug '${dto.slug}' already exists in this organization`,
        );
      }
    }

    const updated = await this.prisma.clinic.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.timezone && { timezone: dto.timezone }),
        ...(dto.status && { status: dto.status }),
      },
    });

    await this.audit.log({
      organizationId: updated.organizationId,
      clinicId: updated.id,
      actorUserId: user.id,
      action: 'CLINIC_UPDATED',
      resourceType: 'Clinic',
      resourceId: updated.id,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }
}
