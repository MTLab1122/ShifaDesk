import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WhatsAppOutboundService } from './whatsapp-outbound.service';
import { PrismaService } from '../../common/database/prisma.service';
import { MetaApiClient } from './meta-api.client';
import { WhatsAppEncryptionService } from './whatsapp-encryption.service';

describe('Phase 6: WhatsApp Outbound & 24-Hour Policy Tests', () => {
  let service: WhatsAppOutboundService;
  let prisma: any;
  let metaClient: any;
  let encryptionService: any;

  const mockIntegration = {
    id: 'integration-1',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    phoneNumberId: 'phone-num-id-123',
    wabaId: 'waba-id-456',
    businessPhoneNumber: '+923001112233',
    accessTokenEncrypted: 'enc-token',
    status: 'CONNECTED',
    isWebhookVerified: true,
  };

  beforeEach(async () => {
    prisma = {
      whatsappIntegration: {
        findUnique: jest.fn().mockResolvedValue(mockIntegration),
      },
      whatsappContact: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'contact-1', ...data })),
        update: jest.fn().mockResolvedValue({ id: 'contact-1' }),
      },
      whatsappConversation: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'conv-1', ...data })),
        update: jest.fn().mockResolvedValue({ id: 'conv-1' }),
      },
      whatsappMessage: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'msg-1', ...data })),
      },
    };

    metaClient = {
      sendTextMessage: jest.fn().mockResolvedValue({
        messaging_product: 'whatsapp',
        messages: [{ id: 'wamid.outbound123' }],
      }),
      sendTemplateMessage: jest.fn().mockResolvedValue({
        messaging_product: 'whatsapp',
        messages: [{ id: 'wamid.tpl123' }],
      }),
    };

    encryptionService = {
      decrypt: jest.fn().mockReturnValue('decrypted_token_xyz'),
      encrypt: jest.fn().mockReturnValue('encrypted_token_xyz'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppOutboundService,
        { provide: PrismaService, useValue: prisma },
        { provide: MetaApiClient, useValue: metaClient },
        { provide: WhatsAppEncryptionService, useValue: encryptionService },
      ],
    }).compile();

    service = module.get<WhatsAppOutboundService>(WhatsAppOutboundService);
  });

  describe('24-Hour Service Window Calculation', () => {
    it('should return true if customer message was received within 24 hours', () => {
      const recent = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      expect(service.isWithin24HourWindow(recent)).toBe(true);
    });

    it('should return false if customer message was received over 24 hours ago', () => {
      const old = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      expect(service.isWithin24HourWindow(old)).toBe(false);
    });

    it('should return false if no customer message has ever been received', () => {
      expect(service.isWithin24HourWindow(null)).toBe(false);
      expect(service.isWithin24HourWindow(undefined)).toBe(false);
    });
  });

  describe('Outbound Text Messaging Policy', () => {
    it('should successfully send text message when within 24-hour window', async () => {
      const recentMessageAt = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      prisma.whatsappConversation.findUnique.mockResolvedValueOnce({
        id: 'conv-1',
        clinicId: 'clinic-1',
        lastCustomerMessageAt: recentMessageAt,
      });

      const result = await service.sendTextMessage({
        clinicId: 'clinic-1',
        to: '+923001234567',
        message: 'Hello, your doctor is ready.',
        conversationId: 'conv-1',
      });

      expect(result).toBeDefined();
      expect(metaClient.sendTextMessage).toHaveBeenCalledWith(
        mockIntegration.phoneNumberId,
        'decrypted_token_xyz',
        '923001234567',
        'Hello, your doctor is ready.',
      );
    });

    it('should throw BadRequestException when sending free-form text outside 24-hr window', async () => {
      const expiredMessageAt = new Date(Date.now() - 26 * 60 * 60 * 1000); // 26 hours ago
      prisma.whatsappConversation.findUnique.mockResolvedValueOnce({
        id: 'conv-1',
        clinicId: 'clinic-1',
        lastCustomerMessageAt: expiredMessageAt,
      });

      await expect(
        service.sendTextMessage({
          clinicId: 'clinic-1',
          to: '+923001234567',
          message: 'Hello outside window',
          conversationId: 'conv-1',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(metaClient.sendTextMessage).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if recipient has opted out', async () => {
      prisma.whatsappContact.findUnique.mockResolvedValueOnce({
        id: 'contact-opted-out',
        consentStatus: 'OPTED_OUT',
      });

      await expect(
        service.sendTextMessage({
          clinicId: 'clinic-1',
          to: '+923001234567',
          message: 'Hello',
        }),
      ).rejects.toThrow(/Recipient has opted out/);
    });
  });

  describe('Outbound Template Messaging Policy', () => {
    it('should successfully send approved template message even outside 24-hour window', async () => {
      const result = await service.sendTemplateMessage({
        clinicId: 'clinic-1',
        to: '+923001234567',
        templateName: 'appointment_confirmation',
        languageCode: 'en_US',
        parameters: ['Ali', 'Dr. Fatima', '2026-11-10', '10:00 AM', 'A001'],
      });

      expect(result).toBeDefined();
      expect(metaClient.sendTemplateMessage).toHaveBeenCalledWith(
        mockIntegration.phoneNumberId,
        'decrypted_token_xyz',
        '923001234567',
        'appointment_confirmation',
        'en_US',
        ['Ali', 'Dr. Fatima', '2026-11-10', '10:00 AM', 'A001'],
      );
    });

    it('should throw BadRequestException for template message if recipient has opted out', async () => {
      prisma.whatsappContact.findUnique.mockResolvedValueOnce({
        id: 'contact-opted-out',
        consentStatus: 'OPTED_OUT',
      });

      await expect(
        service.sendTemplateMessage({
          clinicId: 'clinic-1',
          to: '+923001234567',
          templateName: 'appointment_confirmation',
        }),
      ).rejects.toThrow(/Recipient has opted out/);
    });
  });

  describe('Integration Connection Checks', () => {
    it('should throw BadRequestException if clinic has no WhatsApp integration', async () => {
      prisma.whatsappIntegration.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.sendTextMessage({
          clinicId: 'clinic-without-whatsapp',
          to: '+923001234567',
          message: 'Test',
        }),
      ).rejects.toThrow(/not connected or active/);
    });
  });
});

