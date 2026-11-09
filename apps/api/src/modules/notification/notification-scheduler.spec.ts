import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationRulesService } from './notification-rules.service';
import { NotificationEventType, NotificationJobStatus, NotificationChannel } from '@matabai/shared';

describe('NotificationSchedulerService', () => {
  let service: NotificationSchedulerService;
  let mockPrisma: any;
  let mockRulesService: any;

  beforeEach(() => {
    mockPrisma = {
      appointment: {
        findUnique: jest.fn(),
      },
      notificationJob: {
        upsert: jest.fn().mockResolvedValue({ id: 'job-1' }),
        create: jest.fn().mockResolvedValue({ id: 'job-created' }),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      inAppNotification: {
        create: jest.fn().mockResolvedValue({ id: 'inapp-1' }),
      },
      organizationMembership: {
        findMany: jest.fn().mockResolvedValue([{ userProfileId: 'staff-user-1' }]),
      },
      queueToken: {
        findUnique: jest.fn(),
      },
    };

    mockRulesService = {
      resolveRules: jest.fn(),
    };

    service = new NotificationSchedulerService(mockPrisma, mockRulesService);
  });

  it('should schedule immediate confirmation and future reminders on appointment confirmation', async () => {
    // Future appointment: 2 days from now
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const dateStr = futureDate.toISOString().split('T')[0]!;

    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'apt-1',
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      appointmentNumber: 'APT-2026-0001',
      appointmentDate: dateStr,
      startTime: '10:00',
      endTime: '10:20',
      clinic: { name: 'Central Clinic', phone: '03001234567' },
      doctor: { fullName: 'Dr. Sarah Khan', specialty: 'Cardiology' },
      patient: { id: 'pat-1', fullName: 'Ali Ahmed', phone: '03009998877' },
    });

    // Immediate confirmation rule
    mockRulesService.resolveRules
      .mockResolvedValueOnce([
        {
          eventType: NotificationEventType.APPOINTMENT_CONFIRMED,
          channel: NotificationChannel.WHATSAPP,
          scheduleOffsetMinutes: 0,
        },
      ])
      // Reminder rules: -1440m (24h before), -120m (2h before)
      .mockResolvedValueOnce([
        {
          eventType: NotificationEventType.APPOINTMENT_REMINDER,
          channel: NotificationChannel.WHATSAPP,
          scheduleOffsetMinutes: -1440,
        },
        {
          eventType: NotificationEventType.APPOINTMENT_REMINDER,
          channel: NotificationChannel.WHATSAPP,
          scheduleOffsetMinutes: -120,
        },
      ]);

    await service.scheduleAppointmentNotifications('apt-1', NotificationEventType.APPOINTMENT_CONFIRMED);

    // Immediate confirmation job upserted
    expect(mockPrisma.notificationJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          idempotencyKey: expect.stringContaining('apt-apt-1-APPOINTMENT_CONFIRMED'),
        }),
        create: expect.objectContaining({
          eventType: NotificationEventType.APPOINTMENT_CONFIRMED,
          recipientId: 'pat-1',
        }),
      }),
    );

    // 2 reminder jobs upserted (both are in the future)
    expect(mockPrisma.notificationJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idempotencyKey: 'apt-apt-1-rem--1440-WHATSAPP' },
        create: expect.objectContaining({
          eventType: NotificationEventType.APPOINTMENT_REMINDER,
          status: NotificationJobStatus.SCHEDULED,
        }),
      }),
    );
    expect(mockPrisma.notificationJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idempotencyKey: 'apt-apt-1-rem--120-WHATSAPP' },
        create: expect.objectContaining({
          eventType: NotificationEventType.APPOINTMENT_REMINDER,
          status: NotificationJobStatus.SCHEDULED,
        }),
      }),
    );
  });

  it('should invalidate pending reminders when an appointment is rescheduled', async () => {
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const dateStr = futureDate.toISOString().split('T')[0]!;

    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'apt-1',
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      appointmentNumber: 'APT-2026-0001',
      appointmentDate: dateStr,
      startTime: '14:00',
      endTime: '14:20',
      clinic: { name: 'Central Clinic' },
      doctor: { fullName: 'Dr. Sarah Khan', specialty: 'Cardiology' },
      patient: { id: 'pat-1', fullName: 'Ali Ahmed', phone: '03009998877' },
    });

    mockRulesService.resolveRules
      .mockResolvedValueOnce([{ eventType: NotificationEventType.APPOINTMENT_RESCHEDULED, channel: NotificationChannel.WHATSAPP, scheduleOffsetMinutes: 0 }])
      .mockResolvedValueOnce([]);

    await service.scheduleAppointmentNotifications('apt-1', NotificationEventType.APPOINTMENT_RESCHEDULED);

    // Verified invalidation: cancelled existing scheduled/pending reminders
    expect(mockPrisma.notificationJob.updateMany).toHaveBeenCalledWith({
      where: {
        relatedEntityType: 'APPOINTMENT',
        relatedEntityId: 'apt-1',
        status: { in: [NotificationJobStatus.SCHEDULED, NotificationJobStatus.PENDING] },
      },
      data: {
        status: NotificationJobStatus.CANCELLED,
        suppressionReason: `Invalidated by ${NotificationEventType.APPOINTMENT_RESCHEDULED}`,
      },
    });
  });

  it('should invalidate pending reminders and dispatch cancellation on appointment cancellation', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'apt-1',
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      appointmentNumber: 'APT-2026-0001',
      appointmentDate: '2026-11-20',
      startTime: '10:00',
      endTime: '10:20',
      cancellationReason: 'Patient unavailable',
      clinic: { name: 'Central Clinic' },
      doctor: { fullName: 'Dr. Sarah Khan', specialty: 'Cardiology' },
      patient: { id: 'pat-1', fullName: 'Ali Ahmed', phone: '03009998877' },
    });

    mockRulesService.resolveRules.mockResolvedValueOnce([
      { eventType: NotificationEventType.APPOINTMENT_CANCELLED, channel: NotificationChannel.WHATSAPP, scheduleOffsetMinutes: 0 },
    ]);

    await service.scheduleAppointmentNotifications('apt-1', NotificationEventType.APPOINTMENT_CANCELLED);

    expect(mockPrisma.notificationJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationJobStatus.CANCELLED,
        }),
      }),
    );
  });
});
