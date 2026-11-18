import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { FeatureCode, SubscriptionStatus } from '@matabai/shared';

export interface EntitlementCheckResult {
  hasAccess: boolean;
  isIncluded: boolean;
  limitType: 'UNLIMITED' | 'COUNT' | 'BOOLEAN';
  limitValue: number;
  currentUsage: number;
  remaining: number;
  isOverLimit: boolean;
  isOverGrace: boolean;
  subscriptionStatus: SubscriptionStatus | string;
  reason?: string;
}

@Injectable()
export class EntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get active subscription for an organization
   */
  async getActiveSubscription(organizationId: string) {
    return this.prisma.tenantSubscription.findFirst({
      where: {
        organizationId,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.GRACE_PERIOD,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.PENDING,
          ],
        },
      },
      include: {
        plan: true,
        planVersion: {
          include: {
            entitlements: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Evaluate whether a feature is permitted and within usage limits
   */
  async checkFeature(
    organizationId: string,
    featureCode: FeatureCode | string,
    requestedIncrement = 0,
  ): Promise<EntitlementCheckResult> {
    const subscription = await this.getActiveSubscription(organizationId);

    // If no subscription found at all
    if (!subscription) {
      return {
        hasAccess: false,
        isIncluded: false,
        limitType: 'BOOLEAN',
        limitValue: 0,
        currentUsage: 0,
        remaining: 0,
        isOverLimit: true,
        isOverGrace: true,
        subscriptionStatus: 'NONE',
        reason: 'No active or trialing subscription found for organization',
      };
    }

    const status = subscription.status as SubscriptionStatus;

    // Suspended / Expired / Cancelled policies
    if (
      status === SubscriptionStatus.SUSPENDED ||
      status === SubscriptionStatus.EXPIRED ||
      status === SubscriptionStatus.CANCELLED
    ) {
      return {
        hasAccess: false,
        isIncluded: false,
        limitType: 'BOOLEAN',
        limitValue: 0,
        currentUsage: 0,
        remaining: 0,
        isOverLimit: true,
        isOverGrace: true,
        subscriptionStatus: status,
        reason: `Subscription is ${status}. Write operations and feature usage are restricted until renewed.`,
      };
    }

    // 1. Check Super-Admin custom Tenant Entitlement Override
    const override = await this.prisma.tenantEntitlementOverride.findUnique({
      where: {
        organizationId_featureCode: {
          organizationId,
          featureCode,
        },
      },
    });

    if (override && (!override.expiresAt || override.expiresAt > new Date())) {
      if (!override.isIncluded) {
        return {
          hasAccess: false,
          isIncluded: false,
          limitType: 'BOOLEAN',
          limitValue: 0,
          currentUsage: 0,
          remaining: 0,
          isOverLimit: true,
          isOverGrace: true,
          subscriptionStatus: status,
          reason: 'Feature explicitly disabled by platform administrator override',
        };
      }

      // If override has custom limit value
      const overrideLimit = override.limitValue;
      if (overrideLimit !== null && overrideLimit !== undefined) {
        const currentUsage = await this.getCurrentUsage(organizationId, featureCode, subscription);
        const remaining = Math.max(0, overrideLimit - currentUsage);
        const willExceed = currentUsage + requestedIncrement > overrideLimit;

        return {
          hasAccess: !willExceed,
          isIncluded: true,
          limitType: 'COUNT',
          limitValue: overrideLimit,
          currentUsage,
          remaining,
          isOverLimit: willExceed,
          isOverGrace: willExceed,
          subscriptionStatus: status,
          reason: willExceed ? `Override limit of ${overrideLimit} reached` : undefined,
        };
      }

      return {
        hasAccess: true,
        isIncluded: true,
        limitType: 'UNLIMITED',
        limitValue: 0,
        currentUsage: 0,
        remaining: 999999,
        isOverLimit: false,
        isOverGrace: false,
        subscriptionStatus: status,
      };
    }

    // 2. Evaluate against Plan Version Entitlements
    const planVersion = subscription.planVersion;
    if (!planVersion) {
      return {
        hasAccess: false,
        isIncluded: false,
        limitType: 'BOOLEAN',
        limitValue: 0,
        currentUsage: 0,
        remaining: 0,
        isOverLimit: true,
        isOverGrace: true,
        subscriptionStatus: status,
        reason: 'Plan version configuration missing',
      };
    }

    const entitlement = planVersion.entitlements.find((e) => e.featureCode === featureCode);
    const featuresList = (planVersion.features as string[]) || [];
    const isFeatureListed = featuresList.includes(featureCode) || Boolean(entitlement?.isIncluded);

    if (!isFeatureListed) {
      return {
        hasAccess: false,
        isIncluded: false,
        limitType: 'BOOLEAN',
        limitValue: 0,
        currentUsage: 0,
        remaining: 0,
        isOverLimit: true,
        isOverGrace: true,
        subscriptionStatus: status,
        reason: `Feature '${featureCode}' is not included in the ${subscription.plan.name} plan`,
      };
    }

    // 3. Evaluate count limits if applicable
    const planLimits = (planVersion.limits as Record<string, number>) || {};
    const configuredLimit = planLimits[featureCode] ?? entitlement?.limitValue ?? 0;
    const isUnlimited = configuredLimit <= 0 && entitlement?.limitType === 'UNLIMITED';

    if (isUnlimited) {
      return {
        hasAccess: true,
        isIncluded: true,
        limitType: 'UNLIMITED',
        limitValue: 0,
        currentUsage: 0,
        remaining: 999999,
        isOverLimit: false,
        isOverGrace: false,
        subscriptionStatus: status,
      };
    }

    // Count-based limit check
    const currentUsage = await this.getCurrentUsage(organizationId, featureCode, subscription);
    const remaining = Math.max(0, configuredLimit - currentUsage);
    const willExceed = currentUsage + requestedIncrement > configuredLimit;

    // Grace period threshold check (allows up to 10% overflow during GRACE_PERIOD)
    const graceAllowed =
      status === SubscriptionStatus.GRACE_PERIOD
        ? Math.ceil(configuredLimit * 1.1)
        : configuredLimit;
    const isOverGrace = currentUsage + requestedIncrement > graceAllowed;

    return {
      hasAccess: !willExceed || (!isOverGrace && status === SubscriptionStatus.GRACE_PERIOD),
      isIncluded: true,
      limitType: 'COUNT',
      limitValue: configuredLimit,
      currentUsage,
      remaining,
      isOverLimit: willExceed,
      isOverGrace,
      subscriptionStatus: status,
      reason: willExceed
        ? `Usage limit of ${configuredLimit} for '${featureCode}' reached`
        : undefined,
    };
  }

  /**
   * Helper to retrieve current usage for a feature in the current cycle
   */
  private async getCurrentUsage(
    organizationId: string,
    featureCode: string,
    subscription: any,
  ): Promise<number> {
    // 1. Static resource limits
    if (featureCode === FeatureCode.DOCTORS_COUNT) {
      return this.prisma.doctor.count({
        where: { organizationId, status: 'ACTIVE' },
      });
    }

    if (featureCode === FeatureCode.STAFF_ACCOUNTS) {
      return this.prisma.organizationMembership.count({
        where: { organizationId, status: 'ACTIVE' },
      });
    }

    if (featureCode === FeatureCode.CLINIC_BRANCHES) {
      return this.prisma.clinic.count({
        where: { organizationId, status: 'ACTIVE' },
      });
    }

    if (featureCode === FeatureCode.SCHEDULED_REPORTS) {
      return this.prisma.scheduledReport.count({
        where: { organizationId, status: 'ACTIVE' },
      });
    }

    // 2. Metered period limits from UsagePeriodSummary
    const periodStart = subscription.currentPeriodStart;
    const periodEnd = subscription.currentPeriodEnd;

    const summary = await this.prisma.usagePeriodSummary.findUnique({
      where: {
        organizationId_billingPeriodStart_billingPeriodEnd_featureCode: {
          organizationId,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          featureCode,
        },
      },
    });

    if (summary) {
      return summary.totalUsage;
    }

    // Fallback: sum from UsageEvent
    const aggregate = await this.prisma.usageEvent.aggregate({
      where: {
        organizationId,
        featureCode,
        timestamp: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      _sum: { quantity: true },
    });

    return aggregate._sum.quantity || 0;
  }
}
