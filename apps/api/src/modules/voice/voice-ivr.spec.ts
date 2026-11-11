import { Test, TestingModule } from '@nestjs/testing';
import { VoiceIvrService } from './voice-ivr.service';
import { VoiceCallSessionService } from './voice-call-session.service';
import { TwilioVoiceAdapter } from './adapters/twilio-voice.adapter';
import { ConfigService } from '@nestjs/config';

describe('VoiceIvrService', () => {
  let service: VoiceIvrService;
  let twilioAdapter: TwilioVoiceAdapter;
  let sessionService: VoiceCallSessionService;

  const mockSession = {
    id: 'session-voice-123',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    providerCallId: 'CA123456789',
    callerPhone: '+923001234567',
    selectedLanguage: 'ur',
    messages: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceIvrService,
        {
          provide: TwilioVoiceAdapter,
          useValue: {
            generateWelcomeIvr: jest.fn().mockReturnValue('<Response><Gather>Welcome</Gather></Response>'),
            generateSpeechGather: jest.fn().mockReturnValue('<Response><Gather>Speech</Gather></Response>'),
          },
        },
        {
          provide: VoiceCallSessionService,
          useValue: {
            findOrCreateSession: jest.fn().mockResolvedValue(mockSession),
            getSession: jest.fn().mockResolvedValue(mockSession),
            recordEvent: jest.fn().mockResolvedValue({}),
            setLanguage: jest.fn().mockResolvedValue({ ...mockSession, selectedLanguage: 'ur' }),
            addMessage: jest.fn().mockResolvedValue({}),
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

    service = module.get<VoiceIvrService>(VoiceIvrService);
    twilioAdapter = module.get<TwilioVoiceAdapter>(TwilioVoiceAdapter);
    sessionService = module.get<VoiceCallSessionService>(VoiceCallSessionService);
  });

  describe('resolveLanguage', () => {
    it('should resolve Urdu from digit 1 or spoken urdu keywords', () => {
      expect(service.resolveLanguage('1')).toBe('ur');
      expect(service.resolveLanguage(undefined, 'اردو میں بات کریں')).toBe('ur');
      expect(service.resolveLanguage(undefined, 'I want urdu language')).toBe('ur');
    });

    it('should resolve Pashto from digit 2 or spoken pashto keywords', () => {
      expect(service.resolveLanguage('2')).toBe('ps');
      expect(service.resolveLanguage(undefined, 'پښتو ژبه')).toBe('ps');
      expect(service.resolveLanguage(undefined, 'pashto please')).toBe('ps');
    });

    it('should resolve English from digit 3 or spoken english keywords', () => {
      expect(service.resolveLanguage('3')).toBe('en');
      expect(service.resolveLanguage(undefined, 'english')).toBe('en');
      expect(service.resolveLanguage(undefined, 'angrezi')).toBe('en');
    });

    it('should fallback to Urdu by default when input is unknown', () => {
      expect(service.resolveLanguage('9')).toBe('ur');
      expect(service.resolveLanguage(undefined, 'unrecognized audio')).toBe('ur');
    });
  });

  describe('handleInboundCall', () => {
    it('should initialize session and return welcome IVR markup', async () => {
      const result = await service.handleInboundCall({
        CallSid: 'CA123456789',
        From: '+923001234567',
        To: '+92511234567',
      });

      expect(sessionService.findOrCreateSession).toHaveBeenCalledWith({
        providerCallId: 'CA123456789',
        callerPhone: '+923001234567',
        calledPhone: '+92511234567',
        direction: 'INBOUND',
      });
      expect(twilioAdapter.generateWelcomeIvr).toHaveBeenCalled();
      expect(result).toContain('<Response>');
    });
  });

  describe('handleLanguageSelection', () => {
    it('should set resolved language and initiate conversational speech gather', async () => {
      const result = await service.handleLanguageSelection({
        CallSid: 'CA123456789',
        Digits: '2',
      });

      expect(sessionService.setLanguage).toHaveBeenCalledWith('session-voice-123', 'ps');
      expect(sessionService.addMessage).toHaveBeenCalled();
      expect(twilioAdapter.generateSpeechGather).toHaveBeenCalled();
      expect(result).toContain('<Response>');
    });
  });
});

