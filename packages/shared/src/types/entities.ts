import {
  UserRole,
  EntityStatus,
  MembershipStatus,
  NotificationChannel,
  NotificationEventType,
  NotificationJobStatus,
  NotificationPriority,
  QuietHoursPolicy,
  FallbackPolicy,
  TemplateApprovalStatus,
  InAppCategory,
  NotificationConsentStatus,
  NotificationConsentSource,
  NotificationAttemptStatus,
} from './enums.js';

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

export interface WhatsappIntegration {
  id: string;
  organizationId: string;
  clinicId: string;
  phoneNumberId: string;
  wabaId: string;
  businessPhoneNumber: string;
  displayName?: string | null;
  status: string; // PENDING, CONNECTED, DISCONNECTED, ERROR
  isWebhookVerified: boolean;
  lastConnectedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  clinic?: Clinic;
  organization?: Organization;
}

export interface WhatsappContact {
  id: string;
  organizationId: string;
  clinicId: string;
  patientId?: string | null;
  waId: string;
  profileName?: string | null;
  consentStatus: string; // UNKNOWN, OPTED_IN, OPTED_OUT
  consentUpdatedAt?: string | null;
  optOutReason?: string | null;
  lastInboundAt?: string | null;
  lastOutboundAt?: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: Patient | null;
}

export interface WhatsappConversation {
  id: string;
  organizationId: string;
  clinicId: string;
  contactId: string;
  assignedUserId?: string | null;
  status: string; // OPEN, HUMAN_HANDOVER, RESOLVED, CLOSED
  handoverReason?: string | null;
  handoverAt?: string | null;
  resolvedAt?: string | null;
  lastCustomerMessageAt?: string | null;
  lastMessagePreview?: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  contact?: WhatsappContact;
  assignedUser?: UserProfile | null;
  messages?: WhatsappMessage[];
}

