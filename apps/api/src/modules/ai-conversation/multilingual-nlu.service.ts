import { Injectable } from '@nestjs/common';
import { AiIntent } from '@matabai/shared';

export interface NluAnalysisResult {
  detectedLanguage: string; // 'en', 'ur', 'ps', 'ur-Latn', 'ps-Latn'
  intent: AiIntent;
  confidence: number;
  entities: {
    doctorName?: string;
    specialty?: string;
    date?: string; // YYYY-MM-DD
    time?: string; // HH:mm
    appointmentNumber?: string;
    tokenDisplay?: string;
    actionConfirmation?: boolean; // true for "yes", "confirm", "haan", "ho"
  };
}

// Emergency keywords across all supported languages
const EMERGENCY_KEYWORDS = [
  'chest pain', 'severe bleeding', 'cant breathe', 'cannot breathe', 'difficulty breathing',
  'heart attack', 'unconscious', 'fainted', 'poisoning', 'seizure', 'stroke', 'emergency',
  // Urdu Script
  'سینے میں درد', 'سانس نہیں آرہی', 'خون بہہ رہا ہے', 'بے ہوش', 'دل کا دورہ', 'ہنگامی',
  // Roman Urdu
  'seene me dard', 'seene mein dard', 'saans nahi aa rahi', 'khoon nikal raha hai',
  'behosh', 'dil ka daura', 'emergency hai', 'chhati me dard',
  // Pashto
  'د سینې درد', 'ساه بندیدل', 'وینه بهیدل', 'بی هوشه', 'بیړنی',
  // Roman Pashto
  'da seene dard', 'sah bandedal', 'wena bahedal', 'behosha', 'beranai',
];

// Medical request keywords across languages
const MEDICAL_ADVICE_KEYWORDS = [
  'prescribe', 'prescription', 'medicine for', 'what medicine', 'dosage', 'cure',
  'diagnose', 'symptoms of', 'my report says', 'interpret report', 'treatment for',
  // Urdu Script
  'نسخہ', 'دوائی بتائیں', 'علاج کیا ہے', 'رپورٹ دیکھ کر بتائیں', 'طبی مشورہ', 'دوائی', 'علاج',
  // Roman Urdu
  'dawai batayein', 'dawaii', 'dawai', 'dawa', 'konsi medicine', 'ilaj kya hai', 'ilaj batao', 'ilaj', 'nuskha', 'report dekh kar',
  'mujhe bimari hai', 'dawa batao', 'bukhar',
  // Pashto
  'دارو', 'علاج', 'طبی مشوره', 'نسخه',
  // Roman Pashto
  'daro wakhlam', 'daro khaye', 'ilaj sa day',
];

// Human handover keywords
const HANDOVER_PATTERNS = [
  'human', 'receptionist', 'talk to person', 'agent', 'operator', 'staff',
  'انسان سے بات', 'عملے سے بات', 'آپریٹر',
  'human se baat', 'receptionist se baat', 'insan se baat karwao', 'bande se baat',
  'انسان سره خبرې', 'استازی سره خبرې',
  'insan sara khabare', 'receptionist sara',
];

// Language explicit switch keywords
const LANG_SWITCH_PATTERNS: Record<string, string[]> = {
  en: ['speak in english', 'in english please', 'english', 'switch to english'],
  ur: ['urdu mein baat karein', 'urdu please', 'اردو میں بات کریں', 'اردو'],
  ps: ['pashto ke khabare ka', 'pashto please', 'پښتو', 'پښتو کې خبرې وکړئ'],
};

@Injectable()
export class MultilingualNluService {
  /**
   * Complete NLU pipeline: language detection, intent classification, entity extraction
   */
  analyzeInput(text: string, currentContext?: Record<string, unknown>): NluAnalysisResult {
    return this.analyze(text, currentContext);
  }

