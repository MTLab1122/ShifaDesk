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

export enum QueueSessionStatus {
  NOT_STARTED = 'NOT_STARTED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

export enum QueueTokenStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  SERVING = 'SERVING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum TokenPriorityType {
  NORMAL = 'NORMAL',
  PRIORITY = 'PRIORITY',
}

export const VALID_QUEUE_TOKEN_TRANSITIONS: Record<QueueTokenStatus, QueueTokenStatus[]> = {
  [QueueTokenStatus.WAITING]: [
    QueueTokenStatus.CALLED,
    QueueTokenStatus.CANCELLED,
    QueueTokenStatus.SKIPPED,
    QueueTokenStatus.NO_SHOW,
  ],
  [QueueTokenStatus.CALLED]: [
    QueueTokenStatus.SERVING,
    QueueTokenStatus.WAITING,
    QueueTokenStatus.SKIPPED,
    QueueTokenStatus.NO_SHOW,
    QueueTokenStatus.CANCELLED,
  ],
  [QueueTokenStatus.SERVING]: [
    QueueTokenStatus.COMPLETED,
    QueueTokenStatus.WAITING, // Authorized correction workflow
  ],
  [QueueTokenStatus.SKIPPED]: [
    QueueTokenStatus.WAITING, // Authorized restoration
    QueueTokenStatus.CANCELLED,
  ],
  [QueueTokenStatus.COMPLETED]: [],
  [QueueTokenStatus.CANCELLED]: [],
  [QueueTokenStatus.NO_SHOW]: [],
};

export const VALID_QUEUE_SESSION_TRANSITIONS: Record<QueueSessionStatus, QueueSessionStatus[]> = {
  [QueueSessionStatus.NOT_STARTED]: [QueueSessionStatus.ACTIVE, QueueSessionStatus.CLOSED],
  [QueueSessionStatus.ACTIVE]: [QueueSessionStatus.PAUSED, QueueSessionStatus.CLOSED],
  [QueueSessionStatus.PAUSED]: [QueueSessionStatus.ACTIVE, QueueSessionStatus.CLOSED],
  [QueueSessionStatus.CLOSED]: [],
};

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

  // WhatsApp & Conversations
  CONVERSATION_READ: 'conversation:read',
  CONVERSATION_WRITE: 'conversation:write',
  WHATSAPP_MANAGE: 'whatsapp:manage',

  // Phase 7 AI Receptionist
  AI_SETTINGS_READ: 'ai_settings:read',
  AI_SETTINGS_WRITE: 'ai_settings:write',
  FAQ_READ: 'faq:read',
  FAQ_WRITE: 'faq:write',
  AI_MONITOR_READ: 'ai_monitor:read',
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
    PERMISSIONS.CONVERSATION_READ,
    PERMISSIONS.CONVERSATION_WRITE,
    PERMISSIONS.WHATSAPP_MANAGE,
    PERMISSIONS.AI_SETTINGS_READ,
    PERMISSIONS.AI_SETTINGS_WRITE,
    PERMISSIONS.FAQ_READ,
    PERMISSIONS.FAQ_WRITE,
    PERMISSIONS.AI_MONITOR_READ,
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
    PERMISSIONS.CONVERSATION_READ,
    PERMISSIONS.FAQ_READ,
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
    PERMISSIONS.CONVERSATION_READ,
    PERMISSIONS.CONVERSATION_WRITE,
    PERMISSIONS.AI_SETTINGS_READ,
    PERMISSIONS.FAQ_READ,
    PERMISSIONS.FAQ_WRITE,
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

export enum WhatsAppConnectionStatus {
  PENDING = 'PENDING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
}

export enum WhatsAppConsentStatus {
  UNKNOWN = 'UNKNOWN',
  OPTED_IN = 'OPTED_IN',
  OPTED_OUT = 'OPTED_OUT',
}

export enum WhatsAppConversationStatus {
  OPEN = 'OPEN',
  HUMAN_HANDOVER = 'HUMAN_HANDOVER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum WhatsAppMessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum WhatsAppDeliveryStatus {
  RECEIVED = 'RECEIVED',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

export enum WhatsAppWebhookStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

export enum WhatsAppTemplateStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAUSED = 'PAUSED',
}

export enum WhatsAppTemplateCategory {
  UTILITY = 'UTILITY',
  MARKETING = 'MARKETING',
  AUTHENTICATION = 'AUTHENTICATION',
}

export enum AiIntent {
  GREETING = 'GREETING',
  CLINIC_INFORMATION = 'CLINIC_INFORMATION',
  DOCTOR_LOOKUP = 'DOCTOR_LOOKUP',
  SPECIALTY_LOOKUP = 'SPECIALTY_LOOKUP',
  WORKING_HOURS = 'WORKING_HOURS',
  APPOINTMENT_AVAILABILITY = 'APPOINTMENT_AVAILABILITY',
  APPOINTMENT_BOOKING = 'APPOINTMENT_BOOKING',
  APPOINTMENT_CONFIRMATION = 'APPOINTMENT_CONFIRMATION',
  APPOINTMENT_RESCHEDULING = 'APPOINTMENT_RESCHEDULING',
  APPOINTMENT_CANCELLATION = 'APPOINTMENT_CANCELLATION',
  TOKEN_LOOKUP = 'TOKEN_LOOKUP',
  QUEUE_STATUS = 'QUEUE_STATUS',
  LOCATION_INFORMATION = 'LOCATION_INFORMATION',
  CONTACT_INFORMATION = 'CONTACT_INFORMATION',
  PRICING_INFORMATION = 'PRICING_INFORMATION',
  FAQ = 'FAQ',
  HUMAN_HANDOVER = 'HUMAN_HANDOVER',
  UNSUPPORTED_REQUEST = 'UNSUPPORTED_REQUEST',
  MEDICAL_REQUEST = 'MEDICAL_REQUEST',
  EMERGENCY_OR_URGENT_CONCERN = 'EMERGENCY_OR_URGENT_CONCERN',
  UNKNOWN = 'UNKNOWN',
}

export enum AiOutcome {
  RESPONDED = 'RESPONDED',
  HANDOVER = 'HANDOVER',
  TOOL_EXECUTED = 'TOOL_EXECUTED',
  ERROR = 'ERROR',
}

export enum AiToolStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

export enum FaqCategory {
  GENERAL = 'GENERAL',
  APPOINTMENTS = 'APPOINTMENTS',
  TIMINGS = 'TIMINGS',
  FEES = 'FEES',
  LOCATION = 'LOCATION',
  SERVICES = 'SERVICES',
}
