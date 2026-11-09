import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QueueSettingsService } from './queue-settings.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  createQueueSettingsSchema,
  updateQueueSettingsSchema,
  CreateQueueSettingsInput,
  UpdateQueueSettingsInput,
} from '@matabai/validation';

@Controller('queue/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueueSettingsController {
  constructor(private readonly queueSettingsService: QueueSettingsService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId?: string,
  ) {
    return this.queueSettingsService.findAll(user, clinicId);
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
    return this.queueSettingsService.findById(user, id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateQueueSettingsInput,
  ) {
    const validated = createQueueSettingsSchema.parse(body);
    return this.queueSettingsService.create(user, validated);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateQueueSettingsInput,
  ) {
    const validated = updateQueueSettingsSchema.parse(body);
    return this.queueSettingsService.update(user, id, validated);
  }

  @Post(':id/regenerate-public-key')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @HttpCode(HttpStatus.OK)
  async regeneratePublicKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.queueSettingsService.regeneratePublicKey(user, id);
  }
}
