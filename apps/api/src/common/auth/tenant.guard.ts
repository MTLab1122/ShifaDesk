import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@matabai/shared';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    // SUPER_ADMIN can bypass tenant boundary restrictions
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Check organization ID from route params, body, or headers
    const targetOrgId =
      request.params?.organizationId ||
      request.params?.id ||
      request.body?.organizationId ||
      request.headers?.['x-organization-id'];

    if (targetOrgId) {
      // Validate that user is an active member of this organization
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: targetOrgId,
          userProfileId: user.id,
          status: 'ACTIVE',
        },
      });

      if (!membership) {
        throw new ForbiddenException(
          'Tenant Access Denied: User is not an active member of this organization',
        );
      }
    }

    return true;
  }
}
