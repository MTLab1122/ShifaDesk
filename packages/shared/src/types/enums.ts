export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CLINIC_ADMIN = 'CLINIC_ADMIN',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  PATIENT = 'PATIENT',
  LAB_STAFF = 'LAB_STAFF',
}

export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export enum TenantStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
}

export enum SupportedLanguage {
  EN = 'en', // English
  UR = 'ur', // Urdu (RTL)
  PS = 'ps', // Pashto (RTL)
  AR = 'ar', // Arabic (RTL)
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum QueueStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export enum StaffDesignation {
  RECEPTIONIST = 'RECEPTIONIST',
  LAB_STAFF = 'LAB_STAFF',
  NURSE = 'NURSE',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  OTHER = 'OTHER',
}

export enum PatientConsentStatus {
  GRANTED = 'GRANTED',
  PENDING = 'PENDING',
  REVOKED = 'REVOKED',
}

export enum BookingSource {
  ADMIN = 'ADMIN',
  RECEPTIONIST = 'RECEPTIONIST',
  PATIENT_PORTAL = 'PATIENT_PORTAL',
  WHATSAPP = 'WHATSAPP',
  VOICE = 'VOICE',
}

export enum ScheduleExceptionType {
  UNAVAILABLE = 'UNAVAILABLE',
  CUSTOM_HOURS = 'CUSTOM_HOURS',
}

export const VALID_APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.PENDING]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.CONFIRMED]: [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW, AppointmentStatus.IN_PROGRESS],
  [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

export const PERMISSIONS = {
  // Organizations
  ORGANIZATION_READ: 'organization:read',
  ORGANIZATION_WRITE: 'organization:write',
  ORGANIZATION_DELETE: 'organization:delete',

  // Clinics
  CLINIC_READ: 'clinic:read',
  CLINIC_WRITE: 'clinic:write',
  CLINIC_DELETE: 'clinic:delete',

  // Users & Memberships
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  MEMBERSHIP_READ: 'membership:read',
  MEMBERSHIP_WRITE: 'membership:write',
  MEMBERSHIP_DELETE: 'membership:delete',

  // Clinical & Patients
  PATIENT_READ: 'patient:read',
  PATIENT_WRITE: 'patient:write',
  APPOINTMENT_READ: 'appointment:read',
  APPOINTMENT_WRITE: 'appointment:write',
  QUEUE_READ: 'queue:read',
  QUEUE_MANAGE: 'queue:manage',

  // Laboratory & Reports
  LAB_READ: 'lab:read',
  LAB_WRITE: 'lab:write',
  REPORT_READ: 'report:read',

  // Audit Logs
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [UserRole.CLINIC_ADMIN]: [
    PERMISSIONS.ORGANIZATION_READ,
    PERMISSIONS.CLINIC_READ,
    PERMISSIONS.CLINIC_WRITE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_WRITE,
    PERMISSIONS.MEMBERSHIP_READ,
    PERMISSIONS.MEMBERSHIP_WRITE,
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.PATIENT_WRITE,
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_WRITE,
    PERMISSIONS.QUEUE_READ,
    PERMISSIONS.QUEUE_MANAGE,
    PERMISSIONS.LAB_READ,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.AUDIT_READ,
  ],
  [UserRole.DOCTOR]: [
    PERMISSIONS.CLINIC_READ,
    PERMISSIONS.USER_READ,
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.PATIENT_WRITE,
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_WRITE,
    PERMISSIONS.QUEUE_READ,
    PERMISSIONS.QUEUE_MANAGE,
    PERMISSIONS.LAB_READ,
    PERMISSIONS.LAB_WRITE,
    PERMISSIONS.REPORT_READ,
  ],
  [UserRole.RECEPTIONIST]: [
    PERMISSIONS.CLINIC_READ,
    PERMISSIONS.USER_READ,
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.PATIENT_WRITE,
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_WRITE,
    PERMISSIONS.QUEUE_READ,
    PERMISSIONS.QUEUE_MANAGE,
  ],
  [UserRole.LAB_STAFF]: [
    PERMISSIONS.CLINIC_READ,
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.LAB_READ,
    PERMISSIONS.LAB_WRITE,
  ],
  [UserRole.PATIENT]: [
    PERMISSIONS.CLINIC_READ,
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.QUEUE_READ,
  ],
};
