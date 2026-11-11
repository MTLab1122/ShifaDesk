export interface LanguageMenuOption {
  digit: string;
  language: 'ur' | 'ps' | 'en';
  label: string;
}

export interface WelcomeIvrOptions {
  greetingText: string;
  languageOptions: LanguageMenuOption[];
  gatherActionUrl: string;
  timeoutSeconds?: number;
}

export interface SpeechGatherOptions {
  promptText: string;
  language: 'ur' | 'ps' | 'en' | string;
  actionUrl: string;
  speechTimeoutSeconds?: number;
  speechModel?: string;
  hints?: string;
  numDigits?: number;
  finishOnKey?: string;
}

export interface DialTransferOptions {
  transferNumber: string;
  actionUrl?: string;
  callerId?: string;
  timeoutSeconds?: number;
  whisperGreeting?: string;
}

export interface SayOptions {
  text: string;
  language: 'ur' | 'ps' | 'en' | string;
}

export interface WebhookSignatureVerificationOptions {
  url: string;
  params: Record<string, any>;
  signatureHeader?: string;
  authToken?: string;
}

export interface ITelephonyAdapter {
  getProviderName(): string;
  isConfigured(): boolean;
  generateWelcomeIvr(options: WelcomeIvrOptions): string;
  generateSpeechGather(options: SpeechGatherOptions): string;
  generateDialTransfer(options: DialTransferOptions): string;
  generateSayAndHangup(options: SayOptions): string;
  generateSay(options: SayOptions): string;
  verifyWebhookSignature(options: WebhookSignatureVerificationOptions): boolean;
}

