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

export interface DoctorWorkingHours {
  id: string;
  organizationId: string;
  clinicId: string;
  doctorId: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  slotDurationMinutes: number;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clinic?: Clinic;
  doctor?: Doctor;
}

export interface DoctorScheduleException {
  id: string;
  organizationId: string;
  clinicId: string;
  doctorId: string;
  exceptionDate: string; // YYYY-MM-DD
  exceptionType: string; // UNAVAILABLE, CUSTOM_HOURS
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
  clinic?: Clinic;
  doctor?: Doctor;
}

export interface Appointment {
  id: string;
  organizationId: string;
  clinicId: string;
  doctorId: string;
  patientId: string;
  appointmentNumber: string;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  timezone: string;
  status: string; // PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW
  bookingSource: string; // ADMIN, RECEPTIONIST, PATIENT_PORTAL
  reasonForVisit?: string | null;
  internalNotes?: string | null;
  cancellationReason?: string | null;
  createdBy: string;
  cancelledBy?: string | null;
  rescheduledFromId?: string | null;
  createdAt: string;
  updatedAt: string;
  clinic?: Clinic;
  doctor?: Doctor;
  patient?: Patient;
  statusHistory?: AppointmentStatusHistory[];
}

export interface AppointmentStatusHistory {
  id: string;
  appointmentId: string;
  organizationId: string;
  clinicId: string;
  previousStatus?: string | null;
  newStatus: string;
  changedBy: string;
  changeReason?: string | null;
  createdAt: string;
}

export interface AvailableSlot {
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  isAvailable: boolean;
}

export interface ClinicQueueSettings {
  id: string;
  organizationId: string;
  clinicId: string;
  doctorId?: string | null;
  queueName: string;
  tokenPrefix: string;
  tokenResetPolicy: string;
  allowWalkIns: boolean;
  allowAppointmentCheckIn: boolean;
  estimatedConsultationMinutes: number;
  maxQueueCapacity?: number | null;
  publicQueueId: string;
  isPublicDisplayEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clinic?: Clinic;
  doctor?: Doctor;
}

export interface ClinicQueueSession {
  id: string;
  organizationId: string;
  clinicId: string;
  doctorId?: string | null;
  queueSettingsId: string;
  sessionDate: string; // YYYY-MM-DD
  status: string; // NOT_STARTED, ACTIVE, PAUSED, CLOSED
  lastTokenNumber: number;
  currentTokenNumber?: number | null;
  totalRegistered: number;
  totalCompleted: number;
  startedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  clinic?: Clinic;
  doctor?: Doctor;
  queueSettings?: ClinicQueueSettings;
  tokens?: QueueToken[];
}

export interface QueueToken {
  id: string;
  organizationId: string;
  clinicId: string;
  queueSessionId: string;
  appointmentId?: string | null;
  patientId: string;
  tokenNumber: number;
  tokenDisplay: string;
  queuePosition: number;
  status: string; // WAITING, CALLED, SERVING, COMPLETED, SKIPPED, CANCELLED, NO_SHOW
  priorityType: string; // NORMAL, PRIORITY
  checkedInAt: string;
  calledAt?: string | null;
  serviceStartedAt?: string | null;
  completedAt?: string | null;
  skippedAt?: string | null;
  cancelledAt?: string | null;
  estimatedWaitMinutes?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  clinic?: Clinic;
  patient?: Patient;
  appointment?: Appointment;
  queueSession?: ClinicQueueSession;
  statusHistory?: QueueStatusHistory[];
}

export interface QueueStatusHistory {
  id: string;
  organizationId: string;
  clinicId: string;
  queueTokenId: string;
  previousStatus?: string | null;
  newStatus: string;
  changedBy: string;
  changeReason?: string | null;
  createdAt: string;
}

export interface PublicQueueDisplay {
  clinicName: string;
  queueName: string;
  doctorName?: string | null;
  status: string;
  currentServingToken?: string | null;
  recentlyCalledTokens: string[];
  waitingCount: number;
  estimatedWaitMinutes?: number | null;
  lastUpdated: string;
}

export interface QueueStats {
  sessionId: string;
  sessionStatus: string;
  totalWaiting: number;
  totalServing: number;
  totalCompleted: number;
  totalSkipped: number;
  totalNoShow: number;
  totalCancelled: number;
  averageWaitMinutes: number;
}



