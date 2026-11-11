import { Test, TestingModule } from '@nestjs/testing';
import { VoiceAiReceptionistService } from './voice-ai-receptionist.service';
import { VoiceCallSessionService } from './voice-call-session.service';
import { VoiceHandoverService } from './voice-handover.service';
import { TwilioVoiceAdapter } from './adapters/twilio-voice.adapter';
import { MultilingualNluService } from '../ai-conversation/multilingual-nlu.service';
import { AiToolsService } from '../ai-conversation/ai-tools.service';
import { NotificationSchedulerService } from '../notification/notification-scheduler.service';
import { ConfigService } from '@nestjs/config';
import { AiIntent, NotificationEventType } from '@matabai/shared';

describe('VoiceAiReceptionistService', () => {
  let service: VoiceAiReceptionistService;
  let handoverService: VoiceHandoverService;
  let twilioAdapter: TwilioVoiceAdapter;
  let aiToolsService: AiToolsService;
  let notificationScheduler: NotificationSchedulerService;

  const mockSession = {
    id: 'session-voice-123',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    patientId: 'patient-1',
    providerCallId: 'CA123456789',
    callerPhone: '+923001234567',
    selectedLanguage: 'ur',
    messages: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceAiReceptionistService,
        {
          provide: VoiceCallSessionService,
          useValue: {
            getSession: jest.fn().mockResolvedValue(mockSession),
            addMessage: jest.fn().mockResolvedValue({}),
            recordEvent: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: VoiceHandoverService,
          useValue: {
            initiateHandover: jest.fn().mockResolvedValue('<Response><Dial><Number>+923001234567</Number></Dial></Response>'),
          },
        },
        {
          provide: TwilioVoiceAdapter,
          useValue: {
            generateSpeechGather: jest.fn().mockImplementation((opts) => `<Response><Gather>${opts.promptText}</Gather></Response>`),
            generateSayAndHangup: jest.fn().mockImplementation((opts) => `<Response><Say>${opts.text}</Say><Hangup/></Response>`),
          },
        },
        {
          provide: MultilingualNluService,
          useValue: {
            analyzeInput: jest.fn().mockImplementation((text: string) => {
              const lower = text.toLowerCase();
              if (lower.includes('emergency') || lower.includes('سینے میں درد') || lower.includes('دل کا دورہ')) {
                return { intent: AiIntent.EMERGENCY_OR_URGENT_CONCERN, entities: {} };
              }
              if (lower.includes('medicine') || lower.includes('دوا')) {
                return { intent: AiIntent.MEDICAL_REQUEST, entities: {} };
              }
              if (lower.includes('receptionist') || lower.includes('انسان')) {
                return { intent: AiIntent.HUMAN_HANDOVER, entities: {} };
              }
              if (lower.includes('book') || lower.includes('اپائنٹمنٹ')) {
                return { intent: AiIntent.APPOINTMENT_BOOKING, entities: {} };
              }
              if (lower.includes('token') || lower.includes('ٹوکن')) {
                return { intent: AiIntent.QUEUE_STATUS, entities: {} };
              }
              return { intent: AiIntent.CLINIC_INFORMATION, entities: {} };
            }),
          },
        },
        {
          provide: AiToolsService,
          useValue: {
            getClinicInformation: jest.fn().mockResolvedValue({
              id: 'clinic-1',
              name: 'Shifa Clinic',
              address: 'Blue Area Islamabad',
            }),
            searchDoctors: jest.fn().mockResolvedValue([
              { id: 'doc-1', fullName: 'Dr. Ahmad Khan', specialty: 'General Physician', consultationFee: 1500 },
            ]),
            getQueueStatus: jest.fn().mockResolvedValue({
              activeSession: true,
              currentServingToken: 'A014',
              waitingCount: 3,
            }),
            createAppointment: jest.fn().mockResolvedValue({
              id: 'apt-voice-123',
              clinicId: 'clinic-1',
              doctorId: 'doc-1',
              patientId: 'patient-1',
            }),
          },
        },
        {
          provide: NotificationSchedulerService,
          useValue: {
            scheduleAppointmentNotifications: jest.fn().mockResolvedValue(undefined),
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

    service = module.get<VoiceAiReceptionistService>(VoiceAiReceptionistService);
    handoverService = module.get<VoiceHandoverService>(VoiceHandoverService);
    twilioAdapter = module.get<TwilioVoiceAdapter>(TwilioVoiceAdapter);
    aiToolsService = module.get<AiToolsService>(AiToolsService);
    notificationScheduler = module.get<NotificationSchedulerService>(NotificationSchedulerService);
  });

  describe('Medical Safety Protocol', () => {
    it('should immediately provide Rescue 1122 guidance and hangup for emergency speech', async () => {
      const result = await service.processVoiceDialogue({
        CallSid: 'CA123456789',
        SpeechResult: 'سینے میں شدید درد ہے، دل کا دورہ پڑ رہا ہے',
      });

      expect(twilioAdapter.generateSayAndHangup).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('1122'),
        })
      );
      expect(result).toContain('<Hangup/>');
    });

    it('should strictly refuse medical diagnosis / prescriptions and ask to book doctor appointment', async () => {
      const result = await service.processVoiceDialogue({
        CallSid: 'CA123456789',
        SpeechResult: 'میرا سر درد ہے مجھے کونسی دوا کھانی چاہیے؟',
      });

      expect(twilioAdapter.generateSpeechGather).toHaveBeenCalledWith(
        expect.objectContaining({
          promptText: expect.stringContaining('بحیثیت انتظامی اسسٹنٹ'),
        })
      );
      expect(result).toContain('Gather');
    });
  });

  describe('Human Handover', () => {
    it('should initiate handover when caller requests to speak with a human or receptionist', async () => {
      await service.processVoiceDialogue({
        CallSid: 'CA123456789',
        SpeechResult: 'کسی انسان سے بات کروا دیں، ریسیپشنسٹ',
      });

      expect(handoverService.initiateHandover).toHaveBeenCalledWith({
        callSessionId: 'session-voice-123',
        reason: 'Caller requested human receptionist',
      });
    });

    it('should trigger handover directly when caller enters DTMF 0', async () => {
      await service.processVoiceDialogue({
        CallSid: 'CA123456789',
        Digits: '0',
      });

      expect(handoverService.initiateHandover).toHaveBeenCalledWith({
        callSessionId: 'session-voice-123',
        reason: 'Caller pressed 0 for receptionist',
      });
    });
  });

  describe('Conversational Tools Execution', () => {
    it('should search doctors and book an appointment with notification schedule trigger', async () => {
      await service.processVoiceDialogue({
        CallSid: 'CA123456789',
        SpeechResult: 'ڈاکٹر احمد کے ساتھ اپائنٹمنٹ بک کریں',
      });

      expect(aiToolsService.searchDoctors).toHaveBeenCalled();
      expect(aiToolsService.createAppointment).toHaveBeenCalled();
      expect(notificationScheduler.scheduleAppointmentNotifications).toHaveBeenCalledWith(
        'apt-voice-123',
        NotificationEventType.APPOINTMENT_BOOKED
      );
    });

    it('should retrieve queue token status and verbally inform caller', async () => {
      await service.processVoiceDialogue({
        CallSid: 'CA123456789',
        SpeechResult: 'میرا ٹوکن نمبر معلوم کرنا ہے',
      });

      expect(aiToolsService.getQueueStatus).toHaveBeenCalled();
      expect(twilioAdapter.generateSpeechGather).toHaveBeenCalledWith(
        expect.objectContaining({
          promptText: expect.stringContaining('A014'),
        })
      );
    });
  });
});
