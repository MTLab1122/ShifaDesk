import { z } from 'zod';

export const voiceProviderEnum = z.enum(['TWILIO', 'TELNYX', 'SIP']);
export const callDirectionEnum = z.enum(['INBOUND', 'OUTBOUND']);
export const callStatusEnum = z.enum([
  'INITIATED',
  'RINGING',
  'IN_PROGRESS',
  'COMPLETED',
  'BUSY',
  'NO_ANSWER',
  'FAILED',
  'CANCELLED',
]);
export const voiceHandoverStatusEnum = z.enum(['NONE', 'REQUESTED', 'TRANSFERRED', 'FAILED']);
export const voiceSpeakerTypeEnum = z.enum(['CALLER', 'ASSISTANT', 'SYSTEM']);
export const sttProviderEnum = z.enum(['openai_whisper', 'groq_whisper', 'google_stt', 'twilio_gather']);
export const ttsProviderEnum = z.enum(['openai_tts', 'elevenlabs', 'google_tts', 'twilio_say']);
export const callerVerificationStatusEnum = z.enum(['UNVERIFIED', 'VERIFIED', 'EXEMPT']);
export const voiceTransferStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']);

export const createVoiceIntegrationSchema = z.object({
  clinicId: z.string().uuid({ message: 'Valid clinic ID is required' }),
  provider: voiceProviderEnum.default('TWILIO'),
  accountSid: z.string().min(1, { message: 'Provider Account SID is required' }).max(100),
  phoneNumber: z
    .string()
    .min(5, { message: 'Phone number is required' })
    .max(30),
  authToken: z.string().min(5, { message: 'Auth token / API secret is required' }),
  webhookUrl: z.string().url().optional().nullable(),
  statusCallbackUrl: z.string().url().optional().nullable(),
  config: z.record(z.any()).optional().nullable(),
  enabled: z.boolean().default(true),
});

export const updateVoiceIntegrationSchema = z.object({
  provider: voiceProviderEnum.optional(),
  accountSid: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().min(5).max(30).optional(),
  authToken: z.string().min(5).optional(),
  webhookUrl: z.string().url().optional().nullable(),
  statusCallbackUrl: z.string().url().optional().nullable(),
  config: z.record(z.any()).optional().nullable(),
  enabled: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export const updateVoiceSettingsSchema = z.object({
  sttProvider: sttProviderEnum.optional(),
  ttsProvider: ttsProviderEnum.optional(),
  llmProvider: z.string().max(50).optional(),
  voiceModel: z.string().max(50).optional(),
  voiceSpeed: z.number().min(0.5).max(2.0).optional(),
  conversationTimeoutMs: z.number().int().min(3000).max(60000).optional(),
  maxSilenceTimeoutMs: z.number().int().min(1000).max(30000).optional(),
  maxInteractionAttempts: z.number().int().min(1).max(10).optional(),
  enableRecording: z.boolean().optional(),
  recordingConsentMessage: z.string().max(500).optional(),
  transcriptRetentionDays: z.number().int().min(1).max(365).optional(),
  humanTransferNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, { message: 'Phone number must follow E.164 format' })
    .optional()
    .nullable(),
  ivrGreetingMessage: z.string().max(1000).optional(),
  enabled: z.boolean().optional(),
});

export const queryVoiceCallsSchema = z.object({
  clinicId: z.string().uuid().optional(),
  status: callStatusEnum.optional(),
  direction: callDirectionEnum.optional(),
  language: z.string().optional(),
  callerPhone: z.string().optional(),
  handoverStatus: voiceHandoverStatusEnum.optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const assignVoiceHandoverSchema = z.object({
  assignedUserId: z.string().uuid().optional().nullable(),
  transferTarget: z.string().min(1, { message: 'Transfer target destination is required' }),
  handoverReason: z.string().min(1, { message: 'Handover reason is required' }).max(500),
  summary: z.string().max(2000).optional().nullable(),
});

export const completeVoiceHandoverSchema = z.object({
  transferStatus: voiceTransferStatusEnum,
  summary: z.string().max(2000).optional().nullable(),
});

export const twilioVoiceWebhookSchema = z.object({
  CallSid: z.string().min(1),
  AccountSid: z.string().optional(),
  From: z.string(),
  To: z.string(),
  CallStatus: z.string().optional(),
  Direction: z.string().optional(),
  ApiVersion: z.string().optional(),
  Digits: z.string().optional(),
  SpeechResult: z.string().optional(),
  Confidence: z.coerce.number().optional(),
  RecordingUrl: z.string().optional(),
  RecordingDuration: z.coerce.number().optional(),
  CallDuration: z.coerce.number().optional(),
});

export const simulateVoiceCallSchema = z.object({
  clinicId: z.string().uuid({ message: 'Valid clinic ID is required' }),
  callerPhone: z.string().min(5).default('+923001234567'),
  message: z.string().min(1, { message: 'Message text or speech input is required' }),
  language: z.enum(['en', 'ur', 'ps']).default('en'),
  sessionId: z.string().uuid().optional(),
  dtmfDigit: z.string().optional(),
});

export type CreateVoiceIntegrationInput = z.infer<typeof createVoiceIntegrationSchema>;
export type UpdateVoiceIntegrationInput = z.infer<typeof updateVoiceIntegrationSchema>;
export type UpdateVoiceSettingsInput = z.infer<typeof updateVoiceSettingsSchema>;
export type QueryVoiceCallsInput = z.infer<typeof queryVoiceCallsSchema>;
export type AssignVoiceHandoverInput = z.infer<typeof assignVoiceHandoverSchema>;
export type CompleteVoiceHandoverInput = z.infer<typeof completeVoiceHandoverSchema>;
export type TwilioVoiceWebhookInput = z.infer<typeof twilioVoiceWebhookSchema>;
export type SimulateVoiceCallInput = z.infer<typeof simulateVoiceCallSchema>;
