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
import { RefundService } from '../services/refund.service';
import {
  requestRefundSchema,
  reviewRefundSchema,
  queryRefundsSchema,
} from '@matabai/validation';

@Controller('finance/refunds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async queryRefunds(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = queryRefundsSchema.parse(query);
    return this.refundService.queryRefunds(user.organizationId!, validated);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  async requestRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const validated = requestRefundSchema.parse(body);
    return this.refundService.requestRefund(user.organizationId!, validated, user.id);
  }

  @Post(':id/review')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async reviewRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const validated = reviewRefundSchema.parse(body);
    return this.refundService.reviewRefund(user.organizationId!, id, validated, user.id);
  }
}
