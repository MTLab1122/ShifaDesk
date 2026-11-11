import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TwilioVoiceAdapter } from './adapters/twilio-voice.adapter';
import * as crypto from 'crypto';

describe('TwilioVoiceAdapter', () => {
  let adapter: TwilioVoiceAdapter;
  const mockAuthToken = 'mock_auth_token_1234567890abcdef';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwilioVoiceAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'TWILIO_ACCOUNT_SID') return 'mock_twilio_account_sid_for_test';
              if (key === 'TWILIO_AUTH_TOKEN') return mockAuthToken;
              if (key === 'TWILIO_PHONE_NUMBER') return '+15551234567';
              return null;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<TwilioVoiceAdapter>(TwilioVoiceAdapter);
  });

  it('should report provider name and configured status', () => {
    expect(adapter.getProviderName()).toBe('TWILIO');
    expect(adapter.isConfigured()).toBe(true);
  });

  describe('generateWelcomeIvr', () => {
    it('should generate TwiML XML with multilingual prompts and gather options', () => {
      const twiml = adapter.generateWelcomeIvr({
        greetingText: 'Welcome',
        languageOptions: [
          { digit: '1', language: 'ur', label: 'اردو' },
          { digit: '2', language: 'ps', label: 'پښتو' },
          { digit: '3', language: 'en', label: 'English' },
        ],
        gatherActionUrl: 'https://example.com/api/v1/webhooks/voice/gather?step=language',
      });

      expect(twiml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(twiml).toContain('<Response>');
      expect(twiml).toContain('<Gather input="speech dtmf" numDigits="1"');
      expect(twiml).toContain('اردو کے لیے ایک دبائیں');
      expect(twiml).toContain('د پښتو لپاره دوه کېکاږئ');
      expect(twiml).toContain('For English, press three');
      expect(twiml).toContain('</Response>');
    });
  });

  describe('generateSpeechGather', () => {
    it('should generate speech gather with correct language recognition tag', () => {
      const urTwiml = adapter.generateSpeechGather({
        promptText: 'آپ کی کیا مدد کر سکتا ہوں؟',
        language: 'ur',
        actionUrl: 'https://example.com/api/v1/webhooks/voice/gather',
      });

      expect(urTwiml).toContain('language="ur-PK"');
      expect(urTwiml).toContain('speechModel="phone_call"');
      expect(urTwiml).toContain('آپ کی کیا مدد کر سکتا ہوں؟');

      const psTwiml = adapter.generateSpeechGather({
        promptText: 'څنګه مرسته وکړم؟',
        language: 'ps',
        actionUrl: 'https://example.com/api/v1/webhooks/voice/gather',
      });

      expect(psTwiml).toContain('language="ps-AF"');
    });
  });

  describe('generateDialTransfer', () => {
    it('should generate TwiML <Dial> with target phone number and whisper greeting', () => {
      const twiml = adapter.generateDialTransfer({
        transferNumber: '+923001234567',
        actionUrl: 'https://example.com/api/v1/webhooks/voice/transfer-status',
        timeoutSeconds: 20,
      });

      expect(twiml).toContain('<Dial timeout="20"');
      expect(twiml).toContain('<Number>+923001234567</Number>');
      expect(twiml).toContain('action="https://example.com/api/v1/webhooks/voice/transfer-status"');
    });
  });

  describe('generateSayAndHangup', () => {
    it('should generate speech and terminal <Hangup/>', () => {
      const twiml = adapter.generateSayAndHangup({
        text: 'شکریہ۔ اللہ حافظ۔',
        language: 'ur',
      });

      expect(twiml).toContain('شکریہ۔ اللہ حافظ۔');
      expect(twiml).toContain('<Hangup/>');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should validate official Twilio HMAC-SHA1 signature', () => {
      const url = 'https://myclinic.matabai.com/api/v1/webhooks/voice/incoming';
      const params = {
        CallSid: 'CA1234567890abcdef',
        From: '+923001234567',
        To: '+15551234567',
      };

      // Construct correct signature: url + sorted key/values
      const keys = Object.keys(params).sort();
      let data = url;
      for (const k of keys) {
        data += k + (params as any)[k];
      }
      const validSignature = crypto
        .createHmac('sha1', mockAuthToken)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64');

      const result = adapter.verifyWebhookSignature({
        url,
        params,
        signatureHeader: validSignature,
        authToken: mockAuthToken,
      });

      expect(result).toBe(true);
    });

    it('should reject invalid or tampered signature', () => {
      const url = 'https://myclinic.matabai.com/api/v1/webhooks/voice/incoming';
      const params = { CallSid: 'CA1234567890abcdef' };

      const result = adapter.verifyWebhookSignature({
        url,
        params,
        signatureHeader: 'invalid_signature_string',
        authToken: mockAuthToken,
      });

      expect(result).toBe(false);
    });
  });
});

