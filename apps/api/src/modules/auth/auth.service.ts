import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { AuthMeResponse, SessionValidationResponse } from '@matabai/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMe(user: AuthenticatedUser): Promise<AuthMeResponse> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { id: user.id },
      include: {
        organizationMemberships: {
          include: { organization: true },
        },
        clinicMemberships: {
          include: { clinic: true },
        },
      },
    });

    if (!profile) {
      throw new Error('User profile not found');
    }

    return {
      user: {
        id: profile.id,
        authUserId: profile.authUserId,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        avatarUrl: profile.avatarUrl,
        status: profile.status as any,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      organizationMemberships: profile.organizationMemberships.map((om) => ({
        id: om.id,
        organizationId: om.organizationId,
        userProfileId: om.userProfileId,
        role: om.role as any,
        status: om.status as any,
        createdAt: om.createdAt?.toISOString ? om.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: om.updatedAt?.toISOString ? om.updatedAt.toISOString() : new Date().toISOString(),
        organization: {
          id: om.organization.id,
          name: om.organization.name,
          slug: om.organization.slug,
          status: om.organization.status as any,
          createdAt: om.organization.createdAt?.toISOString ? om.organization.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: om.organization.updatedAt?.toISOString ? om.organization.updatedAt.toISOString() : new Date().toISOString(),
        },
      })),
      clinicMemberships: profile.clinicMemberships.map((cm) => ({
        id: cm.id,
        clinicId: cm.clinicId,
        userProfileId: cm.userProfileId,
        role: cm.role as any,
        status: cm.status as any,
        createdAt: cm.createdAt?.toISOString ? cm.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: cm.updatedAt?.toISOString ? cm.updatedAt.toISOString() : new Date().toISOString(),
        clinic: {
          id: cm.clinic.id,
          organizationId: cm.clinic.organizationId,
          name: cm.clinic.name,
          slug: cm.clinic.slug,
          address: cm.clinic.address,
          phone: cm.clinic.phone,
          email: cm.clinic.email,
          timezone: cm.clinic.timezone,
          status: cm.clinic.status as any,
          createdAt: cm.clinic.createdAt?.toISOString ? cm.clinic.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: cm.clinic.updatedAt?.toISOString ? cm.clinic.updatedAt.toISOString() : new Date().toISOString(),
        },
      })),
      activeRole: user.role,
      activeOrganizationId: user.organizationId,
      activeClinicId: user.clinicId,
    };
  }

  async logout(user: AuthenticatedUser): Promise<{ success: boolean; message: string }> {
    this.logger.log(`User logged out: ${user.email} (${user.id})`);
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  validateSession(user: AuthenticatedUser): SessionValidationResponse {
    return {
      valid: true,
      userId: user.id,
      email: user.email,
      expiresAt: Math.floor(Date.now() / 1000) + 3600 * 24,
    };
  }
}
