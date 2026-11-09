import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QueueTokenService } from './queue-token.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole, TokenPriorityType } from '@matabai/shared';
import {
  appointmentCheckInSchema,
  walkInCheckInSchema,
  queryQueueTokensSchema,
  queueTokenActionSchema,
  updatePrioritySchema,
  AppointmentCheckInInput,
  WalkInCheckInInput,
  QueryQueueTokensInput,
  QueueTokenActionInput,
  UpdatePriorityInput,
} from '@matabai/validation';

@Controller('queue')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueueTokenController {
  constructor(private readonly queueTokenService: QueueTokenService) {}

  @Post('check-in/appointment')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.PATIENT,
  )
  @HttpCode(HttpStatus.CREATED)
  async checkInAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AppointmentCheckInInput,
  ) {
    const validated = appointmentCheckInSchema.parse(body);
    return this.queueTokenService.checkInAppointment(user, validated);
  }

  @Post('check-in/walk-in')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.CREATED)
  async checkInWalkIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: WalkInCheckInInput,
  ) {
    const validated = walkInCheckInSchema.parse(body);
    return this.queueTokenService.checkInWalkIn(user, validated);
  }

  @Get('tokens')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryQueueTokensInput,
  ) {
    const validated = queryQueueTokensSchema.parse(query);
    return this.queueTokenService.findAll(user, validated);
  }

  @Get('tokens/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
    UserRole.PATIENT,
  )
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.queueTokenService.findById(user, id);
  }

  @Post('sessions/:id/call-next')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @HttpCode(HttpStatus.OK)
  async callNext(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.queueTokenService.callNext(user, sessionId);
  }

  @Post('tokens/:id/recall')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @HttpCode(HttpStatus.OK)
  async recall(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.queueTokenService.recall(user, id);
  }

  @Post('tokens/:id/start-serving')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @HttpCode(HttpStatus.OK)
  async startServing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.queueTokenService.startServing(user, id);
  }

  @Post('tokens/:id/complete')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @HttpCode(HttpStatus.OK)
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.queueTokenService.complete(user, id);
  }

  @Post('tokens/:id/skip')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @HttpCode(HttpStatus.OK)
  async skip(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: QueueTokenActionInput,
  ) {
    const validated = queueTokenActionSchema.parse(body || {});
    return this.queueTokenService.skip(user, id, validated?.reason);
  }

  @Post('tokens/:id/restore')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @HttpCode(HttpStatus.OK)
  async restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.queueTokenService.restore(user, id);
  }

  @Post('tokens/:id/no-show')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @HttpCode(HttpStatus.OK)
  async noShow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: QueueTokenActionInput,
  ) {
    const validated = queueTokenActionSchema.parse(body || {});
    return this.queueTokenService.noShow(user, id, validated?.reason);
  }

  @Post('tokens/:id/cancel')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: QueueTokenActionInput,
  ) {
    const validated = queueTokenActionSchema.parse(body || {});
    return this.queueTokenService.cancel(user, id, validated?.reason);
  }

  @Post('tokens/:id/priority')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  async setPriority(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdatePriorityInput,
  ) {
    const validated = updatePrioritySchema.parse(body);
    return this.queueTokenService.setPriority(
      user,
      id,
      validated.priorityType as TokenPriorityType,
      validated.reason,
    );
  }
}
