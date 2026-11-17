import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import { CashRegisterService } from '../services/cash-register.service';
import {
  openCashRegisterSchema,
  closeCashRegisterSchema,
  reopenCashRegisterSchema,
  queryCashSessionsSchema,
} from '@matabai/validation';

@Controller('finance/cash-register')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashRegisterController {
  constructor(private readonly cashService: CashRegisterService) {}

  @Get('active')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  async getActiveSession(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId', ParseUUIDPipe) clinicId: string,
  ) {
    return this.cashService.getActiveSession(user.organizationId!, clinicId);
  }

  @Post('open')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  async openSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const validated = openCashRegisterSchema.parse(body);
    return this.cashService.openSession(user.organizationId!, validated, user.id);
  }

  @Post(':id/close')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  async closeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const validated = closeCashRegisterSchema.parse(body);
    return this.cashService.closeSession(user.organizationId!, id, validated, user.id);
  }

  @Post(':id/reopen')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async reopenSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const validated = reopenCashRegisterSchema.parse(body);
    return this.cashService.reopenSession(user.organizationId!, id, validated, user.id);
  }

  @Get('sessions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  async querySessions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = queryCashSessionsSchema.parse(query);
    return this.cashService.querySessions(user.organizationId!, validated);
  }
}