  analyze(text: string, currentContext?: Record<string, unknown>): NluAnalysisResult {
    const raw = text.trim();
    const normalized = raw.toLowerCase();

    // 1. Detect Language
    const detectedLanguage = this.detectLanguage(raw, normalized);

    // 2. High-Priority Safety: Emergency & Urgent Concerns
    if (this.matchesAny(normalized, EMERGENCY_KEYWORDS)) {
      return {
        detectedLanguage,
        intent: AiIntent.EMERGENCY_OR_URGENT_CONCERN,
        confidence: 0.99,
        entities: {},
      };
    }

    // 3. High-Priority Safety: Medical Advice / Diagnosis / Prescriptions
    if (this.matchesAny(normalized, MEDICAL_ADVICE_KEYWORDS)) {
      return {
        detectedLanguage,
        intent: AiIntent.MEDICAL_REQUEST,
        confidence: 0.95,
        entities: {},
      };
    }

    // 4. Human Handover Request
    if (this.matchesAny(normalized, HANDOVER_PATTERNS)) {
      return {
        detectedLanguage,
        intent: AiIntent.HUMAN_HANDOVER,
        confidence: 0.98,
        entities: {},
      };
    }

    // 5. Extract Administrative Entities
    const entities = this.extractEntities(normalized, currentContext);

    // 6. Explicit Confirmation Check (for multi-turn booking state)
    if (
      normalized === 'yes' ||
      normalized === 'haan' ||
      normalized === 'ji haan' ||
      normalized === 'confirm' ||
      normalized === 'ہاں' ||
      normalized === 'جی ہاں' ||
      normalized === 'هو' ||
      normalized.includes('جی ہاں') ||
      normalized.startsWith('yes ') ||
      normalized.startsWith('haan ')
    ) {
      entities.actionConfirmation = true;
      if (currentContext?.pendingConfirmation) {
        return {
          detectedLanguage,
          intent: AiIntent.APPOINTMENT_CONFIRMATION,
          confidence: 0.98,
          entities,
        };
      }
    }

    // 7. Classify Intent
    const intent = this.classifyIntent(normalized, entities, currentContext);

    return {
      detectedLanguage,
      intent,
      confidence: 0.9,
      entities,
    };
  }

  /**
   * Robust language identifier supporting native scripts & romanized variants
   */
  detectLanguage(raw: string, normalized: string): string {
    // Explicit switch checks
    for (const [lang, patterns] of Object.entries(LANG_SWITCH_PATTERNS)) {
      if (patterns.some((p) => normalized.includes(p))) {
        return lang;
      }
    }

    // Pashto Specific Unicode Characters
    // ۍ, ې, ږ, ښ, ځ, څ, ډ, ټ, ڼ
    const pashtoLetters = /[\u067C\u0681\u0685\u0696\u069A\u06BC\u06D0\u06CD]/;
    if (pashtoLetters.test(raw)) {
      return 'ps';
    }

    // Urdu / Arabic Unicode Range
    const arabicUrduRange = /[\u0600-\u06FF]/;
    if (arabicUrduRange.test(raw)) {
      return 'ur';
    }

    // Roman Pashto Detection
    const romanPashtoKeywords = ['dera manana', 'staso', 'sangay', 'khair', 'wroor', 'zama', 'starge', 'khatam', 'za ', 'ghwari', 'jorawil', 'sara '];
    if (romanPashtoKeywords.some((w) => normalized.includes(w))) {
      return 'ps-Latn';
    }

    // Roman Urdu Detection
    const romanUrduKeywords = [
      'apka', 'kya', 'hai', 'shukriya', 'dikhana', 'wakt', 'kab', 'batayein', 'mujhe',
      'bhejein', 'chahiye', 'karni hai', 'doctor sahab', 'aaj', 'kal', 'fees kitni',
      'clinic kahan', 'appointment lena', 'token number', 'meri bari', 'shukriya',
    ];
    if (romanUrduKeywords.some((w) => normalized.includes(w))) {
      return 'ur-Latn';
    }

    // Default to English
    return 'en';
  }

