import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { WhatsAppOutboundService } from './whatsapp-outbound.service';
import { PrismaService } from '../../common/database/prisma.service';

describe('Phase 6: WhatsApp Healthcare Notification Engine Tests', () => {
  let service: WhatsAppNotificationService;
  let prisma: any;
  let outboundService: any;

  beforeEach(async () => {
    prisma = {
      appointment: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      queueToken: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      clinicQueueSession: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    outboundService = {
      sendTemplateMessage: jest.fn().mockResolvedValue({ id: 'msg-tpl-sent' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppNotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: WhatsAppOutboundService, useValue: outboundService },
      ],
    }).compile();

    service = module.get<WhatsAppNotificationService>(WhatsAppNotificationService);
  });

  describe('Appointment Lifecycle Notifications', () => {
    it('should dispatch appointment confirmation template to patient phone', async () => {
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 'apt-1',
        clinicId: 'clinic-1',
        appointmentDate: '2026-11-12',
        startTime: '10:00',
        clinic: { name: 'Al-Shifa Hospital' },
        doctor: { fullName: 'Dr. Fatima Tariq' },
        patient: { fullName: 'Muhammad Talha', phone: '+923001234567' },
      });

      const success = await service.notifyAppointmentConfirmed('apt-1');

      expect(success).toBe(true);
      expect(outboundService.sendTemplateMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: 'clinic-1',
          to: '+923001234567',
          templateName: 'appointment_confirmation',
          parameters: expect.arrayContaining(['Muhammad Talha', 'Dr. Fatima Tariq', '2026-11-12', '10:00']),
        }),
      );
    });

    it('should return false gracefully if appointment patient has no phone', async () => {
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 'apt-no-phone',
        clinicId: 'clinic-1',
        patient: { fullName: 'Unknown', phone: null },
      });

      const success = await service.notifyAppointmentConfirmed('apt-no-phone');

      expect(success).toBe(false);
      expect(outboundService.sendTemplateMessage).not.toHaveBeenCalled();
    });
  });

  describe('Queue Lifecycle Notifications', () => {
    it('should dispatch queue_token_called template when patient is summoned', async () => {
      prisma.queueToken.findUnique.mockResolvedValueOnce({
        id: 'token-1',
        clinicId: 'clinic-1',
        tokenDisplay: 'A014',
        patient: { phone: '+923007654321' },
        queueSession: {
          doctor: { fullName: 'Dr. Tariq Khan' },
        },
      });

      const success = await service.notifyQueueTokenCalled('token-1', 'Room 3');

      expect(success).toBe(true);
      expect(outboundService.sendTemplateMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: 'clinic-1',
          to: '+923007654321',
          templateName: 'queue_token_called',
          parameters: ['A014', 'Room 3', 'Dr. Tariq Khan'],
        }),
      );
    });

    it('should broadcast queue_delay_notice to all waiting patients in session', async () => {
      prisma.clinicQueueSession.findUnique.mockResolvedValueOnce({
        id: 'session-delay',
        clinicId: 'clinic-1',
        doctor: { fullName: 'Dr. Tariq Khan' },
        tokens: [
          { tokenDisplay: 'A015', patient: { phone: '+923001111111' }, estimatedWaitMinutes: 20 },
          { tokenDisplay: 'A016', patient: { phone: '+923002222222' }, estimatedWaitMinutes: 35 },
        ],
      });

      const count = await service.notifyQueueDelay('session-delay', 15);

      expect(count).toBe(2);
      expect(outboundService.sendTemplateMessage).toHaveBeenCalledTimes(2);
    });
  });
});

