import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from '@matabai/validation';
import { UserRole, buildPaginationMeta } from '@matabai/shared';

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(user: AuthenticatedUser, page = 1, limit = 20) {
    const skip = (Math.max(1, page) - 1) * limit;

    const where =
      user.role === UserRole.SUPER_ADMIN
        ? {}
        : {
            memberships: {
              some: {
                userProfileId: user.id,
                status: 'ACTIVE',
              },
            },
          };

    const [items, totalItems] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(page, limit, totalItems),
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        clinics: true,
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Tenant check
    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: id,
          userProfileId: user.id,
          status: 'ACTIVE',
        },
      });

      if (!membership) {
        throw new ForbiddenException('Access denied to this organization');
      }
    }

    return org;
  }

  async create(dto: CreateOrganizationDto, user: AuthenticatedUser) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Organization slug '${dto.slug}' is already taken`);
    }

    const org = await this.prisma.$transaction(async (tx) => {
      const createdOrg = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          status: 'ACTIVE',
        },
      });

      // Automatically link creator as CLINIC_ADMIN
      await tx.organizationMembership.create({
        data: {
          organizationId: createdOrg.id,
          userProfileId: user.id,
          role: UserRole.CLINIC_ADMIN,
          status: 'ACTIVE',
        },
      });

      return createdOrg;
    });

    await this.audit.log({
      organizationId: org.id,
      actorUserId: user.id,
      action: 'ORGANIZATION_CREATED',
      resourceType: 'Organization',
      resourceId: org.id,
      metadata: { slug: org.slug, name: org.name },
    });

    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto, user: AuthenticatedUser) {
    await this.findOne(id, user);

    if (dto.slug) {
      const existing = await this.prisma.organization.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Organization slug '${dto.slug}' is already taken`);
      }
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.status && { status: dto.status }),
      },
    });

    await this.audit.log({
      organizationId: updated.id,
      actorUserId: user.id,
      action: 'ORGANIZATION_UPDATED',
      resourceType: 'Organization',
      resourceId: updated.id,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }
}