export interface WhatsappMessage {
  id: string;
  organizationId: string;
  clinicId: string;
  conversationId: string;
  contactId: string;
  providerMessageId?: string | null;
  direction: string; // INBOUND, OUTBOUND
  messageType: string;
  body?: string | null;
  rawPayload?: Record<string, unknown> | null;
  templateName?: string | null;
  templateParams?: Record<string, unknown> | null;
  status: string; // RECEIVED, QUEUED, SENT, DELIVERED, READ, FAILED
  errorCode?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsappWebhookEvent {
  id: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  processingStatus: string;
  processedAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface WhatsappMessageTemplate {
  id: string;
  organizationId: string;
  clinicId: string;
  integrationId?: string | null;
  name: string;
  language: string;
  category: string;
  status: string;
  headerFormat?: string | null;
  bodyTemplate: string;
  footerTemplate?: string | null;
  parameterNames: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConnectionHealth {
  configured: boolean;
  connected: boolean;
  phoneNumberId?: string;
  wabaId?: string;
  businessPhoneNumber?: string;
  verifiedName?: string | null;
  qualityRating?: string | null;
  webhookVerified: boolean;
  status: string;
  error?: string | null;
  lastCheckedAt: string;
}

export interface AiAssistantSettings {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  assistantName: string;
  enabled: boolean;
  defaultLanguage: string; // EN, UR, PS
  supportedLanguages: string[];
  greetingMessage: string;
  fallbackMessage: string;
  humanHandoverEnabled: boolean;
  appointmentBookingEnabled: boolean;
  tokenLookupEnabled: boolean;
  clinicFaqEnabled: boolean;
  maxTurnsPerConversation: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversationState {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  conversationId: string;
  detectedLanguage: string;
  currentIntent?: string | null;
  currentStep?: string | null;
  conversationContext: Record<string, unknown>;
  handoverRequired: boolean;
  lastProcessedMessageId?: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiInteractionLog {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  conversationId: string;
  inboundMessageId?: string | null;
  detectedLanguage: string;
  detectedIntent: string;
  provider: string;
  model: string;
  toolCalls?: Record<string, unknown>[] | null;
  outcome: string;
  latencyMs: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCost?: number | null;
  errorCode?: string | null;
  createdAt: string;
}

export interface ClinicFaq {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  questionEn: string;
  answerEn: string;
  questionUr?: string | null;
  answerUr?: string | null;
  questionPs?: string | null;
  answerPs?: string | null;
  category: string;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiToolExecutionLog {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  conversationId: string;
  toolName: string;
  executionStatus: string;
  requestReference?: string | null;
  resultReference?: string | null;
  errorCode?: string | null;
  executionDurationMs: number;
  createdAt: string;
}

export interface AiAssistantHealth {
  configured: boolean;
  provider: string;
  model: string;
  status: string; // ACTIVE, DEGRADED, OFFLINE
  rateLimitStatus: string;
  lastCheckedAt: string;
}

export interface AiUsageStats {
  totalInteractions: number;
  totalTokens: number;
  estimatedCostUsd: number;
  averageLatencyMs: number;
  handoverRatePercentage: number;
  languageBreakdown: Record<string, number>;
  topIntents: Array<{ intent: string; count: number }>;
}

export interface NotificationPreference {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  patientId?: string | null;
  userId?: string | null;
  channel: NotificationChannel | string;
  enabled: boolean;
  consentStatus: NotificationConsentStatus | string;
  consentSource: NotificationConsentSource | string;
  consentTimestamp: string;
  optedOutAt?: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: Patient;
  user?: UserProfile;
}

export interface NotificationRule {
  id: string;
  organizationId: string;
  clinicId: string;
  eventType: NotificationEventType | string;
  channel: NotificationChannel | string;
  templateId?: string | null;
  enabled: boolean;
  scheduleOffsetMinutes: number;
  priority: NotificationPriority | string;
  quietHoursPolicy: QuietHoursPolicy | string;
  fallbackPolicy: FallbackPolicy | string;
  createdAt: string;
  updatedAt: string;
  template?: NotificationTemplate;
}

export interface NotificationTemplate {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  name: string;
  eventType: NotificationEventType | string;
  channel: NotificationChannel | string;
  language: string;
  subject?: string | null;
  messageBody: string;
  providerTemplateName?: string | null;
  approvalStatus: TemplateApprovalStatus | string;
  variablesSchema: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationJob {
  id: string;
  organizationId: string;
  clinicId: string;
  recipientId: string;
  recipientType: 'PATIENT' | 'STAFF' | 'CONTACT' | string;
  eventType: NotificationEventType | string;
  channel: NotificationChannel | string;
  templateId?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  scheduledAt: string;
  status: NotificationJobStatus | string;
  idempotencyKey: string;
  payload: Record<string, any>;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  suppressionReason?: string | null;
  claimedAt?: string | null;
  claimedBy?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  template?: NotificationTemplate;
  attemptLogs?: NotificationAttempt[];
  eventLogs?: NotificationEvent[];
}

export interface NotificationAttempt {
  id: string;
  notificationJobId: string;
  channel: NotificationChannel | string;
  provider: string;
  providerMessageId?: string | null;
  attemptNumber: number;
  status: NotificationAttemptStatus | string;
  responseMetadata?: Record<string, any> | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  attemptedAt: string;
  completedAt?: string | null;
}

export interface NotificationEvent {
  id: string;
  notificationJobId: string;
  eventType: string;
  providerEventId?: string | null;
  eventPayload?: Record<string, any> | null;
  occurredAt: string;
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  recipientUserId: string;
  title: string;
  message: string;
  category: InAppCategory | string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  readAt?: string | null;
  createdAt: string;
  recipientUser?: UserProfile;
}

export interface NotificationAnalytics {
  totalJobs: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  suppressedCount: number;
  pendingCount: number;
  deliverySuccessRate: number;
  averageAttempts: number;
  channelBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  eventTypeBreakdown: Record<string, number>;
}




