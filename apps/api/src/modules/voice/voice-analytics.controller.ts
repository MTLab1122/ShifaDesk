import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { VoiceAnalyticsService } from './voice-analytics.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';

@Controller('voice/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoiceAnalyticsController {
  constructor(private readonly analyticsService: VoiceAnalyticsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId?: string
  ) {
    return this.analyticsService.getVoiceAnalytics(
      clinicId || user.clinicId,
      user.organizationId
    );
  }
}

