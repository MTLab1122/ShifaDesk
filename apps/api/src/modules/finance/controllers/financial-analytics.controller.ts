import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import { FinancialAnalyticsService } from '../services/financial-analytics.service';
import { ReconciliationService } from '../services/reconciliation.service';
import {
  queryFinancialAnalyticsSchema,
  manualReconciliationSchema,
} from '@matabai/validation';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinancialAnalyticsController {
  constructor(
    private readonly analyticsService: FinancialAnalyticsService,
    private readonly reconciliationService: ReconciliationService,
  ) {}

  @Get('analytics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = queryFinancialAnalyticsSchema.parse(query);
    return this.analyticsService.getAnalytics(
      user.organizationId!,
      validated.clinicId,
      validated.startDate,
      validated.endDate,
    );
  }

  @Get('reconciliation')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async getReconciliation(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = queryFinancialAnalyticsSchema.parse(query);
    return this.reconciliationService.getReconciliationReport(
      user.organizationId!,
      validated.clinicId,
      validated.startDate,
      validated.endDate,
    );
  }

  @Post('reconciliation/manual')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async reconcileManually(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const validated = manualReconciliationSchema.parse(body);
    return this.reconciliationService.reconcileManually(user.organizationId!, validated, user.id);
  }
}
