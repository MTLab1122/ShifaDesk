import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import {
  PlatformOverviewMetrics,
  SubscriptionStatus,
} from '@matabai/shared';
import {
  GrantEntitlementOverrideInput,
  GrantPromotionalCreditInput,
} from '@matabai/validation';
import * as crypto from 'crypto';

@Injectable()
export class PlatformAdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executive multi-tenant SaaS metrics for Super-Admin console
   */
  async getPlatformOverview(): Promise<PlatformOverviewMetrics> {
    const [
      totalTenants,
      activeSubs,
      trialingSubs,
      suspendedSubs,
      cancelledSubs,
      expiredSubs,
      allActiveSubs,
      unpaidInvoices,
      allPlans,
      recentOrgs,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.tenantSubscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.tenantSubscription.count({ where: { status: SubscriptionStatus.TRIALING } }),
      this.prisma.tenantSubscription.count({ where: { status: SubscriptionStatus.SUSPENDED } }),
      this.prisma.tenantSubscription.count({ where: { status: SubscriptionStatus.CANCELLED } }),
      this.prisma.tenantSubscription.count({ where: { status: SubscriptionStatus.EXPIRED } }),
      this.prisma.tenantSubscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE },
        select: { unitPricePaisa: true, billingInterval: true, plan: { select: { code: true } } },
      }),
      this.prisma.subscriptionInvoice.aggregate({
        where: { status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } },
        _sum: { outstandingPaisa: true },
      }),
      this.prisma.subscriptionPlan.findMany({
        select: { code: true, name: true },
      }),
      this.prisma.organization.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          subscriptions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { plan: true },
          },
        },
      }),
    ]);

    // Calculate MRR in minor units (paisa)
    let mrrPaisa = 0;
    const planCounts: Record<string, number> = {};

    for (const sub of allActiveSubs) {
      const monthlyAmount =
        sub.billingInterval === 'ANNUAL'
          ? Math.round(sub.unitPricePaisa / 12)
          : sub.unitPricePaisa;
      mrrPaisa += monthlyAmount;

      const code = sub.plan?.code || 'OTHER';
      planCounts[code] = (planCounts[code] || 0) + 1;
    }

    const arrPaisa = mrrPaisa * 12;
    const outstandingInvoicesPaisa = unpaidInvoices._sum.outstandingPaisa || 0;

    // Churn calculation
    const totalEverSubscribed = activeSubs + cancelledSubs + suspendedSubs;
    const churnRatePercent =
      totalEverSubscribed > 0
        ? Math.round((cancelledSubs / totalEverSubscribed) * 100 * 10) / 10
        : 0;

    const planDistribution = allPlans.map((plan) => {
      const count = planCounts[plan.code] || 0;
      const percentage =
        activeSubs > 0 ? Math.round((count / activeSubs) * 100) : 0;
      return {
        planCode: plan.code,
        planName: plan.name,
        count,
        percentage,
      };
    });

    const recentSignups = recentOrgs.map((org) => {
      const sub = org.subscriptions[0];
      return {
        organizationId: org.id,
        organizationName: org.name,
        slug: org.slug,
        createdAt: org.createdAt.toISOString(),
        status: org.status,
        planName: sub?.plan?.name || 'Starter',
        subscriptionStatus: sub?.status || 'TRIALING',
      };
    });

    return {
      totalTenants,
      activeSubscriptions: activeSubs,
      trialingSubscriptions: trialingSubs,
      suspendedSubscriptions: suspendedSubs,
      cancelledSubscriptions: cancelledSubs,
      expiredSubscriptions: expiredSubs,
      mrrPaisa,
      arrPaisa,
      outstandingInvoicesPaisa,
      churnRatePercent,
      planDistribution,
      recentSignups,
    };
  }

  async listTenants(params: {
    search?: string;
    status?: string;
    planCode?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, status, planCode, page = 1, limit = 20 } = params;
    const skip = (Math.max(1, page) - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (planCode) {
      where.subscriptions = {
        some: { plan: { code: planCode.toUpperCase() } },
      };
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          clinics: { select: { id: true, name: true, address: true, phone: true } },
          memberships: {
            where: { role: 'CLINIC_ADMIN' },
            include: { userProfile: { select: { fullName: true, email: true, phone: true } } },
          },
          subscriptions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { plan: true },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    };
  }

  async getTenantDetails(id: string) {
    const tenant = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        clinics: true,
        memberships: {
          include: { userProfile: true },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          include: {
            plan: true,
            planVersion: true,
            statusHistories: { orderBy: { createdAt: 'desc' }, take: 10 },
          },
        },
        trialRecord: true,
        tenantEntitlementOverrides: true,
        promotionalCredits: true,
        subscriptionInvoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        subscriptionPayments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }

    return tenant;
  }

  /**
   * Super-Admin status actions (SUSPEND, REACTIVATE, EXTEND_TRIAL)
   */
  async handleTenantAction(
    id: string,
    action: 'SUSPEND' | 'REACTIVATE' | 'EXTEND_TRIAL',
    reason: string,
    extendDays = 7,
    user: AuthenticatedUser,
  ) {
    const tenant = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        subscriptions: { take: 1, orderBy: { createdAt: 'desc' } },
        trialRecord: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }

    const sub = tenant.subscriptions[0];

    return this.prisma.$transaction(async (tx) => {
      if (action === 'SUSPEND') {
        if (sub) {
          await tx.tenantSubscription.update({
            where: { id: sub.id },
            data: { status: SubscriptionStatus.SUSPENDED },
          });
          await tx.subscriptionStatusHistory.create({
            data: {
              subscriptionId: sub.id,
              previousStatus: sub.status,
              newStatus: SubscriptionStatus.SUSPENDED,
              reason: `Platform Administrator action: ${reason}`,
              changedById: user.id,
            },
          });
        }
      } else if (action === 'REACTIVATE') {
        if (sub) {
          await tx.tenantSubscription.update({
            where: { id: sub.id },
            data: { status: SubscriptionStatus.ACTIVE },
          });
          await tx.subscriptionStatusHistory.create({
            data: {
              subscriptionId: sub.id,
              previousStatus: sub.status,
              newStatus: SubscriptionStatus.ACTIVE,
              reason: `Platform Administrator action: ${reason}`,
              changedById: user.id,
            },
          });
        }
      } else if (action === 'EXTEND_TRIAL') {
        if (!tenant.trialRecord) {
          throw new BadRequestException('Organization does not have an active trial record');
        }

        const currentExpiry = new Date(tenant.trialRecord.expiresAt);
        const newExpiry = new Date(currentExpiry.getTime() + extendDays * 24 * 60 * 60 * 1000);

        await tx.trialRecord.update({
          where: { id: tenant.trialRecord.id },
          data: {
            expiresAt: newExpiry,
            extendedDays: tenant.trialRecord.extendedDays + extendDays,
            extensionReason: reason,
            status: 'ACTIVE',
          },
        });

        if (sub && sub.status === SubscriptionStatus.TRIALING) {
          await tx.tenantSubscription.update({
            where: { id: sub.id },
            data: { trialEnd: newExpiry, currentPeriodEnd: newExpiry },
          });
        }
      }

      await tx.platformAdminAuditLog.create({
        data: {
          actorUserId: user.id,
          action: `TENANT_${action}`,
          resourceType: 'Organization',
          resourceId: id,
          metadata: { reason, extendDays, action },
        },
      });

      return { success: true, message: `Tenant action ${action} executed successfully` };
    });
  }

  /**
   * Grant custom tenant entitlement override
   */
  async grantOverride(
    organizationId: string,
    dto: GrantEntitlementOverrideInput,
    user: AuthenticatedUser,
  ) {
    const override = await this.prisma.tenantEntitlementOverride.upsert({
      where: {
        organizationId_featureCode: {
          organizationId,
          featureCode: dto.featureCode,
        },
      },
      create: {
        organizationId,
        featureCode: dto.featureCode,
        isIncluded: dto.isIncluded ?? true,
        limitValue: dto.limitValue ?? null,
        grantedReason: dto.grantedReason,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        grantedById: user.id,
      },
      update: {
        isIncluded: dto.isIncluded ?? true,
        limitValue: dto.limitValue ?? null,
        grantedReason: dto.grantedReason,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        grantedById: user.id,
      },
    });

    await this.prisma.platformAdminAuditLog.create({
      data: {
        actorUserId: user.id,
        action: 'OVERRIDE_GRANTED',
        resourceType: 'TenantEntitlementOverride',
        resourceId: override.id,
        metadata: { organizationId, featureCode: dto.featureCode, limitValue: dto.limitValue },
      },
    });

    return override;
  }

  /**
   * Grant promotional credit to a tenant organization
   */
  async grantPromotionalCredit(
    organizationId: string,
    dto: GrantPromotionalCreditInput,
    user: AuthenticatedUser,
  ) {
    const code = `PROMO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const credit = await this.prisma.promotionalCredit.create({
      data: {
        organizationId,
        code,
        amountPaisa: dto.amountPaisa,
        remainingPaisa: dto.amountPaisa,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: true,
        grantedById: user.id,
        reason: dto.reason,
      },
    });

    await this.prisma.platformAdminAuditLog.create({
      data: {
        actorUserId: user.id,
        action: 'CREDIT_GRANTED',
        resourceType: 'PromotionalCredit',
        resourceId: credit.id,
        metadata: { organizationId, amountPaisa: dto.amountPaisa, code },
      },
    });

    return credit;
  }

  async listAuditLogs(page = 1, limit = 20) {
    const skip = (Math.max(1, page) - 1) * limit;

    const [items, totalItems] = await Promise.all([
      this.prisma.platformAdminAuditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { fullName: true, email: true } },
        },
      }),
      this.prisma.platformAdminAuditLog.count(),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    };
  }
}
