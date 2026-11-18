import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { NotificationModule } from '../notification/notification.module';
import { CardPaymentAdapter } from '../finance/adapters/card-payment.adapter';

import { PlanService } from './services/plan.service';
import { EntitlementService } from './services/entitlement.service';
import { UsageMeteringService } from './services/usage-metering.service';
import { SubscriptionLifecycleService } from './services/subscription-lifecycle.service';
import { SaasBillingService } from './services/saas-billing.service';
import { SaasPaymentService } from './services/saas-payment.service';
import { TenantOnboardingService } from './services/tenant-onboarding.service';
import { PlatformAdminService } from './services/platform-admin.service';

import { OnboardingController } from './controllers/onboarding.controller';
import { SubscriptionController } from './controllers/subscription.controller';
import { PlatformController } from './controllers/platform.controller';
import { EntitlementGuard } from './guards/entitlement.guard';

@Module({
  imports: [DatabaseModule, NotificationModule],
  controllers: [
    OnboardingController,
    SubscriptionController,
    PlatformController,
  ],
  providers: [
    PlanService,
    EntitlementService,
    UsageMeteringService,
    SubscriptionLifecycleService,
    SaasBillingService,
    SaasPaymentService,
    TenantOnboardingService,
    PlatformAdminService,
    CardPaymentAdapter,
    EntitlementGuard,
  ],
  exports: [
    PlanService,
    EntitlementService,
    UsageMeteringService,
    SubscriptionLifecycleService,
    SaasBillingService,
    SaasPaymentService,
    TenantOnboardingService,
    PlatformAdminService,
    EntitlementGuard,
  ],
})
export class SaasModule {}
