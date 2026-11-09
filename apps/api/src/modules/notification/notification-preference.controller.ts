import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationPreferenceService } from './notification-preference.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  saveNotificationPreferenceSchema,
  optOutNotificationPreferenceSchema,
} from '@matabai/validation';

@Controller('notification-preferences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationPreferenceController {
  constructor(private readonly preferenceService: NotificationPreferenceService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.PATIENT)
  async getPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Query('patientId') patientId?: string,
    @Query('userId') userId?: string,
  ) {
    // If patient is requesting, enforce only their own patientId
    const targetPatientId = user.role === UserRole.PATIENT ? user.id : patientId;
    const targetUserId = user.role === UserRole.PATIENT ? undefined : userId;

    return this.preferenceService.getPreferences(user.organizationId || '', targetPatientId, targetUserId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.PATIENT)
  @HttpCode(HttpStatus.OK)
  async savePreference(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    const validated = saveNotificationPreferenceSchema.parse(body);
    return this.preferenceService.savePreference(user.organizationId || '', validated);
  }

  @Post('opt-out')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.PATIENT)
  @HttpCode(HttpStatus.OK)
  async optOut(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    const validated = optOutNotificationPreferenceSchema.parse(body);
    return this.preferenceService.optOut(user.organizationId || '', validated);
  }
}
