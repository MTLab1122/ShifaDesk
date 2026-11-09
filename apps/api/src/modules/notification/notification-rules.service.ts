import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  NotificationChannel,
  NotificationEventType,
  NotificationPriority,
  QuietHoursPolicy,
  FallbackPolicy,
} from '@matabai/shared';
import {
  CreateNotificationRuleDto,
  UpdateNotificationRuleDto,
} from '@matabai/validation';

export interface EvaluatedRule {
  id?: string;
  eventType: string;
  channel: string;
  templateId?: string | null;
  scheduleOffsetMinutes: number;
  priority: string;
  quietHoursPolicy: string;
  fallbackPolicy: string;
}

@Injectable()
export class NotificationRulesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve rules for an event type.
   * If clinic has custom rules configured in DB, returns them.
   * Otherwise returns default sensible rules for the event type.
   */
  async resolveRules(
    organizationId: string,
    clinicId: string,
    eventType: string,
  ): Promise<EvaluatedRule[]> {
    const rules = await this.prisma.notificationRule.findMany({
      where: {
        organizationId,
        clinicId,
        eventType,
        enabled: true,
      },
      orderBy: { scheduleOffsetMinutes: 'asc' },
    });

    if (rules.length > 0) {
      return rules.map(r => ({
        id: r.id,
        eventType: r.eventType,
        channel: r.channel,
        templateId: r.templateId,
        scheduleOffsetMinutes: r.scheduleOffsetMinutes,
        priority: r.priority,
        quietHoursPolicy: r.quietHoursPolicy,
        fallbackPolicy: r.fallbackPolicy,
      }));
    }

    // Default system rules when no custom clinic rule is configured
    return this.getDefaultRules(eventType);
  }

  private getDefaultRules(eventType: string): EvaluatedRule[] {
    switch (eventType) {
      case NotificationEventType.APPOINTMENT_BOOKED:
      case NotificationEventType.APPOINTMENT_CONFIRMED:
        return [
          {
            eventType,
            channel: NotificationChannel.WHATSAPP,
            scheduleOffsetMinutes: 0,
            priority: NotificationPriority.NORMAL,
            quietHoursPolicy: QuietHoursPolicy.ALLOW_IMMEDIATE,
            fallbackPolicy: FallbackPolicy.NONE,
          },
        ];

      case NotificationEventType.APPOINTMENT_REMINDER:
        return [
          {
            eventType,
            channel: NotificationChannel.WHATSAPP,
            scheduleOffsetMinutes: -1440, // 24 hours prior
            priority: NotificationPriority.NORMAL,
            quietHoursPolicy: QuietHoursPolicy.QUEUE_UNTIL_MORNING,
            fallbackPolicy: FallbackPolicy.NONE,
          },
          {
            eventType,
            channel: NotificationChannel.WHATSAPP,
            scheduleOffsetMinutes: -120, // 2 hours prior
            priority: NotificationPriority.NORMAL,
            quietHoursPolicy: QuietHoursPolicy.QUEUE_UNTIL_MORNING,
            fallbackPolicy: FallbackPolicy.NONE,
          },
        ];

      case NotificationEventType.APPOINTMENT_RESCHEDULED:
      case NotificationEventType.APPOINTMENT_CANCELLED:
        return [
          {
            eventType,
            channel: NotificationChannel.WHATSAPP,
            scheduleOffsetMinutes: 0,
            priority: NotificationPriority.HIGH,
            quietHoursPolicy: QuietHoursPolicy.ALLOW_IMMEDIATE,
            fallbackPolicy: FallbackPolicy.NONE,
          },
        ];

      case NotificationEventType.TOKEN_GENERATED:
        return [
          {
            eventType,
            channel: NotificationChannel.WHATSAPP,
            scheduleOffsetMinutes: 0,
            priority: NotificationPriority.NORMAL,
            quietHoursPolicy: QuietHoursPolicy.ALLOW_IMMEDIATE,
            fallbackPolicy: FallbackPolicy.NONE,
          },
        ];

      case NotificationEventType.TOKEN_CALLED:
      case NotificationEventType.TOKEN_APPROACHING:
        return [
          {
            eventType,
            channel: NotificationChannel.WHATSAPP,
            scheduleOffsetMinutes: 0,
            priority: NotificationPriority.URGENT,
            quietHoursPolicy: QuietHoursPolicy.ALLOW_IMMEDIATE,
            fallbackPolicy: FallbackPolicy.NONE,
          },
        ];

      case NotificationEventType.QUEUE_DELAYED:
        return [
          {
            eventType,
            channel: NotificationChannel.WHATSAPP,
            scheduleOffsetMinutes: 0,
            priority: NotificationPriority.HIGH,
            quietHoursPolicy: QuietHoursPolicy.ALLOW_IMMEDIATE,
            fallbackPolicy: FallbackPolicy.NONE,
          },
        ];

      case NotificationEventType.HUMAN_ASSISTANCE_REQUESTED:
      case NotificationEventType.SYSTEM_ALERT:
      case NotificationEventType.INTEGRATION_ERROR:
        return [
          {
            eventType,
            channel: NotificationChannel.IN_APP,
            scheduleOffsetMinutes: 0,
            priority: NotificationPriority.HIGH,
            quietHoursPolicy: QuietHoursPolicy.ALLOW_IMMEDIATE,
            fallbackPolicy: FallbackPolicy.NONE,
          },
        ];

      default:
        return [
          {
            eventType,
            channel: NotificationChannel.WHATSAPP,
            scheduleOffsetMinutes: 0,
            priority: NotificationPriority.NORMAL,
            quietHoursPolicy: QuietHoursPolicy.ALLOW_IMMEDIATE,
            fallbackPolicy: FallbackPolicy.NONE,
          },
        ];
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------
  async findAll(organizationId: string, clinicId?: string) {
    return this.prisma.notificationRule.findMany({
      where: {
        organizationId,
        ...(clinicId ? { clinicId } : {}),
      },
      include: { template: true },
      orderBy: [{ clinicId: 'asc' }, { eventType: 'asc' }],
    });
  }

  async findById(organizationId: string, id: string) {
    const rule = await this.prisma.notificationRule.findFirst({
      where: { id, organizationId },
      include: { template: true },
    });
    if (!rule) {
      throw new NotFoundException(`Notification rule with id ${id} not found`);
    }
    return rule;
  }

  async create(organizationId: string, dto: CreateNotificationRuleDto) {
    return this.prisma.notificationRule.create({
      data: {
        organizationId,
        clinicId: dto.clinicId,
        eventType: dto.eventType,
        channel: dto.channel,
        templateId: dto.templateId || null,
        enabled: dto.enabled !== undefined ? dto.enabled : true,
        scheduleOffsetMinutes: dto.scheduleOffsetMinutes || 0,
        priority: dto.priority || NotificationPriority.NORMAL,
        quietHoursPolicy: dto.quietHoursPolicy || QuietHoursPolicy.ALLOW_IMMEDIATE,
        fallbackPolicy: dto.fallbackPolicy || FallbackPolicy.NONE,
      },
      include: { template: true },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateNotificationRuleDto) {
    await this.findById(organizationId, id);
    return this.prisma.notificationRule.update({
      where: { id },
      data: {
        ...(dto.eventType && { eventType: dto.eventType }),
        ...(dto.channel && { channel: dto.channel }),
        ...(dto.templateId !== undefined && { templateId: dto.templateId }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.scheduleOffsetMinutes !== undefined && { scheduleOffsetMinutes: dto.scheduleOffsetMinutes }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.quietHoursPolicy && { quietHoursPolicy: dto.quietHoursPolicy }),
        ...(dto.fallbackPolicy && { fallbackPolicy: dto.fallbackPolicy }),
      },
      include: { template: true },
    });
  }

  async delete(organizationId: string, id: string) {
    await this.findById(organizationId, id);
    return this.prisma.notificationRule.delete({
      where: { id },
    });
  }
}
