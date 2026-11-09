export const APP_NAME = 'MatabAI (ShifaDesk)';
export const API_DEFAULT_PREFIX = '/api/v1';

export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  FORBIDDEN: 'AUTH_FORBIDDEN',
  TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',

  // Tenant Errors
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_SUSPENDED: 'TENANT_SUSPENDED',
  TENANT_ACCESS_DENIED: 'TENANT_ACCESS_DENIED',

  // Validation & Input
  VALIDATION_ERROR: 'VALIDATION_FAILED',
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFLICT: 'RESOURCE_CONFLICT',

  // System & Database
  INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
  DATABASE_ERROR: 'SYSTEM_DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SYSTEM_SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// Regular expressions for validation
export const REGEX_PATTERNS = {
  // Pakistani Phone Numbers: +923001234567 or 03001234567
  PAKISTAN_PHONE: /^(?:\+92|0092|0)?(3[0-9]{9})$/,
  // E.164 International Phone Numbers
  E164_PHONE: /^\+[1-9]\d{1,14}$/,
  // Slug format for clinic / tenant
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;
