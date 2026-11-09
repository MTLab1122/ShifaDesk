export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CLINIC_OWNER = 'CLINIC_OWNER',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  PATIENT = 'PATIENT',
}

export enum TenantStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export enum SupportedLanguage {
  EN = 'en', // English
  UR = 'ur', // Urdu (Primary national)
  AR = 'ar', // Arabic
  PS = 'ps', // Pashto
  SD = 'sd', // Sindhi
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}
