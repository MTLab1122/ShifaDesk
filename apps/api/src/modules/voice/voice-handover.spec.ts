import { Test, TestingModule } from '@nestjs/testing';
import { VoiceHandoverService } from './voice-handover.service';
import { PrismaService } from '../../common/database/prisma.service';
import { TwilioVoiceAdapter } from './adapters/twilio-voice.adapter';
import { VoiceCallSessionService } from './voice-call-session.service';
import { ConfigService } from '@nestjs/config';

describe('VoiceHandoverService', () => {
  let service: VoiceHandoverService;
  let prisma: PrismaService;
  let twilioAdapter: TwilioVoiceAdapter;

  const mockSession = {
    id: 'session-voice-123',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    providerCallId: 'CA123456789',
    callerPhone: '+923001234567',
    selectedLanguage: 'ur',
    clinic: { phone: '+92511234567' },
    messages: [
      { speaker: 'CALLER', messageText: 'مجھے استقبالیہ سے بات کرنی ہے۔' },
    ],
  };

  const mockHandoverRecord = {
    id: 'handover-rec-1',
    callSessionId: 'session-voice-123',
    transferTarget: '+92511234567',
    handoverReason: 'Caller requested human receptionist',
    transferStatus: 'PENDING',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceHandoverService,
        {
          provide: PrismaService,
          useValue: {
            voiceProviderSettings: {
              findFirst: jest.fn().mockResolvedValue({ humanTransferNumber: '+923009999999' }),
            },
            voiceHandoverRecord: {
              create: jest.fn().mockResolvedValue(mockHandoverRecord),
              findUnique: jest.fn().mockResolvedValue(mockHandoverRecord),
              update: jest.fn().mockResolvedValue({ ...mockHandoverRecord, transferStatus: 'COMPLETED' }),
            },
            voiceCallSession: {
              update: jest.fn().mockResolvedValue(mockSession),
            },
            userProfile: {
              findMany: jest.fn().mockResolvedValue([{ id: 'staff-1', fullName: 'Reception Staff' }]),
            },
            inAppNotification: {
              create: jest.fn().mockResolvedValue({}),
            },
          },
        },
        {
          provide: TwilioVoiceAdapter,
          useValue: {
            generateDialTransfer: jest.fn().mockReturnValue('<Response><Dial><Number>+923009999999</Number></Dial></Response>'),
            generateSayAndHangup: jest.fn().mockReturnValue('<Response><Say>Goodbye</Say><Hangup/></Response>'),
          },
        },
        {
          provide: VoiceCallSessionService,
          useValue: {
            getSession: jest.fn().mockResolvedValue(mockSession),
            addMessage: jest.fn().mockResolvedValue({}),
            recordEvent: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('https://api.matabai.com/api/v1'),
          },
        },
      ],
    }).compile();

    service = module.get<VoiceHandoverService>(VoiceHandoverService);
    prisma = module.get<PrismaService>(PrismaService);
    twilioAdapter = module.get<TwilioVoiceAdapter>(TwilioVoiceAdapter);
  });

  describe('initiateHandover', () => {
    it('should create handover record, alert receptionist staff, and generate TwiML dial markup', async () => {
      const result = await service.initiateHandover({
        callSessionId: 'session-voice-123',
        reason: 'Caller requested receptionist',
      });

      expect(prisma.voiceHandoverRecord.create).toHaveBeenCalled();
      expect(prisma.inAppNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientUserId: 'staff-1',
            category: 'OPERATIONAL',
          }),
        })
      );
      expect(twilioAdapter.generateDialTransfer).toHaveBeenCalled();
      expect(result).toContain('<Dial>');
    });
  });

  describe('handleTransferStatus', () => {
    it('should record COMPLETED status when recipient answers the dial', async () => {
      await service.handleTransferStatus({
        handoverId: 'handover-rec-1',
        DialCallStatus: 'completed',
        CallDuration: 45,
      });

      expect(prisma.voiceHandoverRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'handover-rec-1' },
          data: expect.objectContaining({ transferStatus: 'COMPLETED' }),
        })
      );
    });

    it('should record FAILED status and synthesize polite error when transfer fails', async () => {
      const result = await service.handleTransferStatus({
        handoverId: 'handover-rec-1',
        DialCallStatus: 'busy',
      });

      expect(prisma.voiceHandoverRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'handover-rec-1' },
          data: expect.objectContaining({ transferStatus: 'FAILED' }),
        })
      );
      expect(twilioAdapter.generateSayAndHangup).toHaveBeenCalled();
      expect(result).toContain('<Hangup/>');
    });
  });
});
