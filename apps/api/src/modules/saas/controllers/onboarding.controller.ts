import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Public, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import { TenantOnboardingService } from '../services/tenant-onboarding.service';
import {
  clinicRegistrationSchema,
  completeOnboardingSchema,
} from '@matabai/validation';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: TenantOnboardingService) {}

  /**
   * Public clinic self-registration endpoint
   */
  @Post('register')
  @Public()
  async register(@Body() body: any) {
    const parsed = clinicRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors.map((e) => e.message).join(', '));
    }
    return this.onboardingService.registerClinic(parsed.data);
  }

  /**
   * Get onboarding checklist status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    if (!user.organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.onboardingService.getOnboardingStatus(user.organizationId);
  }

  /**
   * Submit complete onboarding configuration
   */
  @Post('complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async complete(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    if (!user.organizationId) {
      throw new BadRequestException('Organization context required');
    }
    const parsed = completeOnboardingSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors.map((e) => e.message).join(', '));
    }
    return this.onboardingService.completeOnboarding(user.organizationId, parsed.data, user);
  }
}
