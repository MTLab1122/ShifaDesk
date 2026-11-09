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
