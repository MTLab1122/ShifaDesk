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
import { QueueSessionService } from './queue-session.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  createQueueSessionSchema,
  queryQueueSessionsSchema,
  CreateQueueSessionInput,
  QueryQueueSessionsInput,
} from '@matabai/validation';

@Controller('queue/sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueueSessionController {
  constructor(private readonly queueSessionService: QueueSessionService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryQueueSessionsInput,
  ) {
    const validated = queryQueueSessionsSchema.parse(query);
    return this.queueSessionService.findAll(user, validated);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.queueSessionService.findById(user, id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateQueueSessionInput,
  ) {
    const validated = createQueueSessionSchema.parse(body);
    return this.queueSessionService.create(user, validated);
  }

  @Post(':id/start')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @HttpCode(HttpStatus.OK)
  async start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.queueSessionService.start(user, id);
  }

  @Post(':id/pause')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @HttpCode(HttpStatus.OK)
  async pause(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.queueSessionService.pause(user, id);
  }

  @Post(':id/resume')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @HttpCode(HttpStatus.OK)
  async resume(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.queueSessionService.resume(user, id);
  }

  @Post(':id/close')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @HttpCode(HttpStatus.OK)
  async close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('force') force?: boolean,
  ) {
    return this.queueSessionService.close(user, id, Boolean(force));
  }
}