  /**
   * Classify administrative intents
   */
  private classifyIntent(
    text: string,
    entities: NluAnalysisResult['entities'],
    context?: Record<string, unknown>,
  ): AiIntent {
    // 1. Appointment Cancellation
    if (
      text.includes('cancel') ||
      text.includes('mansookh') ||
      text.includes('منسوخ') ||
      text.includes('رد')
    ) {
      return AiIntent.APPOINTMENT_CANCELLATION;
    }

    // 2. Appointment Rescheduling
    if (
      text.includes('reschedule') ||
      text.includes('change date') ||
      text.includes('change time') ||
      text.includes('waqt tabdeel') ||
      text.includes('تبدیل')
    ) {
      return AiIntent.APPOINTMENT_RESCHEDULING;
    }

    // 3. Token / Queue status
    if (
      text.includes('token') ||
      text.includes('queue') ||
      text.includes('line') ||
      text.includes('number') ||
      text.includes('bari') ||
      text.includes('وار') ||
      text.includes('ٹوکن') ||
      text.includes('نوبت')
    ) {
      if (text.includes('status') || text.includes('position') || text.includes('kitne baki')) {
        return AiIntent.QUEUE_STATUS;
      }
      return AiIntent.TOKEN_LOOKUP;
    }

    // 4. Appointment Availability Check
    if (
      text.includes('available') ||
      text.includes('slots') ||
      text.includes('khali') ||
      text.includes('دستیاب')
    ) {
      return AiIntent.APPOINTMENT_AVAILABILITY;
    }

    // 4b. Appointment Booking
    if (
      text.includes('book') ||
      text.includes('appointment') ||
      text.includes('mulaqat') ||
      text.includes('dikhana hai') ||
      text.includes('checkup') ||
      text.includes('ملاقات') ||
      text.includes('وخت')
    ) {
      return AiIntent.APPOINTMENT_BOOKING;
    }

    // Active multi-turn booking step override
    if (context?.activeStep === 'SELECT_DOCTOR' && (entities.doctorName || entities.specialty)) {
      return AiIntent.APPOINTMENT_BOOKING;
    }
    if (context?.activeStep === 'SELECT_DATE' && entities.date) {
      return AiIntent.APPOINTMENT_BOOKING;
    }
    if (context?.activeStep === 'SELECT_SLOT' && entities.time) {
      return AiIntent.APPOINTMENT_BOOKING;
    }

    // 5. Pricing / Consultation Fee
    if (
      text.includes('fee') ||
      text.includes('price') ||
      text.includes('cost') ||
      text.includes('pese') ||
      text.includes('kitne') ||
      text.includes('فیس') ||
      text.includes('قیمت')
    ) {
      return AiIntent.PRICING_INFORMATION;
    }

    // 6. Location & Address
    if (
      text.includes('location') ||
      text.includes('address') ||
      text.includes('where is') ||
      text.includes('kahan hai') ||
      text.includes('kidhar') ||
      text.includes('پتہ') ||
      text.includes('ځای')
    ) {
      return AiIntent.LOCATION_INFORMATION;
    }

    // 7. Working Hours & Timings
    if (
      text.includes('timing') ||
      text.includes('working hours') ||
      text.includes('open') ||
      text.includes('close') ||
      text.includes('auqat') ||
      text.includes('اوقات') ||
      text.includes('اووقات') ||
      text.includes('وختونه')
    ) {
      return AiIntent.WORKING_HOURS;
    }

    // 8. Contact Information
    if (
      text.includes('phone') ||
      text.includes('number') ||
      text.includes('contact') ||
      text.includes('rabta') ||
      text.includes('رابطہ')
    ) {
      return AiIntent.CONTACT_INFORMATION;
    }

    // 9. Doctor & Specialty Directory
    if (entities.doctorName || text.includes('doctor') || text.includes('dr.') || text.includes('ڈاکٹر')) {
      return AiIntent.DOCTOR_LOOKUP;
    }
    if (entities.specialty || text.includes('specialist') || text.includes('mahir')) {
      return AiIntent.SPECIALTY_LOOKUP;
    }

    // 10. Greetings
    if (
      text.includes('hello') ||
      text.includes('hi') ||
      text.includes('salam') ||
      text.includes('assalam') ||
      text.includes('aoa') ||
      text.includes('سلام') ||
      text.includes('ستړې مه شئ')
    ) {
      return AiIntent.GREETING;
    }

    // 11. FAQ check
    if (text.includes('service') || text.includes('faq') || text.includes('kya kya') || text.includes('facilities')) {
      return AiIntent.FAQ;
    }

    return AiIntent.CLINIC_INFORMATION;
  }

