import { UserRole } from './enums.js';

export interface AuthUserSession {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string;
  clinicId?: string;
  permissions: string[];
}

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
}
