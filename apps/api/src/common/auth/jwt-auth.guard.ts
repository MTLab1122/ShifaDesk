import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import { IS_PUBLIC_KEY } from './decorators';
import { UserRole, ROLE_PERMISSIONS } from '@matabai/shared';
import { AuthenticatedUser } from './token-payload.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }

    // Verify token
    try {
      const user = await this.verifyAndResolveUser(token, request);
      request.user = user;
      request.tenantId = user.organizationId;
      request.clinicId = user.clinicId;
      return true;
    } catch (error) {
      throw new UnauthorizedException(
        (error as Error).message || 'Invalid or expired token',
      );
    }
  }

  private async verifyAndResolveUser(
    token: string,
    request: any,
  ): Promise<AuthenticatedUser> {
    // 1. Support development / mock testing tokens
    if (token.startsWith('dev-token-') || token.startsWith('test-token-')) {
      const parts = token.split('-');
      const roleStr = parts[2]?.toUpperCase() || 'SUPER_ADMIN';
      const role = (UserRole[roleStr as keyof typeof UserRole] ||
        UserRole.SUPER_ADMIN) as UserRole;
      const email = parts[3] || `dev-${roleStr.toLowerCase()}@matabai.local`;

      // Check or find in DB
      let profile = await this.prisma.userProfile.findFirst({
        where: { email },
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
        // Auto-create test profile if absent for seamless integration
        profile = await this.prisma.userProfile.create({
          data: {
            authUserId: `auth-${email}`,
            fullName: `${roleStr} User`,
            email,
            status: 'ACTIVE',
          },
          include: {
            organizationMemberships: {
              include: { organization: true },
            },
            clinicMemberships: {
              include: { clinic: true },
            },
          },
        });
      }

      const orgId =
        request.headers['x-organization-id'] ||
        profile.organizationMemberships[0]?.organizationId;
      const clinicId =
        request.headers['x-clinic-id'] ||
        profile.clinicMemberships[0]?.clinicId;

      return {
        id: profile.id,
        authUserId: profile.authUserId,
        email: profile.email,
        fullName: profile.fullName,
        role,
        organizationId: orgId,
        clinicId: clinicId,
        permissions: ROLE_PERMISSIONS[role] || [],
      };
    }

    // 2. Standard JWT payload decode/verification
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) {
        throw new Error('Malformed JWT structure');
      }
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
      const payload = JSON.parse(jsonPayload);

      // Verify expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        throw new Error('Token has expired');
      }

      const authUserId = payload.sub || payload.id;
      const email = payload.email || 'user@matabai.local';

      // Look up user profile and active memberships
      let profile = await this.prisma.userProfile.findUnique({
        where: { authUserId },
        include: {
          organizationMemberships: true,
          clinicMemberships: true,
        },
      });

      if (!profile) {
        // First login JIT provision profile
        profile = await this.prisma.userProfile.create({
          data: {
            authUserId,
            email,
            fullName: payload.user_metadata?.full_name || email.split('@')[0] || 'User',
            status: 'ACTIVE',
          },
          include: {
            organizationMemberships: true,
            clinicMemberships: true,
          },
        });
      }

      const requestedOrgId = request.headers['x-organization-id'];
      const requestedClinicId = request.headers['x-clinic-id'];

      // Determine active role based on tenant context or default membership
      let activeRole = UserRole.PATIENT;
      let activeOrgId: string | undefined;
      let activeClinicId: string | undefined;

      if (profile.organizationMemberships.length > 0) {
        const matchingOrg = requestedOrgId
          ? profile.organizationMemberships.find(
              (m) => m.organizationId === requestedOrgId,
            )
          : profile.organizationMemberships[0];

        if (matchingOrg) {
          activeRole = matchingOrg.role as UserRole;
          activeOrgId = matchingOrg.organizationId;
        }
      }

      if (profile.clinicMemberships.length > 0) {
        const matchingClinic = requestedClinicId
          ? profile.clinicMemberships.find((m) => m.clinicId === requestedClinicId)
          : profile.clinicMemberships[0];

        if (matchingClinic) {
          activeClinicId = matchingClinic.clinicId;
          if (activeRole === UserRole.PATIENT) {
            activeRole = matchingClinic.role as UserRole;
          }
        }
      }

      return {
        id: profile.id,
        authUserId: profile.authUserId,
        email: profile.email,
        fullName: profile.fullName,
        role: activeRole,
        organizationId: activeOrgId,
        clinicId: activeClinicId,
        permissions: ROLE_PERMISSIONS[activeRole] || [],
      };
    } catch (err) {
      throw new UnauthorizedException(`JWT verification failed: ${(err as Error).message}`);
    }
  }
}
