import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  NotificationEventType,
  NotificationJobStatus,
  InAppCategory,
} from '@matabai/shared';
import { NotificationRulesService } from './notification-rules.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: NotificationRulesService,
  ) {}

  /**
   * Helper to parse an appointment date & time string into a valid Date object
   * (e.g. appointmentDate: '2026-11-15', startTime: '10:30')
   */
  private parseAppointmentDateTime(dateStr: string, timeStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    // Interpreted as local clinic time (stored as ISO timestamp)
    return new Date(Date.UTC(year || 2026, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0));
  }

  /**
   * Schedule appointment notifications and reminders
   */
  async scheduleAppointmentNotifications(
    appointmentId: string,
    eventType: NotificationEventType | string,
  ): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        clinic: true,
        doctor: true,
        patient: true,
      },
    });

    if (!appointment || !appointment.patient) {
      this.logger.warn(`Cannot schedule notifications: Appointment ${appointmentId} or patient not found`);
      return;
    }

    const { organizationId, clinicId, doctor, patient, appointmentDate, startTime } = appointment;

    const basePayload = {
      appointment_id: appointment.id,
      appointment_number: appointment.appointmentNumber,
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: appointment.endTime,
      doctor_name: doctor.fullName,
      doctor_specialty: doctor.specialty,
      clinic_name: appointment.clinic.name,
      clinic_phone: appointment.clinic.phone || '',
      clinic_address: appointment.clinic.address || '',
      patient_name: patient.fullName,
      recipient_name: patient.fullName,
      recipient_phone: patient.phone,
      recipient_email: patient.email || undefined,
      cancellation_reason: appointment.cancellationReason || 'Administrative decision',
      language: 'EN',
    };

    // -------------------------------------------------------------------------
    // Handle Reschedule or Cancellation: Invalidate prior scheduled reminders
    // -------------------------------------------------------------------------
    if (
      eventType === NotificationEventType.APPOINTMENT_RESCHEDULED ||
      eventType === NotificationEventType.APPOINTMENT_CANCELLED
    ) {
      const cancelledCount = await this.prisma.notificationJob.updateMany({
        where: {
          relatedEntityType: 'APPOINTMENT',
          relatedEntityId: appointment.id,
          status: { in: [NotificationJobStatus.SCHEDULED, NotificationJobStatus.PENDING] },
        },
        data: {
          status: NotificationJobStatus.CANCELLED,
          suppressionReason: `Invalidated by ${eventType}`,
        },
      });

      this.logger.log(`Cancelled ${cancelledCount.count} pending reminder jobs for appointment ${appointment.id} due to ${eventType}`);
    }

    // -------------------------------------------------------------------------
    // 1. Dispatch Immediate Event Notification (BOOKED, CONFIRMED, RESCHEDULED, CANCELLED)
    // -------------------------------------------------------------------------
    const immediateRules = await this.rulesService.resolveRules(organizationId, clinicId, eventType);
    for (const rule of immediateRules) {
      const idempotencyKey = `apt-${appointment.id}-${eventType}-${rule.channel}-${Date.now()}`;

      await this.prisma.notificationJob.upsert({
        where: { idempotencyKey },
        create: {
          organizationId,
          clinicId,
          recipientId: patient.id,
          recipientType: 'PATIENT',
          eventType,
          channel: rule.channel,
          templateId: rule.templateId || null,
          relatedEntityType: 'APPOINTMENT',
          relatedEntityId: appointment.id,
          scheduledAt: new Date(),
          status: NotificationJobStatus.PENDING,
          idempotencyKey,
          payload: basePayload,
          attempts: 0,
          maxAttempts: 3,
        },
        update: {},
      });
    }

    // -------------------------------------------------------------------------
    // 2. Schedule Future Reminders (if BOOKED, CONFIRMED, or RESCHEDULED)
    // -------------------------------------------------------------------------
    if (
      eventType === NotificationEventType.APPOINTMENT_BOOKED ||
      eventType === NotificationEventType.APPOINTMENT_CONFIRMED ||
      eventType === NotificationEventType.APPOINTMENT_RESCHEDULED
    ) {
      const reminderRules = await this.rulesService.resolveRules(
        organizationId,
        clinicId,
        NotificationEventType.APPOINTMENT_REMINDER,
      );

      const appointmentDateTime = this.parseAppointmentDateTime(appointmentDate, startTime);
      const now = new Date();

      for (const rule of reminderRules) {
        // scheduleOffsetMinutes is negative for prior notifications (e.g. -1440 = 24h before)
        const offsetMs = rule.scheduleOffsetMinutes * 60 * 1000;
        const reminderScheduledAt = new Date(appointmentDateTime.getTime() + offsetMs);

        // Only schedule if the reminder time is in the future
        if (reminderScheduledAt > now) {
          const idempotencyKey = `apt-${appointment.id}-rem-${rule.scheduleOffsetMinutes}-${rule.channel}`;

          await this.prisma.notificationJob.upsert({
            where: { idempotencyKey },
            create: {
              organizationId,
              clinicId,
              recipientId: patient.id,
              recipientType: 'PATIENT',
              eventType: NotificationEventType.APPOINTMENT_REMINDER,
              channel: rule.channel,
              templateId: rule.templateId || null,
              relatedEntityType: 'APPOINTMENT',
              relatedEntityId: appointment.id,
              scheduledAt: reminderScheduledAt,
              status: NotificationJobStatus.SCHEDULED,
              idempotencyKey,
              payload: {
                ...basePayload,
                reminder_offset_minutes: Math.abs(rule.scheduleOffsetMinutes),
              },
              attempts: 0,
              maxAttempts: 3,
            },
            update: {
              scheduledAt: reminderScheduledAt,
              status: NotificationJobStatus.SCHEDULED,
              payload: {
                ...basePayload,
                reminder_offset_minutes: Math.abs(rule.scheduleOffsetMinutes),
              },
            },
          });

          this.logger.log(`Scheduled reminder for appointment ${appointment.id} at ${reminderScheduledAt.toISOString()} (offset: ${rule.scheduleOffsetMinutes}m)`);
        } else {
          this.logger.debug(`Skipping past reminder (offset ${rule.scheduleOffsetMinutes}m) for appointment ${appointment.id}`);
        }
      }
    }
  }

  /**
   * Schedule queue token notifications (generated, called, approaching, delayed)
   */
  async scheduleQueueNotifications(
    tokenId: string,
    eventType: NotificationEventType | string,
    extraData: {
      roomNumber?: string;
      delayMinutes?: number;
      patientsAhead?: number;
      estimatedWaitTime?: number;
    } = {},
  ): Promise<void> {
    const token = await this.prisma.queueToken.findUnique({
      where: { id: tokenId },
      include: {
        clinic: true,
        patient: true,
        queueSession: {
          include: {
            doctor: true,
          },
        },
      },
    });

    if (!token || !token.patient) {
      this.logger.warn(`Queue notification skipped: Token ${tokenId} or patient not found`);
      return;
    }

    const { organizationId, clinicId, patient, tokenNumber } = token;
    const doctor = token.queueSession?.doctor;

    const payload = {
      token_id: token.id,
      token_number: tokenNumber,
      clinic_name: token.clinic.name,
      doctor_name: doctor?.fullName || 'Duty Doctor',
      patient_name: patient.fullName,
      recipient_name: patient.fullName,
      recipient_phone: patient.phone,
      room_number: extraData.roomNumber || '1',
      delay_minutes: extraData.delayMinutes || 15,
      patients_ahead: extraData.patientsAhead !== undefined ? extraData.patientsAhead : 0,
      estimated_wait_time: extraData.estimatedWaitTime || 15,
      estimated_time: new Date(Date.now() + (extraData.delayMinutes || 15) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: 'EN',
    };

    const rules = await this.rulesService.resolveRules(organizationId, clinicId, eventType);
    for (const rule of rules) {
      const idempotencyKey = `tok-${token.id}-${eventType}-${Date.now()}`;

      await this.prisma.notificationJob.create({
        data: {
          organizationId,
          clinicId,
          recipientId: patient.id,
          recipientType: 'PATIENT',
          eventType,
          channel: rule.channel,
          templateId: rule.templateId || null,
          relatedEntityType: 'QUEUE_TOKEN',
          relatedEntityId: token.id,
          scheduledAt: new Date(),
          status: NotificationJobStatus.PENDING,
          idempotencyKey,
          payload,
          attempts: 0,
          maxAttempts: 3,
        },
      });

      this.logger.log(`Enqueued queue notification ${eventType} for token ${tokenNumber}`);
    }
  }

  /**
   * Schedule operational alert for clinic staff and administrators
   */
  async scheduleStaffAlert(params: {
    organizationId: string;
    clinicId?: string;
    title: string;
    message: string;
    category?: InAppCategory | string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }): Promise<void> {
    const {
      organizationId,
      clinicId,
      title,
      message,
      category = 'OPERATIONAL',
      relatedEntityType,
      relatedEntityId,
    } = params;

    // Find active staff and clinic admins in organization
    const memberships = await this.prisma.organizationMembership.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        role: { in: ['CLINIC_ADMIN', 'RECEPTIONIST'] },
      },
      select: { userProfileId: true },
    });

    for (const member of memberships) {
      await this.prisma.inAppNotification.create({
        data: {
          organizationId,
          clinicId: clinicId || null,
          recipientUserId: member.userProfileId,
          title,
          message,
          category,
          relatedEntityType: relatedEntityType || null,
          relatedEntityId: relatedEntityId || null,
        },
      });
    }

    this.logger.log(`Created staff in-app alert for ${memberships.length} staff members: "${title}"`);
  }

  /**
   * Schedule financial notifications (Invoice issued, payment received, refund)
   */
  async scheduleFinancialNotification(params: {
    organizationId: string;
    clinicId: string;
    patientId: string;
    eventType: NotificationEventType | string;
    relatedEntityType: 'INVOICE' | 'PAYMENT' | 'REFUND';
    relatedEntityId: string;
    payload: Record<string, any>;
  }): Promise<void> {
    const {
      organizationId,
      clinicId,
      patientId,
      eventType,
      relatedEntityType,
      relatedEntityId,
      payload,
    } = params;

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      this.logger.warn(`Cannot schedule financial notification: Patient ${patientId} not found`);
      return;
    }

    const rules = await this.rulesService.resolveRules(organizationId, clinicId, eventType);
    for (const rule of rules) {
      const idempotencyKey = `fin-${relatedEntityId}-${eventType}-${Date.now()}`;

      await this.prisma.notificationJob.create({
        data: {
          organizationId,
          clinicId,
          recipientId: patient.id,
          recipientType: 'PATIENT',
          eventType,
          channel: rule.channel,
          templateId: rule.templateId || null,
          relatedEntityType,
          relatedEntityId,
          scheduledAt: new Date(),
          status: NotificationJobStatus.PENDING,
          idempotencyKey,
          payload: {
            ...payload,
            recipient_name: patient.fullName,
            recipient_phone: patient.phone,
          },
          attempts: 0,
          maxAttempts: 3,
        },
      });

      this.logger.log(`Enqueued financial notification ${eventType} for ${relatedEntityType} ${relatedEntityId}`);
    }
  }

  /**
   * Schedule SaaS subscription, trial, and SaaS invoice notifications
   */
  async scheduleSubscriptionNotification(params: {
    organizationId: string;
    clinicId?: string;
    recipientUserId: string;
    eventType: NotificationEventType | string;
    relatedEntityType: 'SUBSCRIPTION' | 'SAAS_INVOICE' | 'SAAS_PAYMENT' | 'TRIAL';
    relatedEntityId: string;
    payload: Record<string, any>;
  }): Promise<void> {
    const {
      organizationId,
      clinicId,
      recipientUserId,
      eventType,
      relatedEntityType,
      relatedEntityId,
      payload,
    } = params;

    const userProfile = await this.prisma.userProfile.findUnique({
      where: { id: recipientUserId },
    });

    if (!userProfile) {
      this.logger.warn(`Cannot schedule subscription notification: User ${recipientUserId} not found`);
      return;
    }

    const idempotencyKey = `sub-${relatedEntityId}-${eventType}-${Date.now()}`;

    let targetClinicId = clinicId;
    if (!targetClinicId) {
      const primaryClinic = await this.prisma.clinic.findFirst({
        where: { organizationId },
        select: { id: true },
      });
      targetClinicId = primaryClinic?.id || '';
    }

    // 1. In-App notification for instant dashboard visibility
    await this.prisma.inAppNotification.create({
      data: {
        organizationId,
        clinicId: targetClinicId || null,
        recipientUserId: userProfile.id,
        category: 'OPERATIONAL',
        title: `Subscription Update: ${eventType.replace(/_/g, ' ')}`,
        message: payload.message || `Your subscription status or SaaS billing event (${eventType}) has been updated.`,
        relatedEntityType,
        relatedEntityId,
      },
    });

    // 2. Enqueue persistent notification job if clinicId exists
    if (targetClinicId) {
      await this.prisma.notificationJob.create({
        data: {
          organizationId,
          clinicId: targetClinicId,
          recipientId: userProfile.id,
          recipientType: 'STAFF',
          eventType,
          channel: 'IN_APP',
          templateId: null,
          relatedEntityType,
          relatedEntityId,
          scheduledAt: new Date(),
          status: NotificationJobStatus.PENDING,
          idempotencyKey,
          payload: {
            ...payload,
            recipient_name: userProfile.fullName,
            recipient_email: userProfile.email,
            recipient_phone: userProfile.phone,
          },
          attempts: 0,
          maxAttempts: 3,
        },
      });
    }

    this.logger.log(`Enqueued subscription notification ${eventType} for ${relatedEntityType} ${relatedEntityId}`);
  }
}
