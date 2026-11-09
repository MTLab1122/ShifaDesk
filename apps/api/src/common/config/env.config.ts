import { apiEnvSchema, ApiEnvConfig } from '@matabai/validation';

export function validateEnvironment(config: Record<string, unknown>): ApiEnvConfig {
  const parsed = apiEnvSchema.safeParse(config);

  if (!parsed.success) {
    const errors = parsed.error.format();
    const formattedErrors = JSON.stringify(errors, null, 2);
    throw new Error(`Environment validation failed:\n${formattedErrors}`);
  }

  return parsed.data;
}
