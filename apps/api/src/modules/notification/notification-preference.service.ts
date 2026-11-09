import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  NotificationChannel,
  NotificationConsentStatus,
  NotificationConsentSource,
  QuietHoursPolicy,
  NotificationPriority,
} from '@matabai/shared';
import {
  SaveNotificationPreferenceDto,
  OptOutNotificationPreferenceDto,
} from '@matabai/validation';

export interface QuietHoursCheckResult {
  isQuietHours: boolean;
  action: 'ALLOW' | 'RESCHEDULE' | 'SUPPRESS';
  nextAllowedTime?: Date;
  reason?: string;
}

@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if recipient has opted out or disabled communications for a specific channel
   */
  async checkConsent(params: {
    organizationId: string;
    patientId?: string | null;
    userId?: string | null;
    channel: NotificationChannel | string;
  }): Promise<{ allowed: boolean; reason?: string }> {
    const { organizationId, patientId, userId, channel } = params;

    if (!patientId && !userId) {
      return { allowed: true };
    }

    const preference = await this.prisma.notificationPreference.findFirst({
      where: {
        organizationId,
        channel,
        ...(patientId ? { patientId } : {}),
        ...(userId ? { userId } : {}),
      },
    });

    if (!preference) {
      // Default to allowed if no explicit preference configured
      return { allowed: true };
    }

    if (!preference.enabled || preference.consentStatus === NotificationConsentStatus.OPTED_OUT) {
      return {
        allowed: false,
        reason: `Recipient opted out of ${channel} communications at ${preference.optedOutAt || preference.updatedAt}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Evaluate quiet hours for a clinic and priority
   */
  async evaluateQuietHours(params: {
    clinicId: string;
    scheduledAt: Date;
    policy: QuietHoursPolicy | string;
    priority: NotificationPriority | string;
  }): Promise<QuietHoursCheckResult> {
    const { clinicId, scheduledAt, policy, priority } = params;

    // High and Urgent priority alerts are never suppressed by quiet hours
    if (priority === NotificationPriority.URGENT || priority === NotificationPriority.HIGH) {
      return { isQuietHours: false, action: 'ALLOW' };
    }

    if (policy === QuietHoursPolicy.ALLOW_IMMEDIATE) {
      return { isQuietHours: false, action: 'ALLOW' };
    }

    // 1. Fetch clinic timezone
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    });

    const timeZone = clinic?.timezone || 'Asia/Karachi';

    // 2. Format local hour in clinic's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
      minute: 'numeric',
    });

    const parts = formatter.formatToParts(scheduledAt);
    const hourPart = parts.find(p => p.type === 'hour')?.value;
    const hour = hourPart ? parseInt(hourPart, 10) : scheduledAt.getUTCHours();

    // Quiet hours defined as 22:00 (10 PM) to 08:00 (8 AM)
    const isQuiet = hour >= 22 || hour < 8;

    if (!isQuiet) {
      return { isQuietHours: false, action: 'ALLOW' };
    }

    // 3. Apply quiet hours policy
    if (policy === QuietHoursPolicy.SUPPRESS) {
      return {
        isQuietHours: true,
        action: 'SUPPRESS',
        reason: `Suppressed due to clinic quiet hours policy (local hour: ${hour}:00 in ${timeZone})`,
      };
    }

    // QUEUE_UNTIL_MORNING: Reschedule to 08:00 next morning local time
    const nextAllowed = new Date(scheduledAt);
    if (hour >= 22) {
      // Advance to next calendar day
      nextAllowed.setUTCDate(nextAllowed.getUTCDate() + 1);
    }
    // Set to 08:00 local time (approximate in UTC by offset)
    nextAllowed.setUTCHours(3, 0, 0, 0); // 08:00 PKT is 03:00 UTC

    return {
      isQuietHours: true,
      action: 'RESCHEDULE',
      nextAllowedTime: nextAllowed,
      reason: `Queued until 08:00 AM next morning due to quiet hours policy in ${timeZone}`,
    };
  }

  /**
   * Handle opt-in / opt-out keyword from WhatsApp or other channels
   */
  async handleKeywordConsent(params: {
    organizationId: string;
    clinicId?: string;
    phoneNumber: string;
    messageText: string;
  }): Promise<{ actionTaken: boolean; status?: string }> {
    const text = params.messageText.trim().toUpperCase();
    const isOptOut = ['STOP', 'OPT-OUT', 'CANCEL', 'UNSUBSCRIBE', 'ROK', 'KHATAM'].includes(text);
    const isOptIn = ['START', 'UNSTOP', 'OPT-IN', 'SHURU'].includes(text);

    if (!isOptOut && !isOptIn) {
      return { actionTaken: false };
    }

    // Find patient by phone
    const patient = await this.prisma.patient.findFirst({
      where: {
        organizationId: params.organizationId,
        phone: { contains: params.phoneNumber.slice(-10) },
      },
    });

    if (patient) {
      await this.prisma.notificationPreference.upsert({
        where: {
          organizationId_patientId_channel: {
            organizationId: params.organizationId,
            patientId: patient.id,
            channel: NotificationChannel.WHATSAPP,
          },
        },
        create: {
          organizationId: params.organizationId,
          clinicId: params.clinicId,
          patientId: patient.id,
          channel: NotificationChannel.WHATSAPP,
          enabled: isOptIn,
          consentStatus: isOptOut ? NotificationConsentStatus.OPTED_OUT : NotificationConsentStatus.OPTED_IN,
          consentSource: NotificationConsentSource.WHATSAPP_KEYWORD,
          optedOutAt: isOptOut ? new Date() : null,
        },
        update: {
          enabled: isOptIn,
          consentStatus: isOptOut ? NotificationConsentStatus.OPTED_OUT : NotificationConsentStatus.OPTED_IN,
          consentSource: NotificationConsentSource.WHATSAPP_KEYWORD,
          optedOutAt: isOptOut ? new Date() : null,
        },
      });

      this.logger.log(`WhatsApp keyword consent updated for patient ${patient.id}: ${isOptOut ? 'OPTED_OUT' : 'OPTED_IN'}`);
      return { actionTaken: true, status: isOptOut ? 'OPTED_OUT' : 'OPTED_IN' };
    }

    return { actionTaken: false };
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------
  async savePreference(organizationId: string, dto: SaveNotificationPreferenceDto) {
    if (dto.patientId) {
      return this.prisma.notificationPreference.upsert({
        where: {
          organizationId_patientId_channel: {
            organizationId,
            patientId: dto.patientId,
            channel: dto.channel,
          },
        },
        create: {
          organizationId,
          clinicId: dto.clinicId,
          patientId: dto.patientId,
          channel: dto.channel,
          enabled: dto.enabled,
          consentStatus: dto.consentStatus,
          consentSource: dto.consentSource,
          optedOutAt: dto.consentStatus === NotificationConsentStatus.OPTED_OUT ? new Date() : null,
        },
        update: {
          enabled: dto.enabled,
          consentStatus: dto.consentStatus,
          consentSource: dto.consentSource,
          optedOutAt: dto.consentStatus === NotificationConsentStatus.OPTED_OUT ? new Date() : null,
        },
      });
    }

    if (dto.userId) {
      return this.prisma.notificationPreference.upsert({
        where: {
          organizationId_userId_channel: {
            organizationId,
            userId: dto.userId,
            channel: dto.channel,
          },
        },
        create: {
          organizationId,
          clinicId: dto.clinicId,
          userId: dto.userId,
          channel: dto.channel,
          enabled: dto.enabled,
          consentStatus: dto.consentStatus,
          consentSource: dto.consentSource,
          optedOutAt: dto.consentStatus === NotificationConsentStatus.OPTED_OUT ? new Date() : null,
        },
        update: {
          enabled: dto.enabled,
          consentStatus: dto.consentStatus,
          consentSource: dto.consentSource,
          optedOutAt: dto.consentStatus === NotificationConsentStatus.OPTED_OUT ? new Date() : null,
        },
      });
    }

    throw new BadRequestException('Either patientId or userId must be specified');
  }

  async optOut(organizationId: string, dto: OptOutNotificationPreferenceDto) {
    if (dto.patientId) {
      return this.prisma.notificationPreference.upsert({
        where: {
          organizationId_patientId_channel: {
            organizationId,
            patientId: dto.patientId,
            channel: dto.channel,
          },
        },
        create: {
          organizationId,
          patientId: dto.patientId,
          channel: dto.channel,
          enabled: false,
          consentStatus: NotificationConsentStatus.OPTED_OUT,
          consentSource: NotificationConsentSource.PATIENT_PORTAL,
          optedOutAt: new Date(),
        },
        update: {
          enabled: false,
          consentStatus: NotificationConsentStatus.OPTED_OUT,
          optedOutAt: new Date(),
        },
      });
    }

    if (dto.userId) {
      return this.prisma.notificationPreference.upsert({
        where: {
          organizationId_userId_channel: {
            organizationId,
            userId: dto.userId,
            channel: dto.channel,
          },
        },
        create: {
          organizationId,
          userId: dto.userId,
          channel: dto.channel,
          enabled: false,
          consentStatus: NotificationConsentStatus.OPTED_OUT,
          consentSource: NotificationConsentSource.ADMIN,
          optedOutAt: new Date(),
        },
        update: {
          enabled: false,
          consentStatus: NotificationConsentStatus.OPTED_OUT,
          optedOutAt: new Date(),
        },
      });
    }

    throw new BadRequestException('Either patientId or userId must be specified');
  }

  async getPreferences(organizationId: string, patientId?: string, userId?: string) {
    return this.prisma.notificationPreference.findMany({
      where: {
        organizationId,
        ...(patientId ? { patientId } : {}),
        ...(userId ? { userId } : {}),
      },
    });
  }
}
