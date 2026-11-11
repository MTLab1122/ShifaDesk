import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { VoiceSimulatorService } from './voice-simulator.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import { simulateVoiceCallSchema } from '@matabai/validation';

@Controller('voice/simulate')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoiceSimulatorController {
  constructor(private readonly simulatorService: VoiceSimulatorService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async simulateTurn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any
  ) {
    const validated = simulateVoiceCallSchema.parse(body);
    return this.simulatorService.simulateTurn({
      ...validated,
      organizationId: user.organizationId,
    });
  }
}

