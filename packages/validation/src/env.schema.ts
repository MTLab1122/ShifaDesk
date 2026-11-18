import { z } from 'zod';

export const apiEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production', 'staging'])
    .default('development'),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug', 'verbose'])
    .default('info'),

  // PostgreSQL / Supabase
  DATABASE_URL: z.string().url().describe('PostgreSQL connection string'),
  DIRECT_URL: z
    .string()
    .url()
    .optional()
    .describe('Direct connection string for migrations'),

  // Supabase Auth & Storage
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // JWT Security
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long for production security')
    .default('dev-jwt-secret-key-at-least-32-characters-long-matabai'),
  JWT_EXPIRATION: z.string().default('7d'),

  // Meta WhatsApp Business Cloud API
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  META_API_VERSION: z.string().default('v21.0'),
  META_GRAPH_BASE_URL: z.string().url().default('https://graph.facebook.com'),

  // Phase 7: AI Multilingual Receptionist
  AI_PROVIDER: z.string().default('openai'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().default(1000),
  AI_REQUEST_TIMEOUT: z.coerce.number().default(15000),
  AI_TEMPERATURE: z.coerce.number().default(0.2),

  // Phase 9: Telephony & Voice Receptionist
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  VOICE_WEBHOOK_BASE_URL: z.string().url().optional(),
  VOICE_RECORDING_ENABLED: z.coerce.boolean().default(false),
  VOICE_DEFAULT_LANGUAGE: z.enum(['ur', 'ps', 'en']).default('ur'),

  // Phase 10: Private Diagnostic Report Storage
  STORAGE_REPORT_ENCRYPTION_KEY: z
    .string()
    .min(32, 'Encryption key must be at least 32 characters')
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  REPORT_STORAGE_PATH: z.string().default('uploads/reports'),

  // Phase 11 & 14: Payment Gateways (Safepay / Raast)
  SAFEPAY_API_KEY: z.string().optional(),
  SAFEPAY_SECRET_KEY: z.string().optional(),
  SAFEPAY_SANDBOX: z.coerce.boolean().default(true),

  // Phase 8: Notification Adapters (Email / SMS)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional().default('noreply@matabai.com'),
  SMS_GATEWAY_URL: z.string().url().optional(),
  SMS_API_KEY: z.string().optional(),

  // Phase 15: Production Hardening, Rate Limiting & Observability
  RATE_LIMIT_TTL: z.coerce.number().default(60),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  LOG_FORMAT: z.enum(['text', 'json']).default('text'),
  METRICS_ENABLED: z.coerce.boolean().default(true),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().default(10000),
});

export const webEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().optional().default(3000),
  NEXT_PUBLIC_APP_NAME: z.string().default('MatabAI (ShifaDesk)'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000/api/v1'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

export type ApiEnvConfig = z.infer<typeof apiEnvSchema>;
export type WebEnvConfig = z.infer<typeof webEnvSchema>;
