import { NotificationDispatcherService } from './notification-dispatcher.service';
import {
  NotificationChannel,
  NotificationJobStatus,
  QuietHoursPolicy,
  NotificationPriority,
  FallbackPolicy,
} from '@matabai/shared';

describe('NotificationDispatcherService', () => {
  let dispatcher: NotificationDispatcherService;
  let mockPrisma: any;
  let mockTemplateService: any;
  let mockPreferenceService: any;
  let mockRetryService: any;
  let mockWhatsAppAdapter: any;
  let mockInAppAdapter: any;
  let mockEmailAdapter: any;
  let mockSmsAdapter: any;

  beforeEach(() => {
    mockPrisma = {
      notificationJob: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'job-1' }),
      },
      notificationRule: {
        findFirst: jest.fn().mockResolvedValue({
          quietHoursPolicy: QuietHoursPolicy.ALLOW_IMMEDIATE,
          priority: NotificationPriority.NORMAL,
          fallbackPolicy: FallbackPolicy.NONE,
        }),
      },
      notificationAttempt: {
        create: jest.fn().mockResolvedValue({ id: 'attempt-1' }),
      },
      notificationEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
    };

    mockTemplateService = {
      resolveTemplate: jest.fn().mockResolvedValue({
        subject: 'Appointment Confirmation',
        messageBody: 'Hello {{patient_name}}, appointment confirmed.',
        providerTemplateName: 'appointment_confirmation',
        language: 'EN',
      }),
      render: jest.fn().mockReturnValue({
        subject: 'Appointment Confirmation',
        body: 'Hello Ali Ahmed, appointment confirmed.',
      }),
    };

    mockPreferenceService = {
      checkConsent: jest.fn().mockResolvedValue({ allowed: true }),
      evaluateQuietHours: jest.fn().mockResolvedValue({ isQuietHours: false, action: 'ALLOW' }),
    };

    mockRetryService = {
      handleFailure: jest.fn().mockResolvedValue({ status: NotificationJobStatus.RETRYING }),
    };

    mockWhatsAppAdapter = {
      channel: NotificationChannel.WHATSAPP,
      send: jest.fn().mockResolvedValue({
        success: true,
        status: 'SUCCESS',
        provider: 'meta_cloud_api',
        providerMessageId: 'wamid.123',
      }),
    };

    mockInAppAdapter = {
      channel: NotificationChannel.IN_APP,
      send: jest.fn().mockResolvedValue({
        success: true,
        status: 'SUCCESS',
        provider: 'in_app',
        providerMessageId: 'inapp-123',
      }),
    };

    mockEmailAdapter = {
      channel: NotificationChannel.EMAIL,
      send: jest.fn().mockResolvedValue({
        success: false,
        status: 'TEMPORARY_FAILURE',
        provider: 'resend_or_smtp',
        errorCode: 'EMAIL_PROVIDER_UNCONFIGURED',
        errorMessage: 'Email delivery provider is not configured. Delivery was not simulated.',
      }),
    };

    mockSmsAdapter = {
      channel: NotificationChannel.SMS,
      send: jest.fn().mockResolvedValue({
        success: true,
        status: 'SUCCESS',
        provider: 'twilio_sms',
        providerMessageId: 'SM12345',
      }),
    };

    dispatcher = new NotificationDispatcherService(
      mockPrisma,
      mockTemplateService,
      mockPreferenceService,
      mockRetryService,
      mockWhatsAppAdapter,
      mockInAppAdapter,
      mockEmailAdapter,
      mockSmsAdapter,
    );
  });

  it('should successfully dispatch job via primary channel and audit attempt', async () => {
    mockPrisma.notificationJob.findUnique.mockResolvedValue({
      id: 'job-1',
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      recipientId: 'pat-1',
      recipientType: 'PATIENT',
      eventType: 'APPOINTMENT_CONFIRMED',
      channel: NotificationChannel.WHATSAPP,
      status: NotificationJobStatus.PENDING,
      attempts: 0,
      maxAttempts: 3,
      payload: { patient_name: 'Ali Ahmed', recipient_phone: '03001234567' },
    });

    const success = await dispatcher.dispatchJob('job-1');

    expect(success).toBe(true);
    expect(mockWhatsAppAdapter.send).toHaveBeenCalled();
    expect(mockPrisma.notificationAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notificationJobId: 'job-1',
          channel: NotificationChannel.WHATSAPP,
          status: 'SUCCESS',
          providerMessageId: 'wamid.123',
        }),
      }),
    );
    expect(mockPrisma.notificationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({
          status: NotificationJobStatus.SENT,
        }),
      }),
    );
  });

  it('should suppress dispatch when recipient has opted out', async () => {
    mockPrisma.notificationJob.findUnique.mockResolvedValue({
      id: 'job-1',
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      recipientId: 'pat-1',
      recipientType: 'PATIENT',
      eventType: 'APPOINTMENT_CONFIRMED',
      channel: NotificationChannel.WHATSAPP,
      status: NotificationJobStatus.PENDING,
      attempts: 0,
      maxAttempts: 3,
      payload: { recipient_phone: '03001234567' },
    });

    mockPreferenceService.checkConsent.mockResolvedValue({
      allowed: false,
      reason: 'Recipient opted out of WHATSAPP communications',
    });

    const result = await dispatcher.dispatchJob('job-1');

    expect(result).toBe(false);
    expect(mockWhatsAppAdapter.send).not.toHaveBeenCalled();
    expect(mockPrisma.notificationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({
          status: NotificationJobStatus.SUPPRESSED,
          suppressionReason: expect.stringContaining('opted out'),
        }),
      }),
    );
  });

  it('should reschedule job when quiet hours policy is QUEUE_UNTIL_MORNING', async () => {
    mockPrisma.notificationJob.findUnique.mockResolvedValue({
      id: 'job-1',
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      recipientId: 'pat-1',
      recipientType: 'PATIENT',
      eventType: 'APPOINTMENT_REMINDER',
      channel: NotificationChannel.WHATSAPP,
      status: NotificationJobStatus.PENDING,
      attempts: 0,
      maxAttempts: 3,
      payload: { recipient_phone: '03001234567' },
    });

    const nextMorning = new Date(Date.now() + 8 * 60 * 60 * 1000);
    mockPreferenceService.evaluateQuietHours.mockResolvedValue({
      isQuietHours: true,
      action: 'RESCHEDULE',
      nextAllowedTime: nextMorning,
    });

    const result = await dispatcher.dispatchJob('job-1');

    expect(result).toBe(false);
    expect(mockWhatsAppAdapter.send).not.toHaveBeenCalled();
    expect(mockPrisma.notificationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({
          status: NotificationJobStatus.SCHEDULED,
          scheduledAt: nextMorning,
        }),
      }),
    );
  });

  it('should trigger fallback channel when primary channel fails and fallback policy is set', async () => {
    mockPrisma.notificationJob.findUnique.mockResolvedValue({
      id: 'job-1',
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      recipientId: 'pat-1',
      recipientType: 'PATIENT',
      eventType: 'APPOINTMENT_CONFIRMED',
      channel: NotificationChannel.WHATSAPP,
      status: NotificationJobStatus.PENDING,
      attempts: 0,
      maxAttempts: 3,
      payload: { recipient_phone: '03001234567' },
    });

    mockPrisma.notificationRule.findFirst.mockResolvedValue({
      quietHoursPolicy: QuietHoursPolicy.ALLOW_IMMEDIATE,
      priority: NotificationPriority.NORMAL,
      fallbackPolicy: FallbackPolicy.SMS, // SMS Fallback
    });

    // Primary WhatsApp fails
    mockWhatsAppAdapter.send.mockResolvedValueOnce({
      success: false,
      status: 'TEMPORARY_FAILURE',
      provider: 'meta_cloud_api',
      errorCode: 'WHATSAPP_INTEGRATION_NOT_CONNECTED',
      errorMessage: 'Integration disconnected',
    });

    const result = await dispatcher.dispatchJob('job-1');

    // Primary failed, fallback SMS succeeded
    expect(result).toBe(true);
    expect(mockWhatsAppAdapter.send).toHaveBeenCalled();
    expect(mockSmsAdapter.send).toHaveBeenCalled();
    expect(mockPrisma.notificationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationJobStatus.SENT,
        }),
      }),
    );
  });

  it('should report unconfigured provider without simulating delivery when email credentials missing', async () => {
    mockPrisma.notificationJob.findUnique.mockResolvedValue({
      id: 'job-email-1',
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      recipientId: 'pat-1',
      recipientType: 'PATIENT',
      eventType: 'APPOINTMENT_CONFIRMED',
      channel: NotificationChannel.EMAIL,
      status: NotificationJobStatus.PENDING,
      attempts: 0,
      maxAttempts: 3,
      payload: { recipient_email: 'patient@example.com' },
    });

    const result = await dispatcher.dispatchJob('job-email-1');

    expect(result).toBe(false);
    expect(mockEmailAdapter.send).toHaveBeenCalled();
    expect(mockRetryService.handleFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-email-1',
        error: expect.stringContaining('Email delivery provider is not configured'),
      }),
    );
  });
});
