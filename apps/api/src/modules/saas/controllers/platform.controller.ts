import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';

import { PlatformAdminService } from '../services/platform-admin.service';
import { PlanService } from '../services/plan.service';
import { SaasBillingService } from '../services/saas-billing.service';
import { SaasPaymentService } from '../services/saas-payment.service';

import {
  createSubscriptionPlanSchema,
  updateSubscriptionPlanSchema,
  tenantStatusActionSchema,
  grantEntitlementOverrideSchema,
  grantPromotionalCreditSchema,
  verifyPaymentSchema,
  rejectPaymentSchema,
} from '@matabai/validation';

@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class PlatformController {
  constructor(
    private readonly platformAdminService: PlatformAdminService,
    private readonly planService: PlanService,
    private readonly billingService: SaasBillingService,
    private readonly paymentService: SaasPaymentService,
  ) {}

  /**
   * Super-Admin platform dashboard overview metrics
   */
  @Get('overview')
  async getOverview() {
    return this.platformAdminService.getPlatformOverview();
  }

  /**
   * Tenants directory
   */
  @Get('tenants')
  async listTenants(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('planCode') planCode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.platformAdminService.listTenants({
      search,
      status,
      planCode,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * Detailed tenant profile & history
   */
  @Get('tenants/:id')
  async getTenantDetails(@Param('id') id: string) {
    return this.platformAdminService.getTenantDetails(id);
  }

  /**
   * Tenant status management (SUSPEND, REACTIVATE, EXTEND_TRIAL)
   */
  @Post('tenants/:id/action')
  async handleTenantAction(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = tenantStatusActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors.map((e) => e.message).join(', '));
    }
    return this.platformAdminService.handleTenantAction(
      id,
      parsed.data.action,
      parsed.data.reason,
      parsed.data.extendDays,
      user,
    );
  }

  /**
   * Grant custom feature entitlement override
   */
  @Post('tenants/:id/overrides')
  async grantOverride(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = grantEntitlementOverrideSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors.map((e) => e.message).join(', '));
    }
    return this.platformAdminService.grantOverride(id, parsed.data, user);
  }

  /**
   * Grant promotional credit to tenant
   */
  @Post('tenants/:id/credits')
  async grantCredit(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = grantPromotionalCreditSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors.map((e) => e.message).join(', '));
    }
    return this.platformAdminService.grantPromotionalCredit(id, parsed.data, user);
  }

  /**
   * Plans management
   */
  @Get('plans')
  async listPlans() {
    return this.planService.listPlans(true);
  }

  @Post('plans')
  async createPlan(@Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    const parsed = createSubscriptionPlanSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors.map((e) => e.message).join(', '));
    }
    return this.planService.createPlan(parsed.data, user.id);
  }

  @Patch('plans/:id')
  async updatePlan(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = updateSubscriptionPlanSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors.map((e) => e.message).join(', '));
    }
    return this.planService.updatePlan(id, parsed.data, user.id);
  }

  @Delete('plans/:id')
  async deletePlan(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.planService.deletePlan(id, user.id);
  }

  /**
   * Global SaaS invoices
   */
  @Get('invoices')
  async listInvoices(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.billingService.listInvoices(
      undefined,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * Global SaaS payments & manual review queue
   */
  @Get('payments')
  async listPayments(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentService.listPayments(
      undefined,
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * Verify manual bank transfer payment
   */
  @Post('payments/:id/verify')
  async verifyPayment(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = verifyPaymentSchema.safeParse(body);
    return this.paymentService.verifyPayment(
      id,
      user.id,
      parsed.success ? parsed.data.notes : undefined,
    );
  }

  /**
   * Reject manual bank transfer payment
   */
  @Post('payments/:id/reject')
  async rejectPayment(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = rejectPaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors.map((e) => e.message).join(', '));
    }
    return this.paymentService.rejectPayment(id, user.id, parsed.data.rejectionReason);
  }

  /**
   * Super-Admin audit logs
   */
  @Get('audit-logs')
  async listAuditLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.platformAdminService.listAuditLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
