import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppConversationService } from './whatsapp-conversation.service';
import { WhatsAppInboundService } from './whatsapp-inbound.service';
import { WhatsAppOutboundService } from './whatsapp-outbound.service';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';

describe('Phase 6: WhatsApp Human Receptionist Handover Tests', () => {
  let conversationService: WhatsAppConversationService;
  let inboundService: WhatsAppInboundService;
  let prisma: any;
  let outboundService: any;

  const mockReceptionist: AuthenticatedUser = {
    id: 'user-rec-1',
    authUserId: 'auth-rec-1',
    email: 'receptionist@alshifa.local',
    fullName: 'Fatima Receptionist',
    role: UserRole.RECEPTIONIST,
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    permissions: [],
  };

  const mockIntegration = {
    id: 'integration-1',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    phoneNumberId: 'phone-num-id-123',
    wabaId: 'waba-id-456',
    businessPhoneNumber: '+923001112233',
    status: 'CONNECTED',
  };

  beforeEach(async () => {
    prisma = {
      whatsappIntegration: {
        findUnique: jest.fn().mockResolvedValue(mockIntegration),
      },
      whatsappWebhookEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      whatsappContact: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'contact-1', ...data })),
        update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
      },
      whatsappConversation: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'conv-1', ...data })),
        update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
      },
      whatsappMessage: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 'msg-1' }),
        update: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      },
      patient: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    outboundService = {
      isWithin24HourWindow: jest.fn().mockReturnValue(true),
      sendTextMessage: jest.fn().mockResolvedValue({ id: 'msg-reply' }),
      sendTemplateMessage: jest.fn().mockResolvedValue({ id: 'msg-template' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppConversationService,
        WhatsAppInboundService,
        { provide: PrismaService, useValue: prisma },
        { provide: WhatsAppOutboundService, useValue: outboundService },
      ],
    }).compile();

    conversationService = module.get<WhatsAppConversationService>(WhatsAppConversationService);
    inboundService = module.get<WhatsAppInboundService>(WhatsAppInboundService);
  });

  describe('Inbound Human Handover Trigger', () => {
    it('should set conversation to HUMAN_HANDOVER when patient texts "HUMAN"', async () => {
      const webhookPayload = {
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { phone_number_id: 'phone-num-id-123' },
                  contacts: [{ wa_id: '923001234567', profile: { name: 'Zahid Khan' } }],
                  messages: [
                    {
                      id: 'wamid.inboundHandover',
                      from: '923001234567',
                      type: 'text',
                      text: { body: 'I need to speak to a human receptionist please' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await inboundService.processWebhookEvent(webhookPayload, 'evt_handover_test');

      expect(prisma.whatsappConversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'HUMAN_HANDOVER',
            handoverReason: 'PATIENT_KEYWORD_REQUEST',
          }),
        }),
      );
    });

    it('should update contact to OPTED_OUT when patient texts "STOP"', async () => {
      const webhookPayload = {
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { phone_number_id: 'phone-num-id-123' },
                  contacts: [{ wa_id: '923009998877', profile: { name: 'Ahmad' } }],
                  messages: [
                    {
                      id: 'wamid.inboundStop',
                      from: '923009998877',
                      type: 'text',
                      text: { body: 'STOP' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await inboundService.processWebhookEvent(webhookPayload, 'evt_stop_test');

      expect(prisma.whatsappContact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            consentStatus: 'OPTED_OUT',
            optOutReason: 'PATIENT_KEYWORD_OPT_OUT',
          }),
        }),
      );
    });
  });

  describe('Receptionist Handover Management', () => {
    it('should allow receptionist to claim a conversation', async () => {
      prisma.whatsappConversation.findUnique.mockResolvedValueOnce({
        id: 'conv-claim',
        clinicId: 'clinic-1',
        status: 'HUMAN_HANDOVER',
      });

      const claimed = await conversationService.claimConversation(mockReceptionist, 'conv-claim');

      expect(claimed).toBeDefined();
      expect(prisma.whatsappConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-claim' },
          data: { assignedUserId: mockReceptionist.id },
        }),
      );
    });

    it('should resolve a conversation', async () => {
      prisma.whatsappConversation.findUnique.mockResolvedValueOnce({
        id: 'conv-resolve',
        clinicId: 'clinic-1',
        status: 'HUMAN_HANDOVER',
      });

      const resolved = await conversationService.resolveConversation(mockReceptionist, 'conv-resolve');

      expect(resolved.status).toBe('RESOLVED');
      expect(prisma.whatsappConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-resolve' },
          data: expect.objectContaining({ status: 'RESOLVED', unreadCount: 0 }),
        }),
      );
    });

    it('should reopen a resolved conversation', async () => {
      prisma.whatsappConversation.findUnique.mockResolvedValueOnce({
        id: 'conv-reopen',
        clinicId: 'clinic-1',
        status: 'RESOLVED',
      });

      const reopened = await conversationService.reopenConversation(mockReceptionist, 'conv-reopen');

      expect(reopened.status).toBe('OPEN');
      expect(prisma.whatsappConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-reopen' },
          data: expect.objectContaining({ status: 'OPEN', resolvedAt: null }),
        }),
      );
    });

    it('should update contact consent status manually', async () => {
      prisma.whatsappContact.findUnique.mockResolvedValueOnce({
        id: 'contact-consent-update',
        clinicId: 'clinic-1',
      });

      await conversationService.updateContactConsent(
        mockReceptionist,
        'contact-consent-update',
        'OPTED_OUT',
        'PATIENT_VERBAL_REQUEST',
      );

      expect(prisma.whatsappContact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contact-consent-update' },
          data: expect.objectContaining({
            consentStatus: 'OPTED_OUT',
            optOutReason: 'PATIENT_VERBAL_REQUEST',
          }),
        }),
      );
    });
  });
});

