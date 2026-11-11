import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { VoiceSettingsService } from './voice-settings.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import { updateVoiceSettingsSchema } from '@matabai/validation';

@Controller('voice/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoiceSettingsController {
  constructor(private readonly settingsService: VoiceSettingsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async getSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId?: string
  ) {
    const targetClinicId = clinicId || user.clinicId;
    if (!targetClinicId) {
      throw new BadRequestException('Clinic ID is required to fetch voice settings');
    }
    return this.settingsService.getSettings(targetClinicId, user.organizationId || '');
  }

  @Put()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId: string,
    @Body() body: any
  ) {
    const targetClinicId = clinicId || user.clinicId;
    if (!targetClinicId) {
      throw new BadRequestException('Clinic ID is required to update voice settings');
    }
    const validated = updateVoiceSettingsSchema.parse(body);
    return this.settingsService.updateSettings(
      targetClinicId,
      user.organizationId || '',
      validated
    );
  }
}

