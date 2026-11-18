import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Public, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';

import { PlanService } from '../services/plan.service';
import { EntitlementService } from '../services/entitlement.service';
import { UsageMeteringService } from '../services/usage-metering.service';
import { SubscriptionLifecycleService } from '../services/subscription-lifecycle.service';
import { SaasBillingService } from '../services/saas-billing.service';
import { SaasPaymentService } from '../services/saas-payment.service';

import {
  upgradePlanSchema,
  downgradePlanSchema,
  cancelSubscriptionSchema,
  submitPaymentProofSchema,
} from '@matabai/validation';

@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly planService: PlanService,
    private readonly entitlementService: EntitlementService,
    private readonly usageService: UsageMeteringService,
    private readonly lifecycleService: SubscriptionLifecycleService,
    private readonly billingService: SaasBillingService,
    private readonly paymentService: SaasPaymentService,
  ) {}

  /**
   * Get current active subscription for tenant
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async getSubscription(@CurrentUser() user: AuthenticatedUser) {
    if (!user.organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.entitlementService.getActiveSubscription(user.organizationId);
  }

  /**
   * Public list of active subscription plans
   */
  @Get('plans')
  @Public()
  async getPlans() {
    return this.planService.listPlans(false);
  }

  /**
   * Authoritative metered usage summary for tenant
   */
  @Get('usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.DOCTOR)
  async getUsageSummary(@CurrentUser() user: AuthenticatedUser) {
    if (!user.organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.usageService.getTenantUsageSummary(user.organizationId);
  }

  /**
   * Upgrade subscription plan
   */
  @Post('upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async upgrade(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    if (!user.organizationId) {
      throw new BadRequestException('Organization context required');
    }
    const parsed = upgradePlanSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors.map((e) => e.message).join(', '));
    }
    const currentSub = await this.entitlementService.getActiveSubscription(user.organizationId);
    if (!currentSub) {
      throw new BadRequestException('No active subscription found to upgrade');
    }
    return this.lifecycleService.upgradePlan(
      currentSub.id,
      parsed.data.newPlanCode,
      parsed.data.billingInterval as any,
      user.id,
    );
  }

  /**
   * Downgrade subscription plan
   */
  @Post('downgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async downgrade(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    if (!user.organizationId) {
      throw new BadRequestException('Organization context required');
    }
    const parsed = downgradePlanSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors.map((e) => e.message).join(', '));
    }
    const currentSub = await this.entitlementService.getActiveSubscription(user.organizationId);
    if (!currentSub) {
      throw new BadRequestException('No active subscription found to downgrade');
    }
    return this.lifecycleService.downgradePlan(
      currentSub.id,
      parsed.data.newPlanCode,
      parsed.data.effectiveImmediately,
      user.id,
    );
  }

  /**
   * Cancel subscription
   */
  @Post('cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async cancel(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    if (!user.organizationId) {
      throw new BadRequestException('Organization context required');
    }
    const parsed = cancelSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors.map((e) => e.message).join(', '));
    }
    const currentSub = await this.entitlementService.getActiveSubscription(user.organizationId);
    if (!currentSub) {
      throw new BadRequestException('No active subscription found to cancel');
    }
    return this.lifecycleService.cancelSubscription(
      currentSub.id,
      parsed.data.reason,
      parsed.data.immediately,
      user.id,
    );
  }

  /**
   * Reactivate cancelled or suspended subscription
   */
  @Post('reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async reactivate(@CurrentUser() user: AuthenticatedUser) {
    if (!user.organizationId) {
      throw new BadRequestException('Organization context required');
    }
    const sub = await this.entitlementService.getActiveSubscription(user.organizationId);
    if (!sub) {
      throw new BadRequestException('No subscription found to reactivate');
    }
    return this.lifecycleService.reactivateSubscription(sub.id, user.id);
  }

  /**
   * List SaaS invoices for tenant
   */
  @Get('invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async listInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!user.organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.billingService.listInvoices(
      user.organizationId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * Get single SaaS invoice details
   */
  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async getInvoice(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getInvoiceById(id, user.organizationId);
  }

  /**
   * Download printable SaaS invoice HTML
   */
  @Get('invoices/:id/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async downloadInvoice(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const html = await this.billingService.renderPrintableInvoiceHtml(id, user.organizationId);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${id}.html"`);
    return res.send(html);
  }

  /**
   * Submit manual bank transfer reference
   */
  @Post('payments/manual')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async submitManualPayment(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    const parsed = submitPaymentProofSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors.map((e) => e.message).join(', '));
    }
    return this.paymentService.submitManualPayment(parsed.data, user);
  }

  /**
   * Initiate online card checkout
   */
  @Post('payments/card/initiate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async initiateCardPayment(@Body('invoiceId') invoiceId: string, @Body('redirectUrl') redirectUrl?: string) {
    if (!invoiceId) {
      throw new BadRequestException('Invoice ID is required');
    }
    return this.paymentService.initiateCardCheckout(invoiceId, redirectUrl);
  }
}
