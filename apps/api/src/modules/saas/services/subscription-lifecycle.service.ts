import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { PlanService } from './plan.service';
import { SaasBillingService } from './saas-billing.service';
import { NotificationSchedulerService } from '../../notification/notification-scheduler.service';
import {
  SubscriptionStatus,
  BillingInterval,
  NotificationEventType,
} from '@matabai/shared';

@Injectable()
export class SubscriptionLifecycleService {
  private readonly logger = new Logger(SubscriptionLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: PlanService,
    private readonly billingService: SaasBillingService,
    @Optional() private readonly notificationScheduler?: NotificationSchedulerService,
  ) {}

  /**
   * Start 14-day free trial on plan registration
   */
  async startTrial(
    organizationId: string,
    userProfileId: string,
    planCode = 'STARTER',
    trialDays = 14,
  ) {
    // 1. Anti-abuse check: verify organization does not already have a trial record
    const existingTrial = await this.prisma.trialRecord.findUnique({
      where: { organizationId },
    });

    if (existingTrial) {
      throw new ConflictException('A free trial has already been initiated for this organization');
    }

    const plan = await this.planService.getPlanByCode(planCode);
    const planVersion = plan.versions[0];
    if (!planVersion) {
      throw new NotFoundException(`No active plan version for plan '${planCode}'`);
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Trial record
      const trial = await tx.trialRecord.create({
        data: {
          organizationId,
          userProfileId,
          planId: plan.id,
          startedAt: now,
          expiresAt: trialEnd,
          status: 'ACTIVE',
        },
      });

      // 2. Create TenantSubscription in TRIALING status
      const subscription = await tx.tenantSubscription.create({
        data: {
          organizationId,
          planId: plan.id,
          planVersionId: planVersion.id,
          status: SubscriptionStatus.TRIALING,
          billingInterval: BillingInterval.MONTHLY,
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          trialStart: now,
          trialEnd: trialEnd,
          unitPricePaisa: planVersion.monthlyPricePaisa,
          currency: planVersion.currency,
        },
      });

      // 3. Log initial status history
      await tx.subscriptionStatusHistory.create({
        data: {
          subscriptionId: subscription.id,
          previousStatus: null,
          newStatus: SubscriptionStatus.TRIALING,
          reason: `Initial ${trialDays}-day free trial started on ${plan.name} plan`,
          changedById: userProfileId,
        },
      });

      // 4. Dispatch notification
      if (this.notificationScheduler) {
        this.notificationScheduler
          .scheduleSubscriptionNotification({
            organizationId,
            recipientUserId: userProfileId,
            eventType: NotificationEventType.TRIAL_STARTED,
            relatedEntityType: 'TRIAL',
            relatedEntityId: trial.id,
            payload: {
              plan_name: plan.name,
              trial_days: trialDays,
              trial_end: trialEnd.toISOString().split('T')[0],
              message: `Your ${trialDays}-day free trial of the ${plan.name} plan has started!`,
            },
          })
          .catch(() => {});
      }

      this.logger.log(`Started ${trialDays}-day trial for org ${organizationId} on ${plan.code}`);
      return subscription;
    });
  }

  /**
   * Activate subscription upon payment confirmation
   */
  async activateSubscription(subscriptionId: string, invoiceId?: string, actorUserId?: string) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, planVersion: true, organization: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID '${subscriptionId}' not found`);
    }

    const previousStatus = subscription.status;
    const now = new Date();
    const intervalMonths = subscription.billingInterval === BillingInterval.ANNUAL ? 12 : 1;
    const newPeriodEnd = new Date(now.getFullYear(), now.getMonth() + intervalMonths, now.getDate(), 23, 59, 59);

    const updated = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.tenantSubscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: newPeriodEnd,
          gracePeriodEnd: null,
          cancelledAt: null,
          cancellationReason: null,
          cancelAtPeriodEnd: false,
        },
      });

      // If trial was active, mark it converted
      await tx.trialRecord.updateMany({
        where: { organizationId: subscription.organizationId, status: 'ACTIVE' },
        data: { status: 'CONVERTED' },
      });

      await tx.subscriptionStatusHistory.create({
        data: {
          subscriptionId: sub.id,
          previousStatus,
          newStatus: SubscriptionStatus.ACTIVE,
          reason: invoiceId
            ? `Activated via verified invoice payment (${invoiceId})`
            : 'Activated by administrative action',
          changedById: actorUserId || null,
        },
      });

      return sub;
    });

    // Notify organization admin
    const owner = await this.prisma.organizationMembership.findFirst({
      where: { organizationId: subscription.organizationId, role: 'CLINIC_ADMIN' },
    });

    if (owner && this.notificationScheduler) {
      this.notificationScheduler
        .scheduleSubscriptionNotification({
          organizationId: subscription.organizationId,
          recipientUserId: owner.userProfileId,
          eventType: NotificationEventType.SUBSCRIPTION_ACTIVATED,
          relatedEntityType: 'SUBSCRIPTION',
          relatedEntityId: subscription.id,
          payload: {
            plan_name: subscription.plan.name,
            period_end: newPeriodEnd.toISOString().split('T')[0],
            message: `Your ${subscription.plan.name} subscription is now ACTIVE until ${newPeriodEnd.toISOString().split('T')[0]}!`,
          },
        })
        .catch(() => {});
    }

    return updated;
  }

  /**
   * Upgrade to a higher plan
   */
  async upgradePlan(
    subscriptionId: string,
    newPlanCode: string,
    billingInterval: BillingInterval = BillingInterval.MONTHLY,
    actorUserId?: string,
  ) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, planVersion: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID '${subscriptionId}' not found`);
    }

    const newPlan = await this.planService.getPlanByCode(newPlanCode);
    const newVersion = newPlan.versions[0];
    if (!newVersion) {
      throw new NotFoundException(`Plan version not found for plan '${newPlanCode}'`);
    }

    const now = new Date();
    const isCurrentlyTrial = subscription.status === SubscriptionStatus.TRIALING;

    // Calculate prorated credit for remaining days in current period
    let proratedCreditPaisa = 0;
    if (!isCurrentlyTrial && subscription.status === SubscriptionStatus.ACTIVE) {
      const totalPeriodMs = subscription.currentPeriodEnd.getTime() - subscription.currentPeriodStart.getTime();
      const remainingMs = Math.max(0, subscription.currentPeriodEnd.getTime() - now.getTime());
      if (totalPeriodMs > 0) {
        const unusedRatio = remainingMs / totalPeriodMs;
        proratedCreditPaisa = Math.round(subscription.unitPricePaisa * unusedRatio);
      }
    }

    const targetPricePaisa =
      billingInterval === BillingInterval.ANNUAL
        ? newVersion.annualPricePaisa
        : newVersion.monthlyPricePaisa;

    // Create invoice for upgrade
    const invoice = await this.billingService.createSubscriptionInvoice({
      organizationId: subscription.organizationId,
      subscriptionId: subscription.id,
      planVersionSnapshot: {
        planName: newPlan.name,
        planCode: newPlan.code,
        version: newVersion.version,
        features: newVersion.features,
        limits: newVersion.limits,
      },
      billingPeriodStart: now,
      billingPeriodEnd: new Date(
        now.getFullYear(),
        now.getMonth() + (billingInterval === BillingInterval.ANNUAL ? 12 : 1),
        now.getDate(),
      ),
      subtotalPaisa: targetPricePaisa,
      discountPaisa: proratedCreditPaisa,
      description: `Plan Upgrade: ${subscription.plan.name} -> ${newPlan.name} (${billingInterval})`,
    });

    // If on free trial or if outstanding is zero (full credit covered), activate immediately
    const shouldActivateNow = isCurrentlyTrial || invoice.outstandingPaisa === 0;

    const updated = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.tenantSubscription.update({
        where: { id: subscriptionId },
        data: {
          planId: newPlan.id,
          planVersionId: newVersion.id,
          billingInterval,
          unitPricePaisa: targetPricePaisa,
          ...(shouldActivateNow && {
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: invoice.billingPeriodEnd,
          }),
        },
      });

      await tx.subscriptionStatusHistory.create({
        data: {
          subscriptionId: sub.id,
          previousStatus: subscription.status,
          newStatus: shouldActivateNow ? SubscriptionStatus.ACTIVE : subscription.status,
          reason: `Upgraded to ${newPlan.name} (${billingInterval}). Invoice ${invoice.invoiceNumber} generated.`,
          changedById: actorUserId || null,
        },
      });

      return sub;
    });

    // Notify organization
    const owner = await this.prisma.organizationMembership.findFirst({
      where: { organizationId: subscription.organizationId, role: 'CLINIC_ADMIN' },
    });

    if (owner && this.notificationScheduler) {
      this.notificationScheduler
        .scheduleSubscriptionNotification({
          organizationId: subscription.organizationId,
          recipientUserId: owner.userProfileId,
          eventType: NotificationEventType.SUBSCRIPTION_UPGRADED,
          relatedEntityType: 'SUBSCRIPTION',
          relatedEntityId: subscription.id,
          payload: {
            plan_name: newPlan.name,
            invoice_number: invoice.invoiceNumber,
            total_amount: (invoice.totalPaisa / 100).toFixed(2),
            message: `Your subscription has been upgraded to ${newPlan.name}! Invoice ${invoice.invoiceNumber} generated.`,
          },
        })
        .catch(() => {});
    }

    return { subscription: updated, invoice };
  }

  /**
   * Controlled plan downgrade with capacity verification
   */
  async downgradePlan(
    subscriptionId: string,
    newPlanCode: string,
    effectiveImmediately = false,
    actorUserId?: string,
  ) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID '${subscriptionId}' not found`);
    }

    const newPlan = await this.planService.getPlanByCode(newPlanCode);
    const newVersion = newPlan.versions[0];
    if (!newVersion) {
      throw new NotFoundException(`Plan version not found for plan '${newPlanCode}'`);
    }

    // 1. Capacity Check: Ensure current resources do not exceed target plan limits
    const limits = (newVersion.limits as Record<string, number>) || {};
    const doctorsCount = await this.prisma.doctor.count({
      where: { organizationId: subscription.organizationId, status: 'ACTIVE' },
    });
    const staffCount = await this.prisma.organizationMembership.count({
      where: { organizationId: subscription.organizationId, status: 'ACTIVE' },
    });
    const branchesCount = await this.prisma.clinic.count({
      where: { organizationId: subscription.organizationId, status: 'ACTIVE' },
    });

    const violations: string[] = [];
    if (limits['DOCTORS_COUNT'] && doctorsCount > limits['DOCTORS_COUNT']) {
      violations.push(`Active doctors (${doctorsCount}) exceed new plan limit (${limits['DOCTORS_COUNT']})`);
    }
    if (limits['STAFF_ACCOUNTS'] && staffCount > limits['STAFF_ACCOUNTS']) {
      violations.push(`Active staff (${staffCount}) exceed new plan limit (${limits['STAFF_ACCOUNTS']})`);
    }
    if (limits['CLINIC_BRANCHES'] && branchesCount > limits['CLINIC_BRANCHES']) {
      violations.push(`Active branches (${branchesCount}) exceed new plan limit (${limits['CLINIC_BRANCHES']})`);
    }

    if (violations.length > 0) {
      throw new BadRequestException(
        `Cannot downgrade plan: ${violations.join('. ')}. Please reduce active resources before downgrading. Clinic data is never silently deleted.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.tenantSubscription.update({
        where: { id: subscriptionId },
        data: {
          planId: newPlan.id,
          planVersionId: newVersion.id,
          unitPricePaisa:
            subscription.billingInterval === BillingInterval.ANNUAL
              ? newVersion.annualPricePaisa
              : newVersion.monthlyPricePaisa,
        },
      });

      await tx.subscriptionStatusHistory.create({
        data: {
          subscriptionId: sub.id,
          previousStatus: subscription.status,
          newStatus: sub.status,
          reason: effectiveImmediately
            ? `Downgraded to ${newPlan.name} plan immediately`
            : `Downgraded to ${newPlan.name} plan at period end`,
          changedById: actorUserId || null,
        },
      });

      return sub;
    });

    // Notify organization
    const owner = await this.prisma.organizationMembership.findFirst({
      where: { organizationId: subscription.organizationId, role: 'CLINIC_ADMIN' },
    });

    if (owner && this.notificationScheduler) {
      this.notificationScheduler
        .scheduleSubscriptionNotification({
          organizationId: subscription.organizationId,
          recipientUserId: owner.userProfileId,
          eventType: NotificationEventType.SUBSCRIPTION_DOWNGRADED,
          relatedEntityType: 'SUBSCRIPTION',
          relatedEntityId: subscription.id,
          payload: {
            plan_name: newPlan.name,
            message: `Your subscription has been switched to ${newPlan.name}.`,
          },
        })
        .catch(() => {});
    }

    return updated;
  }

  /**
   * Cancel subscription immediately or at period end
   */
  async cancelSubscription(
    subscriptionId: string,
    reason: string,
    immediately = false,
    actorUserId?: string,
  ) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID '${subscriptionId}' not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.tenantSubscription.update({
        where: { id: subscriptionId },
        data: {
          ...(immediately
            ? {
                status: SubscriptionStatus.CANCELLED,
                cancelledAt: new Date(),
                cancellationReason: reason,
                cancelAtPeriodEnd: false,
              }
            : {
                cancelAtPeriodEnd: true,
                cancellationReason: reason,
              }),
        },
      });

      await tx.subscriptionStatusHistory.create({
        data: {
          subscriptionId: sub.id,
          previousStatus: subscription.status,
          newStatus: sub.status,
          reason: immediately
            ? `Cancelled immediately: ${reason}`
            : `Scheduled cancellation at period end: ${reason}`,
          changedById: actorUserId || null,
        },
      });

      return sub;
    });

    // Notify organization
    const owner = await this.prisma.organizationMembership.findFirst({
      where: { organizationId: subscription.organizationId, role: 'CLINIC_ADMIN' },
    });

    if (owner && this.notificationScheduler) {
      this.notificationScheduler
        .scheduleSubscriptionNotification({
          organizationId: subscription.organizationId,
          recipientUserId: owner.userProfileId,
          eventType: NotificationEventType.SUBSCRIPTION_CANCELLED,
          relatedEntityType: 'SUBSCRIPTION',
          relatedEntityId: subscription.id,
          payload: {
            reason,
            effective: immediately ? 'Immediate' : 'At current period end',
            message: `Subscription cancellation requested: ${reason}`,
          },
        })
        .catch(() => {});
    }

    return updated;
  }

  /**
   * Reactivate a cancelled, suspended, or expired subscription
   */
  async reactivateSubscription(subscriptionId: string, actorUserId?: string) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID '${subscriptionId}' not found`);
    }

    const now = new Date();
    const intervalMonths = subscription.billingInterval === BillingInterval.ANNUAL ? 12 : 1;
    const newPeriodEnd = new Date(now.getFullYear(), now.getMonth() + intervalMonths, now.getDate(), 23, 59, 59);

    const updated = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.tenantSubscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: newPeriodEnd,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
          cancellationReason: null,
          gracePeriodEnd: null,
        },
      });

      await tx.subscriptionStatusHistory.create({
        data: {
          subscriptionId: sub.id,
          previousStatus: subscription.status,
          newStatus: SubscriptionStatus.ACTIVE,
          reason: 'Subscription reactivated by authorized user action',
          changedById: actorUserId || null,
        },
      });

      return sub;
    });

    // Notify organization
    const owner = await this.prisma.organizationMembership.findFirst({
      where: { organizationId: subscription.organizationId, role: 'CLINIC_ADMIN' },
    });

    if (owner && this.notificationScheduler) {
      this.notificationScheduler
        .scheduleSubscriptionNotification({
          organizationId: subscription.organizationId,
          recipientUserId: owner.userProfileId,
          eventType: NotificationEventType.SUBSCRIPTION_REACTIVATED,
          relatedEntityType: 'SUBSCRIPTION',
          relatedEntityId: subscription.id,
          payload: {
            plan_name: subscription.plan.name,
            message: `Your ${subscription.plan.name} subscription has been reactivated!`,
          },
        })
        .catch(() => {});
    }

    return updated;
  }

  /**
   * Automated periodic check for expiring trials and periods
   */
  async processExpirations(): Promise<{
    expiredTrials: number;
    movedToGrace: number;
    suspended: number;
  }> {
    const now = new Date();
    let expiredTrials = 0;
    let movedToGrace = 0;
    let suspended = 0;

    // 1. Process expired trials
    const expiringTrials = await this.prisma.tenantSubscription.findMany({
      where: {
        status: SubscriptionStatus.TRIALING,
        trialEnd: { lt: now },
      },
    });

    for (const sub of expiringTrials) {
      const graceEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await this.prisma.$transaction([
        this.prisma.tenantSubscription.update({
          where: { id: sub.id },
          data: {
            status: SubscriptionStatus.GRACE_PERIOD,
            gracePeriodEnd: graceEnd,
          },
        }),
        this.prisma.subscriptionStatusHistory.create({
          data: {
            subscriptionId: sub.id,
            previousStatus: SubscriptionStatus.TRIALING,
            newStatus: SubscriptionStatus.GRACE_PERIOD,
            reason: 'Free trial expired. Moved to 7-day grace period for payment.',
          },
        }),
      ]);
      expiredTrials++;
    }

    // 2. Process active subscriptions reaching period end
    const endingSubscriptions = await this.prisma.tenantSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: { lt: now },
      },
    });

    for (const sub of endingSubscriptions) {
      if (sub.cancelAtPeriodEnd) {
        await this.prisma.$transaction([
          this.prisma.tenantSubscription.update({
            where: { id: sub.id },
            data: { status: SubscriptionStatus.CANCELLED, cancelledAt: now },
          }),
          this.prisma.subscriptionStatusHistory.create({
            data: {
              subscriptionId: sub.id,
              previousStatus: SubscriptionStatus.ACTIVE,
              newStatus: SubscriptionStatus.CANCELLED,
              reason: 'Subscription cancelled at period end as requested',
            },
          }),
        ]);
      } else {
        const graceEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        await this.prisma.$transaction([
          this.prisma.tenantSubscription.update({
            where: { id: sub.id },
            data: { status: SubscriptionStatus.GRACE_PERIOD, gracePeriodEnd: graceEnd },
          }),
          this.prisma.subscriptionStatusHistory.create({
            data: {
              subscriptionId: sub.id,
              previousStatus: SubscriptionStatus.ACTIVE,
              newStatus: SubscriptionStatus.GRACE_PERIOD,
              reason: 'Billing period ended. Moved to 7-day grace period.',
            },
          }),
        ]);
        movedToGrace++;
      }
    }

    // 3. Process expired grace periods -> SUSPENDED (preserves all clinic data!)
    const expiredGrace = await this.prisma.tenantSubscription.findMany({
      where: {
        status: SubscriptionStatus.GRACE_PERIOD,
        gracePeriodEnd: { lt: now },
      },
    });

    for (const sub of expiredGrace) {
      await this.prisma.$transaction([
        this.prisma.tenantSubscription.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.SUSPENDED },
        }),
        this.prisma.subscriptionStatusHistory.create({
          data: {
            subscriptionId: sub.id,
            previousStatus: SubscriptionStatus.GRACE_PERIOD,
            newStatus: SubscriptionStatus.SUSPENDED,
            reason: 'Grace period expired without verified payment. Tenant suspended; clinical records preserved.',
          },
        }),
      ]);
      suspended++;
    }

    return { expiredTrials, movedToGrace, suspended };
  }
}
