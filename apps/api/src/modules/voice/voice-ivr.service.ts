import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwilioVoiceAdapter } from './adapters/twilio-voice.adapter';
import { VoiceCallSessionService } from './voice-call-session.service';
import { TelephonyEventType, VoiceSpeakerType } from '@matabai/shared';

@Injectable()
export class VoiceIvrService {
  private readonly logger = new Logger(VoiceIvrService.name);

  constructor(
    private readonly twilioAdapter: TwilioVoiceAdapter,
    private readonly sessionService: VoiceCallSessionService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Generates root welcome IVR TwiML for incoming call
   */
  async handleInboundCall(params: {
    CallSid: string;
    From: string;
    To: string;
  }): Promise<string> {
    this.logger.log(`Handling inbound IVR call for CallSid ${params.CallSid}`);

    const session = await this.sessionService.findOrCreateSession({
      providerCallId: params.CallSid,
      callerPhone: params.From,
      calledPhone: params.To,
      direction: 'INBOUND',
    });

    const baseUrl =
      this.configService.get<string>('VOICE_WEBHOOK_BASE_URL') ||
      'http://localhost:4000/api/v1';

    const gatherActionUrl = `${baseUrl}/webhooks/voice/gather?step=language&callSid=${params.CallSid}`;

    // Record welcome event
    if (session) {
      await this.sessionService.recordEvent(
        session.id,
        TelephonyEventType.SPEECH_GATHER_STARTED,
        { step: 'language_selection' },
        params.CallSid
      );
    }

    return this.twilioAdapter.generateWelcomeIvr({
      greetingText: 'Welcome to MatabAI clinic voice receptionist.',
      languageOptions: [
        { digit: '1', language: 'ur', label: 'اردو' },
        { digit: '2', language: 'ps', label: 'پښتو' },
        { digit: '3', language: 'en', label: 'English' },
      ],
      gatherActionUrl,
      timeoutSeconds: 5,
    });
  }

  /**
   * Resolves language from DTMF digit or speech recognition input
   */
  resolveLanguage(digit?: string, speechResult?: string): 'ur' | 'ps' | 'en' {
    const trimmedDigit = digit?.trim();
    if (trimmedDigit === '1') return 'ur';
    if (trimmedDigit === '2') return 'ps';
    if (trimmedDigit === '3') return 'en';

    if (speechResult) {
      const lower = speechResult.toLowerCase().trim();
      if (lower.includes('urdu') || lower.includes('اردو')) return 'ur';
      if (lower.includes('pashto') || lower.includes('pushto') || lower.includes('پښتو')) return 'ps';
      if (lower.includes('english') || lower.includes('angrezi')) return 'en';
    }

    // Default to Urdu
    return 'ur';
  }

  /**
   * Returns localized initial greeting after language has been selected
   */
  getInitialAiGreeting(language: 'ur' | 'ps' | 'en'): string {
    switch (language) {
      case 'ur':
        return 'مطب اے آئی میں خوش آمدید۔ میں آپ کی کیا مدد کر سکتا ہوں؟ آپ ڈاکٹر کا وقت، اپائنٹمنٹ، یا ٹوکن کی معلومات معلوم کر سکتے ہیں۔';
      case 'ps':
        return 'د مطب اے آئی ته ښه راغلاست. زه څنګه کولای شم ستاسو مرسته وکړم؟ تاسو د ډاکټرانو وخت، ملاقات، یا ټوکن معلومولای شئ.';
      case 'en':
      default:
        return 'Welcome to MatabAI. How can I help you today? You can ask about doctor timings, book an appointment, or check your queue token.';
    }
  }

  /**
   * Handles language selection webhook and transitions to conversational speech gather
   */
  async handleLanguageSelection(params: {
    CallSid: string;
    Digits?: string;
    SpeechResult?: string;
  }): Promise<string> {
    const session = await this.sessionService.getSession(params.CallSid);
    const selectedLang = this.resolveLanguage(params.Digits, params.SpeechResult);

    await this.sessionService.setLanguage(session.id, selectedLang);

    await this.sessionService.recordEvent(
      session.id,
      TelephonyEventType.DTMF_RECEIVED,
      {
        digit: params.Digits,
        speechResult: params.SpeechResult,
        resolvedLanguage: selectedLang,
      },
      params.CallSid
    );

    const greeting = this.getInitialAiGreeting(selectedLang);

    // Record system greeting message
    await this.sessionService.addMessage(
      session.id,
      VoiceSpeakerType.ASSISTANT,
      greeting,
      selectedLang
    );

    const baseUrl =
      this.configService.get<string>('VOICE_WEBHOOK_BASE_URL') ||
      'http://localhost:4000/api/v1';

    const gatherActionUrl = `${baseUrl}/webhooks/voice/gather?step=dialogue&callSid=${params.CallSid}`;

    return this.twilioAdapter.generateSpeechGather({
      promptText: greeting,
      language: selectedLang,
      actionUrl: gatherActionUrl,
      speechTimeoutSeconds: 5,
    });
  }
}
