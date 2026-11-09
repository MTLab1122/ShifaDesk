import { UserRole, EntityStatus, MembershipStatus } from './enums.js';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Clinic {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  authUserId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userProfileId: string;
  role: UserRole;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  userProfile?: UserProfile;
  organization?: Organization;
}

export interface ClinicMembership {
  id: string;
  clinicId: string;
  userProfileId: string;
  role: UserRole;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  userProfile?: UserProfile;
  clinic?: Clinic;
}

export interface AuditLog {
  id: string;
  organizationId?: string | null;
  clinicId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}
