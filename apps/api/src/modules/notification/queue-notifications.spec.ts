import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationEventType, NotificationJobStatus, NotificationChannel } from '@matabai/shared';

describe('Queue Notifications & Staff Alerts', () => {
  let service: NotificationSchedulerService;
  let mockPrisma: any;
  let mockRulesService: any;

  beforeEach(() => {
    mockPrisma = {
      queueToken: {
        findUnique: jest.fn(),
      },
      notificationJob: {
        create: jest.fn().mockResolvedValue({ id: 'job-queue-1' }),
      },
      inAppNotification: {
        create: jest.fn().mockResolvedValue({ id: 'inapp-1' }),
      },
      organizationMembership: {
        findMany: jest.fn().mockResolvedValue([
          { userProfileId: 'staff-user-1' },
          { userProfileId: 'staff-user-2' },
        ]),
      },
    };

    mockRulesService = {
      resolveRules: jest.fn(),
    };

    service = new NotificationSchedulerService(mockPrisma, mockRulesService);
  });

  it('should enqueue token generated notification with queue estimates', async () => {
    mockPrisma.queueToken.findUnique.mockResolvedValue({
      id: 'tok-1',
      tokenNumber: 5,
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      clinic: { name: 'Main OPD' },
      patient: { id: 'pat-1', fullName: 'Bilal Khan', phone: '03001112233' },
      queueSession: { doctor: { fullName: 'Dr. Tariq' } },
    });

    mockRulesService.resolveRules.mockResolvedValue([
      {
        eventType: NotificationEventType.TOKEN_GENERATED,
        channel: NotificationChannel.WHATSAPP,
        scheduleOffsetMinutes: 0,
      },
    ]);

    await service.scheduleQueueNotifications('tok-1', NotificationEventType.TOKEN_GENERATED, {
      estimatedWaitTime: 20,
      patientsAhead: 4,
    });

    expect(mockPrisma.notificationJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientId: 'pat-1',
          eventType: NotificationEventType.TOKEN_GENERATED,
          channel: NotificationChannel.WHATSAPP,
          status: NotificationJobStatus.PENDING,
          payload: expect.objectContaining({
            token_number: 5,
            patients_ahead: 4,
            estimated_wait_time: 20,
          }),
        }),
      }),
    );
  });

  it('should enqueue urgent notification when token is called with room number', async () => {
    mockPrisma.queueToken.findUnique.mockResolvedValue({
      id: 'tok-1',
      tokenNumber: 5,
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      clinic: { name: 'Main OPD' },
      patient: { id: 'pat-1', fullName: 'Bilal Khan', phone: '03001112233' },
      queueSession: { doctor: { fullName: 'Dr. Tariq' } },
    });

    mockRulesService.resolveRules.mockResolvedValue([
      {
        eventType: NotificationEventType.TOKEN_CALLED,
        channel: NotificationChannel.WHATSAPP,
        scheduleOffsetMinutes: 0,
      },
    ]);

    await service.scheduleQueueNotifications('tok-1', NotificationEventType.TOKEN_CALLED, {
      roomNumber: 'Room 3',
    });

    expect(mockPrisma.notificationJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientId: 'pat-1',
          eventType: NotificationEventType.TOKEN_CALLED,
          payload: expect.objectContaining({
            token_number: 5,
            room_number: 'Room 3',
          }),
        }),
      }),
    );
  });

  it('should broadcast staff alert to all active clinic administrators and receptionists', async () => {
    await service.scheduleStaffAlert({
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      title: 'WhatsApp Handover Request',
      message: 'Patient Fatima requests urgent human receptionist assistance.',
      category: 'OPERATIONAL',
      relatedEntityType: 'CONVERSATION',
      relatedEntityId: 'conv-99',
    });

    expect(mockPrisma.organizationMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          status: 'ACTIVE',
        }),
      }),
    );

    expect(mockPrisma.inAppNotification.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.inAppNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientUserId: 'staff-user-1',
          title: 'WhatsApp Handover Request',
          category: 'OPERATIONAL',
        }),
      }),
    );
    expect(mockPrisma.inAppNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientUserId: 'staff-user-2',
          title: 'WhatsApp Handover Request',
        }),
      }),
    );
  });
});
