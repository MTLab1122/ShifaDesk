import { Injectable, Logger, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { CreateSubscriptionPlanInput, UpdateSubscriptionPlanInput } from '@matabai/validation';
import { FeatureCode } from '@matabai/shared';

@Injectable()
export class PlanService implements OnModuleInit {
  private readonly logger = new Logger(PlanService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.seedDefaultPlans();
    } catch (err: any) {
      this.logger.warn(`Could not seed default plans on startup: ${err?.message || err}`);
    }
  }

  /**
   * Seed default plans (Starter, Professional, Laboratory) if database has none
   */
  async seedDefaultPlans(): Promise<void> {
    const count = await this.prisma.subscriptionPlan.count();
    if (count > 0) {
      return;
    }

    this.logger.log('Seeding initial subscription plans...');

    const starterFeatures: string[] = [
      FeatureCode.APPOINTMENT_MANAGEMENT,
      FeatureCode.QUEUE_MANAGEMENT,
      FeatureCode.CLINICAL_EMR,
      FeatureCode.PRESCRIPTION_DOCUMENTATION,
      FeatureCode.WHATSAPP_RECEPTIONIST,
    ];

    const starterLimits: Record<string, number> = {
      [FeatureCode.DOCTORS_COUNT]: 1,
      [FeatureCode.STAFF_ACCOUNTS]: 3,
      [FeatureCode.CLINIC_BRANCHES]: 1,
      [FeatureCode.MONTHLY_WHATSAPP_MESSAGES]: 500,
      [FeatureCode.STORAGE_MB]: 1024,
    };

    const proFeatures: string[] = [
      ...starterFeatures,
      FeatureCode.AI_RECEPTIONIST,
      FeatureCode.VOICE_RECEPTIONIST,
      FeatureCode.ADVANCED_ANALYTICS,
      FeatureCode.CUSTOM_REPORT_BUILDER,
      FeatureCode.SCHEDULED_REPORTS,
    ];

    const proLimits: Record<string, number> = {
      [FeatureCode.DOCTORS_COUNT]: 5,
      [FeatureCode.STAFF_ACCOUNTS]: 15,
      [FeatureCode.CLINIC_BRANCHES]: 2,
      [FeatureCode.MONTHLY_WHATSAPP_MESSAGES]: 2000,
      [FeatureCode.MONTHLY_VOICE_MINUTES]: 200,
      [FeatureCode.SCHEDULED_REPORTS]: 5,
      [FeatureCode.STORAGE_MB]: 5120,
    };

    const labFeatures: string[] = [
      ...proFeatures,
      FeatureCode.LABORATORY_MANAGEMENT,
      FeatureCode.SECURE_REPORT_DELIVERY,
    ];

    const labLimits: Record<string, number> = {
      [FeatureCode.DOCTORS_COUNT]: 10,
      [FeatureCode.STAFF_ACCOUNTS]: 25,
      [FeatureCode.CLINIC_BRANCHES]: 3,
      [FeatureCode.MONTHLY_WHATSAPP_MESSAGES]: 5000,
      [FeatureCode.MONTHLY_VOICE_MINUTES]: 500,
      [FeatureCode.SCHEDULED_REPORTS]: 20,
      [FeatureCode.STORAGE_MB]: 10240,
    };

    const plansToSeed = [
      {
        name: 'Starter',
        code: 'STARTER',
        description: 'Engineered for single-doctor clinics and solo outpatient practices',
        monthlyPricePaisa: 699900, // PKR 6,999/mo
        annualPricePaisa: 6999000, // PKR 69,990/yr (~17% discount)
        trialDays: 14,
        displayOrder: 1,
        features: starterFeatures,
        limits: starterLimits,
      },
      {
        name: 'Professional',
        code: 'PROFESSIONAL',
        description: 'Engineered for multi-doctor polyclinics and specialist centers',
        monthlyPricePaisa: 1499900, // PKR 14,999/mo
        annualPricePaisa: 14999000, // PKR 149,990/yr
        trialDays: 14,
        displayOrder: 2,
        features: proFeatures,
        limits: proLimits,
      },
      {
        name: 'Laboratory',
        code: 'LABORATORY',
        description: 'Engineered for full diagnostic pathology laboratories and testing centers',
        monthlyPricePaisa: 1999900, // PKR 19,999/mo
        annualPricePaisa: 19999000, // PKR 199,990/yr
        trialDays: 14,
        displayOrder: 3,
        features: labFeatures,
        limits: labLimits,
      },
    ];

    for (const planData of plansToSeed) {
      await this.prisma.$transaction(async (tx) => {
        const plan = await tx.subscriptionPlan.create({
          data: {
            name: planData.name,
            code: planData.code,
            description: planData.description,
            monthlyPricePaisa: planData.monthlyPricePaisa,
            annualPricePaisa: planData.annualPricePaisa,
            currency: 'PKR',
            trialDays: planData.trialDays,
            isActive: true,
            displayOrder: planData.displayOrder,
          },
        });

        const version = await tx.subscriptionPlanVersion.create({
          data: {
            planId: plan.id,
            version: 1,
            monthlyPricePaisa: planData.monthlyPricePaisa,
            annualPricePaisa: planData.annualPricePaisa,
            currency: 'PKR',
            features: planData.features,
            limits: planData.limits,
            overagePolicy: 'BLOCK',
            gracePeriodDays: 7,
          },
        });

        // Create individual plan entitlements
        for (const feat of planData.features) {
          const limit = planData.limits[feat];
          await tx.planEntitlement.create({
            data: {
              planVersionId: version.id,
              featureCode: feat,
              isIncluded: true,
              limitType: limit !== undefined ? 'COUNT' : 'UNLIMITED',
              limitValue: limit ?? 0,
            },
          });
        }
      });
    }

    this.logger.log('Initial subscription plans seeded successfully.');
  }

  async listPlans(includeInactive = false) {
    return this.prisma.subscriptionPlan.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            entitlements: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async getPlanByCode(code: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            entitlements: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan '${code}' not found`);
    }

    return plan;
  }

  async getPlanById(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            entitlements: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID '${id}' not found`);
    }

    return plan;
  }

  async createPlan(dto: CreateSubscriptionPlanInput, actorUserId: string) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Plan code '${dto.code}' already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.create({
        data: {
          name: dto.name,
          code: dto.code.toUpperCase(),
          description: dto.description,
          monthlyPricePaisa: dto.monthlyPricePaisa,
          annualPricePaisa: dto.annualPricePaisa,
          currency: dto.currency || 'PKR',
          trialDays: dto.trialDays ?? 14,
          isActive: dto.isActive ?? true,
          displayOrder: dto.displayOrder ?? 0,
        },
      });

      const version = await tx.subscriptionPlanVersion.create({
        data: {
          planId: plan.id,
          version: 1,
          monthlyPricePaisa: dto.monthlyPricePaisa,
          annualPricePaisa: dto.annualPricePaisa,
          currency: dto.currency || 'PKR',
          features: dto.features || [],
          limits: dto.limits || {},
          overagePolicy: dto.overagePolicy || 'BLOCK',
          gracePeriodDays: dto.gracePeriodDays ?? 7,
        },
      });

      if (dto.features && Array.isArray(dto.features)) {
        for (const feat of dto.features) {
          const limit = dto.limits?.[feat];
          await tx.planEntitlement.create({
            data: {
              planVersionId: version.id,
              featureCode: feat,
              isIncluded: true,
              limitType: limit !== undefined ? 'COUNT' : 'UNLIMITED',
              limitValue: limit ?? 0,
            },
          });
        }
      }

      await tx.platformAdminAuditLog.create({
        data: {
          actorUserId,
          action: 'PLAN_CREATED',
          resourceType: 'SubscriptionPlan',
          resourceId: plan.id,
          metadata: { name: plan.name, code: plan.code, monthlyPricePaisa: plan.monthlyPricePaisa },
        },
      });

      return plan;
    });
  }

  async updatePlan(id: string, dto: UpdateSubscriptionPlanInput, actorUserId: string) {
    const plan = await this.getPlanById(id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Update plan base metadata
      const updatedPlan = await tx.subscriptionPlan.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
          ...(dto.trialDays !== undefined && { trialDays: dto.trialDays }),
          ...(dto.monthlyPricePaisa !== undefined && { monthlyPricePaisa: dto.monthlyPricePaisa }),
          ...(dto.annualPricePaisa !== undefined && { annualPricePaisa: dto.annualPricePaisa }),
        },
      });

      // 2. If pricing or features changed, create a new Plan Version to preserve historical subscriptions!
      const currentVersion = plan.versions[0];
      const hasPriceOrFeatureChange =
        (dto.monthlyPricePaisa !== undefined && dto.monthlyPricePaisa !== currentVersion?.monthlyPricePaisa) ||
        (dto.annualPricePaisa !== undefined && dto.annualPricePaisa !== currentVersion?.annualPricePaisa) ||
        dto.features !== undefined ||
        dto.limits !== undefined;

      if (hasPriceOrFeatureChange && currentVersion) {
        const nextVersionNum = currentVersion.version + 1;
        const features = dto.features ?? (currentVersion.features as string[]);
        const limits = dto.limits ?? (currentVersion.limits as Record<string, number>);

        const newVersion = await tx.subscriptionPlanVersion.create({
          data: {
            planId: id,
            version: nextVersionNum,
            monthlyPricePaisa: dto.monthlyPricePaisa ?? currentVersion.monthlyPricePaisa,
            annualPricePaisa: dto.annualPricePaisa ?? currentVersion.annualPricePaisa,
            currency: dto.currency ?? currentVersion.currency,
            features,
            limits,
            overagePolicy: dto.overagePolicy ?? currentVersion.overagePolicy,
            gracePeriodDays: dto.gracePeriodDays ?? currentVersion.gracePeriodDays,
          },
        });

        for (const feat of features) {
          const limit = limits[feat];
          await tx.planEntitlement.create({
            data: {
              planVersionId: newVersion.id,
              featureCode: feat,
              isIncluded: true,
              limitType: limit !== undefined ? 'COUNT' : 'UNLIMITED',
              limitValue: limit ?? 0,
            },
          });
        }
      }

      await tx.platformAdminAuditLog.create({
        data: {
          actorUserId,
          action: 'PLAN_UPDATED',
          resourceType: 'SubscriptionPlan',
          resourceId: plan.id,
          metadata: { id, updates: dto },
        },
      });

      return updatedPlan;
    });
  }

  async deletePlan(id: string, actorUserId: string) {
    await this.getPlanById(id);

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false },
    });

    await this.prisma.platformAdminAuditLog.create({
      data: {
        actorUserId,
        action: 'PLAN_DEACTIVATED',
        resourceType: 'SubscriptionPlan',
        resourceId: id,
        metadata: { code: plan.code },
      },
    });

    return { success: true, message: `Plan '${plan.name}' deactivated successfully` };
  }
}
