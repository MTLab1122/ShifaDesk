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

export interface Doctor {
  id: string;
  organizationId: string;
  clinicId: string;
  userProfileId?: string | null;
  fullName: string;
  email?: string | null;
  phone: string;
  specialty: string;
  qualification: string;
  registrationNumber?: string; // Private, masked for non-admins
  consultationFee: number;
  biography?: string | null;
  profileImageUrl?: string | null;
  status: EntityStatus | string;
  createdAt: string;
  updatedAt: string;
  clinic?: Clinic;
  organization?: Organization;
}

export interface DoctorClinicAssignment {
  id: string;
  doctorId: string;
  clinicId: string;
  organizationId: string;
  status: EntityStatus | string;
  createdAt: string;
  clinic?: Clinic;
}

export interface StaffMember {
  id: string;
  organizationId: string;
  clinicId: string;
  userProfileId?: string | null;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  employmentStatus: EntityStatus | string;
  createdAt: string;
  updatedAt: string;
  clinic?: Clinic;
  organization?: Organization;
}

export interface Patient {
  id: string;
  organizationId: string;
  clinicId: string;
  userProfileId?: string | null;
  patientNumber: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  consentStatus: string;
  status: EntityStatus | string;
  createdAt: string;
  updatedAt: string;
  clinic?: Clinic;
}

