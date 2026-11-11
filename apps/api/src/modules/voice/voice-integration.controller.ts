import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { VoiceIntegrationService } from './voice-integration.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import { createVoiceIntegrationSchema, updateVoiceIntegrationSchema } from '@matabai/validation';

@Controller('voice/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoiceIntegrationController {
  constructor(private readonly integrationService: VoiceIntegrationService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async getIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId?: string
  ) {
    const targetClinicId = clinicId || user.clinicId;
    if (!targetClinicId) {
      throw new BadRequestException('Clinic ID is required');
    }
    return this.integrationService.getByClinic(targetClinicId);
  }

  @Get('status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async getStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId?: string
  ) {
    const targetClinicId = clinicId || user.clinicId;
    if (!targetClinicId) {
      throw new BadRequestException('Clinic ID is required to check telephony status');
    }
    return this.integrationService.getProviderStatus(targetClinicId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async createIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any
  ) {
    const validated = createVoiceIntegrationSchema.parse(body);
    return this.integrationService.createIntegration(user.organizationId || '', validated);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async updateIntegration(
    @Param('id') id: string,
    @Body() body: any
  ) {
    const validated = updateVoiceIntegrationSchema.parse(body);
    return this.integrationService.updateIntegration(id, validated);
  }
}

