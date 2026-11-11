import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { LaboratoryAnalyticsService } from '../services/laboratory-analytics.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  queryLabAnalyticsSchema,
} from '@matabai/validation';

@Controller('laboratory/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LaboratoryAnalyticsController {
  constructor(private readonly analyticsService: LaboratoryAnalyticsService) {}

  private getOrgId(user: AuthenticatedUser): string {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new BadRequestException('User does not belong to an active organization');
    }
    return orgId;
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
  )
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: any,
  ) {
    const validated = queryLabAnalyticsSchema.parse(query);
    return this.analyticsService.getAnalytics(this.getOrgId(user), validated);
  }
}
