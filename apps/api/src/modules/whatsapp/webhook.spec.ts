import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WhatsAppInboundService } from './whatsapp-inbound.service';
import { PrismaService } from '../../common/database/prisma.service';

describe('Phase 6: WhatsApp Webhook & Verification Tests', () => {
  let controller: WhatsAppWebhookController;
  let inboundService: any;
  let prisma: any;

  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      META_WEBHOOK_VERIFY_TOKEN: 'test_verify_token_12345',
      META_APP_SECRET: 'test_meta_app_secret_abc123',
    };

    inboundService = {
      processWebhookEvent: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      whatsappIntegration: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      whatsappWebhookEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppWebhookController],
      providers: [
        { provide: WhatsAppInboundService, useValue: inboundService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    controller = module.get<WhatsAppWebhookController>(WhatsAppWebhookController);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Webhook Verification (GET /webhooks/whatsapp)', () => {
    it('should return challenge string when token matches environment token', async () => {
      const challenge = 'test_challenge_98765';
      const result = await controller.verifyWebhook(
        'subscribe',
        'test_verify_token_12345',
        challenge,
      );

      expect(result).toBe(challenge);
    });

    it('should return challenge and mark integration verified when matching database token', async () => {
      prisma.whatsappIntegration.findFirst.mockResolvedValueOnce({
        id: 'integration-1',
        webhookVerifyToken: 'clinic_custom_verify_token',
      });

      const challenge = 'clinic_challenge_xyz';
      const result = await controller.verifyWebhook(
        'subscribe',
        'clinic_custom_verify_token',
        challenge,
      );

      expect(result).toBe(challenge);
      expect(prisma.whatsappIntegration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'integration-1' },
          data: expect.objectContaining({ isWebhookVerified: true, status: 'CONNECTED' }),
        }),
      );
    });

    it('should throw ForbiddenException if hub.mode is not subscribe', async () => {
      await expect(
        controller.verifyWebhook('unsubscribe', 'test_verify_token_12345', 'challenge'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if verify token does not match', async () => {
      await expect(
        controller.verifyWebhook('subscribe', 'wrong_token', 'challenge'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Webhook Ingestion & Signature Validation (POST /webhooks/whatsapp)', () => {
    it('should accept valid HMAC-SHA256 signature and process event', async () => {
      const payload = {
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  messages: [{ id: 'wamid.test1234', text: { body: 'Hello' } }],
                },
              },
            ],
          },
        ],
      };

      const payloadString = JSON.stringify(payload);
      const secret = process.env.META_APP_SECRET || '';
      const validHmac = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(Buffer.from(payloadString))
        .digest('hex')}`;

      const mockReq: any = { rawBody: Buffer.from(payloadString) };

      const response = await controller.receiveWebhook(validHmac, payload, mockReq);

      expect(response).toEqual({ status: 'EVENT_RECEIVED' });
      expect(inboundService.processWebhookEvent).toHaveBeenCalled();
    });

    it('should reject invalid HMAC signature with ForbiddenException', async () => {
      const payload = { test: true };
      const invalidSignature = 'sha256=invalid_hex_digest_0000000000000000000000000000000000000000000000000000000000000000';
      const mockReq: any = { rawBody: Buffer.from(JSON.stringify(payload)) };

      await expect(
        controller.receiveWebhook(invalidSignature, payload, mockReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject missing signature header when META_APP_SECRET is configured', async () => {
      const payload = { test: true };
      const mockReq: any = { rawBody: Buffer.from(JSON.stringify(payload)) };

      await expect(
        controller.receiveWebhook('', payload, mockReq),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

