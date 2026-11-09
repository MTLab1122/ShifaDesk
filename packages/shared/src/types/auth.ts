import { UserRole } from './enums.js';
import { UserProfile, OrganizationMembership, ClinicMembership } from './entities.js';

export interface AuthUserSession {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId?: string;
  clinicId?: string;
  permissions: string[];
}

export interface TenantContext {
  organizationId: string;
  organizationSlug?: string;
  clinicId?: string;
  clinicSlug?: string;
}

export interface AuthMeResponse {
  user: UserProfile;
  organizationMemberships: OrganizationMembership[];
  clinicMemberships: ClinicMembership[];
  activeRole: UserRole;
  activeOrganizationId?: string;
  activeClinicId?: string;
}

export interface SessionValidationResponse {
  valid: boolean;
  userId?: string;
  email?: string;
  expiresAt?: number;
}
