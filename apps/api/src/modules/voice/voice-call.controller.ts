import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VoiceCallSessionService } from './voice-call-session.service';
import { VoiceHandoverService } from './voice-handover.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import { queryVoiceCallsSchema, assignVoiceHandoverSchema } from '@matabai/validation';

@Controller('voice/calls')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoiceCallController {
  constructor(
    private readonly sessionService: VoiceCallSessionService,
    private readonly handoverService: VoiceHandoverService
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async listCalls(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: any
  ) {
    const validated = queryVoiceCallsSchema.parse(query);
    return this.sessionService.querySessions({
      ...validated,
      organizationId: user.organizationId,
      clinicId: validated.clinicId || user.clinicId,
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async getCallDetails(@Param('id') id: string) {
    return this.sessionService.getSession(id);
  }

  @Get(':id/transcript')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async getTranscript(@Param('id') id: string) {
    const session = await this.sessionService.getSession(id);
    return {
      callSessionId: session.id,
      providerCallId: session.providerCallId,
      callerPhone: session.callerPhone,
      selectedLanguage: session.selectedLanguage,
      messages: session.messages,
    };
  }

  @Post(':id/handover')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  async manualHandover(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any
  ) {
    const validated = assignVoiceHandoverSchema.parse(body);
    return this.handoverService.initiateHandover({
      callSessionId: id,
      reason: validated.handoverReason,
      assignedUserId: validated.assignedUserId || user.id,
    });
  }
}

