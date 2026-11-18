import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementService } from '../services/entitlement.service';
import { FeatureCode, UserRole } from '@matabai/shared';

export const REQUIRE_ENTITLEMENT_KEY = 'require_entitlement';
export const RequireEntitlement = (feature: FeatureCode | string) =>
  SetMetadata(REQUIRE_ENTITLEMENT_KEY, feature);

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementService: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<FeatureCode | string>(
      REQUIRE_ENTITLEMENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super Admin bypasses feature restrictions for platform oversight
    if (user?.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const organizationId =
      user?.organizationId ||
      request.headers['x-organization-id'] ||
      request.params?.organizationId ||
      request.query?.organizationId;

    if (!organizationId) {
      return true;
    }

    const result = await this.entitlementService.checkFeature(organizationId, requiredFeature);

    if (!result.hasAccess) {
      throw new ForbiddenException(
        result.reason || `Feature '${requiredFeature}' is not permitted by your subscription plan.`,
      );
    }

    return true;
  }
}