  /**
   * Extract administrative entities safely
   */
  private extractEntities(
    text: string,
    _context?: Record<string, unknown>,
  ): NluAnalysisResult['entities'] {
    const entities: NluAnalysisResult['entities'] = {};

    // 1. Doctor name recognition
    const doctorMatch = text.match(/(?:dr\.?|doctor|ڈاکٹر)\s+([a-zA-Z\u0600-\u06FF]+(?:\s+[a-zA-Z\u0600-\u06FF]+)?)/i);
    if (doctorMatch && doctorMatch[1]) {
      let docName = doctorMatch[1].trim();
      // Strip common relational/grammatical stop words in Roman Urdu and English
      docName = docName.replace(/\s+(ke|ka|ki|se|ko|sahab|sahib|sb|the|is|to|for|available|slots)$/i, '').trim();
      entities.doctorName = docName.charAt(0).toUpperCase() + docName.slice(1);
    }

    // 2. Specialty recognition
    const specialties = [
      'cardiology', 'cardiologist', 'heart', 'dil',
      'pediatrics', 'pediatrician', 'children', 'bachon',
      'gynecology', 'gynecologist', 'khawateen',
      'dermatology', 'dermatologist', 'skin', 'jild',
      'orthopedics', 'orthopedic', 'bones', 'haddian',
      'general physician', 'general medicine', 'opd',
    ];
    for (const spec of specialties) {
      if (text.includes(spec)) {
        entities.specialty = spec;
        break;
      }
    }

    // 3. Date extraction (today, tomorrow, YYYY-MM-DD, or weekday)
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (text.includes('today') || text.includes('aaj') || text.includes('نن') || text.includes('آج')) {
      entities.date = toYmd(today);
    } else if (text.includes('tomorrow') || text.includes('kal') || text.includes('سبا') || text.includes('کل')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      entities.date = toYmd(tomorrow);
    } else {
      const explicitDate = text.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
      if (explicitDate && explicitDate[1]) {
        entities.date = explicitDate[1];
      }
    }

    // 4. Time extraction (e.g. 10:00, 10:30, 2pm, 14:00)
    const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (timeMatch && timeMatch[0]) {
      entities.time = timeMatch[0];
    } else {
      const ampmMatch = text.match(/\b(1[0-2]|[1-9])\s*(am|pm)\b/i);
      if (ampmMatch && ampmMatch[1] && ampmMatch[2]) {
        let hour = parseInt(ampmMatch[1], 10);
        const meridiem = ampmMatch[2].toLowerCase();
        if (meridiem === 'pm' && hour < 12) hour += 12;
        if (meridiem === 'am' && hour === 12) hour = 0;
        entities.time = `${pad(hour)}:00`;
      }
    }

    // 5. Token reference (e.g. A001, B012)
    const tokenMatch = text.match(/\b([A-Z]\d{3})\b/i);
    if (tokenMatch && tokenMatch[1]) {
      entities.tokenDisplay = tokenMatch[1].toUpperCase();
    }

    // 6. Appointment Number reference (e.g. APT-2026-0001)
    const aptMatch = text.match(/\b(APT-202\d-\d{4})\b/i);
    if (aptMatch && aptMatch[1]) {
      entities.appointmentNumber = aptMatch[1].toUpperCase();
    }

    return entities;
  }

  private matchesAny(text: string, keywords: string[]): boolean {
    return keywords.some((kw) => text.includes(kw));
  }
}
