import { MultilingualNluService } from './multilingual-nlu.service';
import { AiIntent } from '@matabai/shared';

describe('MultilingualNluService', () => {
  let service: MultilingualNluService;

  beforeEach(() => {
    service = new MultilingualNluService();
  });

  describe('Language Detection', () => {
    it('should detect English text correctly', () => {
      const result = service.analyze('I want to book an appointment with Dr. Sarah tomorrow');
      expect(result.detectedLanguage).toBe('en');
    });

    it('should detect Urdu script correctly', () => {
      const result = service.analyze('کیا ڈاکٹر علی کل دستیاب ہیں؟');
      expect(result.detectedLanguage).toBe('ur');
    });

    it('should detect Pashto script with unique characters', () => {
      const result = service.analyze('زه غواړم چې د ډاکټر سره د لیدنې وخت واخلم');
      expect(result.detectedLanguage).toBe('ps');
    });

    it('should detect Roman Urdu text', () => {
      const result = service.analyze('mujhe doctor ali se checkup karwana hai');
      expect(result.detectedLanguage).toBe('ur-Latn');
    });

    it('should detect Roman Pashto text', () => {
      const result = service.analyze('za doctor appointment jorawil ghwari');
      expect(result.detectedLanguage).toBe('ps-Latn');
    });

    it('should handle explicit language switch directives', () => {
      const resUrdu = service.analyze('Urdu please');
      expect(resUrdu.detectedLanguage).toBe('ur');

      const resEnglish = service.analyze('Switch to english please');
      expect(resEnglish.detectedLanguage).toBe('en');

      const resPashto = service.analyze('pashto please');
      expect(resPashto.detectedLanguage).toBe('ps');
    });
  });

  describe('Intent Classification', () => {
    it('should classify booking intent in English', () => {
      const result = service.analyze('Book an appointment with cardiologist on Friday');
      expect(result.intent).toBe(AiIntent.APPOINTMENT_BOOKING);
      expect(result.entities.specialty).toBe('cardiologist');
    });

    it('should classify availability check in Roman Urdu', () => {
      const result = service.analyze('Dr Ahmed ke available slots kab hain?');
      expect(result.intent).toBe(AiIntent.APPOINTMENT_AVAILABILITY);
      expect(result.entities.doctorName).toBe('Ahmed');
    });

    it('should classify queue token lookup', () => {
      const result = service.analyze('What is my token number and queue position?');
      expect(result.intent).toBe(AiIntent.QUEUE_STATUS);
    });

    it('should classify clinic working hours in Urdu script', () => {
      const result = service.analyze('کلینک کے اوقات کیا ہیں؟');
      expect(result.intent).toBe(AiIntent.WORKING_HOURS);
    });

    it('should classify location inquiries', () => {
      const result = service.analyze('Where is the clinic address located?');
      expect(result.intent).toBe(AiIntent.LOCATION_INFORMATION);
    });

    it('should classify greetings', () => {
      const result = service.analyze('Assalam o alaikum');
      expect(result.intent).toBe(AiIntent.GREETING);
    });
  });

  describe('Explicit Confirmation and Denial Detection', () => {
    it('should recognize explicit confirmations across scripts', () => {
      const resEn = service.analyze('yes');
      expect(resEn.entities.actionConfirmation).toBe(true);

      const resUr = service.analyze('جی ہاں');
      expect(resUr.entities.actionConfirmation).toBe(true);

      const resPs = service.analyze('هو');
      expect(resPs.entities.actionConfirmation).toBe(true);

      const resRoman = service.analyze('haan');
      expect(resRoman.entities.actionConfirmation).toBe(true);
    });

    it('should detect confirmation intent when context is pendingConfirmation', () => {
      const result = service.analyze('yes confirm', { pendingConfirmation: true });
      expect(result.intent).toBe(AiIntent.APPOINTMENT_CONFIRMATION);
    });
  });
});
