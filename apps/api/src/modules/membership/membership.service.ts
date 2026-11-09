import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import {
  CreateMembershipDto,
  UpdateMembershipDto,
} from '@matabai/validation';
import { UserRole, buildPaginationMeta } from '@matabai/shared';

@Injectable()
export class MembershipService {
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
  ) {
    const skip = (Math.max(1, page) - 1) * limit;
    const targetOrgId = organizationId || user.organizationId;

    if (!targetOrgId && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Organization context required to list memberships');
    }

    if (clinicId) {
      const [items, totalItems] = await Promise.all([
        this.prisma.clinicMembership.findMany({
          where: { clinicId },
          include: {
            userProfile: true,
            clinic: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.clinicMembership.count({ where: { clinicId } }),
      ]);

      return {
        items,
        meta: buildPaginationMeta(page, limit, totalItems),
      };
    }

    const where = targetOrgId ? { organizationId: targetOrgId } : {};
    const [items, totalItems] = await Promise.all([
      this.prisma.organizationMembership.findMany({
        where,
        include: {
          userProfile: true,
          organization: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organizationMembership.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(page, limit, totalItems),
    };
  }

  async create(dto: CreateMembershipDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.CLINIC_ADMIN) {
      throw new ForbiddenException('Only administrators can manage memberships');
    }

    // Resolve user profile
    let profileId = dto.userProfileId;
    if (!profileId && dto.email) {
      let profile = await this.prisma.userProfile.findUnique({
        where: { email: dto.email },
      });
      if (!profile) {
        profile = await this.prisma.userProfile.create({
          data: {
            authUserId: `invited-${Date.now()}`,
            email: dto.email,
            fullName: dto.email.split('@')[0] || 'Invited Member',
            status: 'PENDING',
          },
        });
      }
      profileId = profile.id;
    }

    if (!profileId) {
      throw new NotFoundException('Target user profile not found or email required');
    }

    if (dto.scope === 'organization') {
      const existing = await this.prisma.organizationMembership.findUnique({
        where: {
          organizationId_userProfileId: {
            organizationId: dto.scopeId,
            userProfileId: profileId,
          },
        },
      });

      if (existing) {
        throw new ConflictException('User is already a member of this organization');
      }

      const membership = await this.prisma.organizationMembership.create({
        data: {
          organizationId: dto.scopeId,
          userProfileId: profileId,
          role: dto.role,
          status: dto.status || 'ACTIVE',
        },
        include: { userProfile: true },
      });

      await this.audit.log({
        organizationId: dto.scopeId,
        actorUserId: user.id,
        action: 'MEMBERSHIP_CREATED',
        resourceType: 'OrganizationMembership',
        resourceId: membership.id,
        metadata: { role: dto.role, profileId },
      });

      return membership;
    } else {
      const existing = await this.prisma.clinicMembership.findUnique({
        where: {
          clinicId_userProfileId: {
            clinicId: dto.scopeId,
            userProfileId: profileId,
          },
        },
      });

      if (existing) {
        throw new ConflictException('User is already a member of this clinic');
      }

      const membership = await this.prisma.clinicMembership.create({
        data: {
          clinicId: dto.scopeId,
          userProfileId: profileId,
          role: dto.role,
          status: dto.status || 'ACTIVE',
        },
        include: { userProfile: true, clinic: true },
      });

      await this.audit.log({
        clinicId: dto.scopeId,
        actorUserId: user.id,
        action: 'MEMBERSHIP_CREATED',
        resourceType: 'ClinicMembership',
        resourceId: membership.id,
        metadata: { role: dto.role, profileId },
      });

      return membership;
    }
  }

  async update(id: string, dto: UpdateMembershipDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.CLINIC_ADMIN) {
      throw new ForbiddenException('Only administrators can update memberships');
    }

    // Try finding in organization memberships first
    const orgMembership = await this.prisma.organizationMembership.findUnique({
      where: { id },
    });

    if (orgMembership) {
      const updated = await this.prisma.organizationMembership.update({
        where: { id },
        data: {
          ...(dto.role && { role: dto.role }),
          ...(dto.status && { status: dto.status }),
        },
        include: { userProfile: true },
      });

      await this.audit.log({
        organizationId: updated.organizationId,
        actorUserId: user.id,
        action: 'MEMBERSHIP_UPDATED',
        resourceType: 'OrganizationMembership',
        resourceId: updated.id,
        metadata: dto as Record<string, unknown>,
      });

      return updated;
    }

    const clinicMembership = await this.prisma.clinicMembership.findUnique({
      where: { id },
    });

    if (clinicMembership) {
      const updated = await this.prisma.clinicMembership.update({
        where: { id },
        data: {
          ...(dto.role && { role: dto.role }),
          ...(dto.status && { status: dto.status }),
        },
        include: { userProfile: true },
      });

      await this.audit.log({
        clinicId: updated.clinicId,
        actorUserId: user.id,
        action: 'MEMBERSHIP_UPDATED',
        resourceType: 'ClinicMembership',
        resourceId: updated.id,
        metadata: dto as Record<string, unknown>,
      });

      return updated;
    }

    throw new NotFoundException(`Membership with ID ${id} not found`);
  }

  async remove(id: string, user: AuthenticatedUser) {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.CLINIC_ADMIN) {
      throw new ForbiddenException('Only administrators can delete memberships');
    }

    const orgMembership = await this.prisma.organizationMembership.findUnique({
      where: { id },
    });

    if (orgMembership) {
      await this.prisma.organizationMembership.delete({ where: { id } });
      await this.audit.log({
        organizationId: orgMembership.organizationId,
        actorUserId: user.id,
        action: 'MEMBERSHIP_DELETED',
        resourceType: 'OrganizationMembership',
        resourceId: id,
      });
      return { success: true, message: 'Membership removed' };
    }

    const clinicMembership = await this.prisma.clinicMembership.findUnique({
      where: { id },
    });

    if (clinicMembership) {
      await this.prisma.clinicMembership.delete({ where: { id } });
      await this.audit.log({
        clinicId: clinicMembership.clinicId,
        actorUserId: user.id,
        action: 'MEMBERSHIP_DELETED',
        resourceType: 'ClinicMembership',
        resourceId: id,
      });
      return { success: true, message: 'Membership removed' };
    }

    throw new NotFoundException(`Membership with ID ${id} not found`);
  }
}
