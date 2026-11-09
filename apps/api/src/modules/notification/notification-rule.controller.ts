import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationRulesService } from './notification-rules.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  createNotificationRuleSchema,
  updateNotificationRuleSchema,
} from '@matabai/validation';

@Controller('notification-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationRuleController {
  constructor(private readonly rulesService: NotificationRulesService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async listRules(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId?: string,
  ) {
    return this.rulesService.findAll(user.organizationId || '', clinicId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async getRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.rulesService.findById(user.organizationId || '', id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createRule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    const validated = createNotificationRuleSchema.parse(body);
    return this.rulesService.create(user.organizationId || '', validated);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async updateRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const validated = updateNotificationRuleSchema.parse(body);
    return this.rulesService.update(user.organizationId || '', id, validated);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.rulesService.delete(user.organizationId || '', id);
  }
}
