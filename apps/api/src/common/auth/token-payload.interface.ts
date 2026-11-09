import { UserRole } from '@matabai/shared';

export interface AuthenticatedUser {
  id: string; // UserProfile id
  authUserId: string; // Supabase auth uid
  email: string;
  fullName: string;
  role: UserRole;
  organizationId?: string;
  clinicId?: string;
  permissions: string[];
}

