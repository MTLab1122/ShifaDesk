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
  VoiceProvider,
  CallDirection,
  CallStatus,
  VoiceHandoverStatus,
  VoiceSpeakerType,
  TelephonyEventType,
  SttProvider,
  TtsProvider,
  CallerVerificationStatus,
  VoiceTransferStatus,
  LabOrderStatus,
  LabSampleStatus,
  LabResultStatus,
  LabReportStatus,
  LabResultType,
  ReviewDecision,
  LabAccessStatus,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentProvider,
  RefundStatus,
  InvoiceItemType,
  ExpenseStatus,
  CashSessionStatus,
  CashTransactionType,
  FinancialAdjustmentType,
  ReconciliationStatus,
  EncounterStatus,
  EncounterSource,
  EncounterType,
  DiagnosisType,
  DiagnosisStatus,
  PrescriptionStatus,
  FollowupStatus,
  SubscriptionStatus,
  BillingInterval,
  SaasInvoiceStatus,
  SaasPaymentStatus,
  SaasPaymentMethod,
  FeatureCode,
  SaasInvoiceItemType,
  ClinicType,
  TrialStatus,
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
  clinicType?: ClinicType | string;
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

// Phase 9: AI Voice Receptionist & Telephony Entities
export interface VoiceIntegration {
  id: string;
  organizationId: string;
  clinicId: string;
  provider: VoiceProvider | string;
  accountSid: string;
  phoneNumber: string;
  webhookUrl?: string | null;
  statusCallbackUrl?: string | null;
  encryptedAuthToken: string;
  encryptedConfig?: Record<string, any> | null;
  isVerified: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceConversationMessage {
  id: string;
  callSessionId: string;
  speaker: VoiceSpeakerType | string;
  messageText: string;
  language: string;
  audioUrl?: string | null;
  confidenceScore?: number | null;
  createdAt: string;
}

export interface VoiceCallEvent {
  id: string;
  callSessionId: string;
  providerEventId?: string | null;
  eventType: TelephonyEventType | string;
  eventPayload?: Record<string, any> | null;
  occurredAt: string;
  createdAt: string;
}

export interface VoiceHandoverRecord {
  id: string;
  callSessionId: string;
  assignedUserId?: string | null;
  transferTarget: string;
  handoverReason: string;
  transferStatus: VoiceTransferStatus | string;
  summary?: string | null;
  createdAt: string;
  completedAt?: string | null;
  assignedUser?: UserProfile | null;
}

export interface VoiceCallSession {
  id: string;
  organizationId: string;
  clinicId: string;
  voiceIntegrationId?: string | null;
  providerCallId: string;
  callerPhone: string;
  calledPhone: string;
  patientId?: string | null;
  direction: CallDirection | string;
  callStatus: CallStatus | string;
  detectedLanguage?: string | null;
  selectedLanguage?: string | null;
  startedAt: string;
  answeredAt?: string | null;
  endedAt?: string | null;
  durationSeconds: number;
  handoverStatus: VoiceHandoverStatus | string;
  handoverReason?: string | null;
  recordingUrl?: string | null;
  recordingConsent: boolean;
  verificationStatus: CallerVerificationStatus | string;
  verificationAttempts: number;
  createdAt: string;
  updatedAt: string;
  patient?: Patient | null;
  messages?: VoiceConversationMessage[];
  events?: VoiceCallEvent[];
  handovers?: VoiceHandoverRecord[];
}

export interface VoiceProviderSettings {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  sttProvider: SttProvider | string;
  ttsProvider: TtsProvider | string;
  llmProvider: string;
  voiceModel: string;
  voiceSpeed: number;
  conversationTimeoutMs: number;
  maxSilenceTimeoutMs: number;
  maxInteractionAttempts: number;
  enableRecording: boolean;
  recordingConsentMessage: string;
  transcriptRetentionDays: number;
  humanTransferNumber?: string | null;
  ivrGreetingMessage: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceAnalytics {
  totalCalls: number;
  completedCalls: number;
  missedCalls: number;
  failedCalls: number;
  averageDurationSeconds: number;
  languageDistribution: Record<string, number>;
  handoverCount: number;
  appointmentsBookedViaVoice: number;
  callsByDay: Array<{ date: string; count: number; completed: number }>;
}

// Phase 10: Diagnostic Laboratory Management & Secure Report Delivery Entities
export interface LaboratoryTestCategory {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tests?: LaboratoryTest[];
}

export interface LaboratoryTest {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  categoryId: string;
  testCode: string;
  testName: string;
  description?: string | null;
  sampleType: string;
  collectionInstructions?: string | null;
  preparationInstructions?: string | null;
  processingNotes?: string | null;
  turnaroundMinutes: number;
  price: number;
  currency: string;
  referenceRange?: string | null;
  unit?: string | null;
  resultType: LabResultType | string;
  active: boolean;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: LaboratoryTestCategory;
}

export interface LaboratoryPackageItem {
  id: string;
  packageId: string;
  testId: string;
  createdAt: string;
  package?: LaboratoryPackage;
  test?: LaboratoryTest;
}

export interface LaboratoryPackage {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  items?: LaboratoryPackageItem[];
}

export interface LaboratoryOrderItem {
  id: string;
  orderId: string;
  testId: string;
  packageId?: string | null;
  testNameSnapshot: string;
  testCodeSnapshot: string;
  priceSnapshot: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  test?: LaboratoryTest;
  package?: LaboratoryPackage | null;
  result?: LaboratoryResult | null;
}

export interface LaboratoryOrder {
  id: string;
  organizationId: string;
  clinicId: string;
  patientId: string;
  orderingDoctorId?: string | null;
  appointmentId?: string | null;
  orderReference: string;
  orderStatus: LabOrderStatus | string;
  totalAmount: number;
  currency: string;
  notes?: string | null;
  cancellationReason?: string | null;
  createdById?: string | null;
  expectedCompletionDate?: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: Patient;
  orderingDoctor?: Doctor | null;
  appointment?: Appointment | null;
  clinic?: Clinic;
  items?: LaboratoryOrderItem[];
  samples?: LaboratorySample[];
  reports?: LaboratoryReport[];
}

export interface LaboratorySample {
  id: string;
  organizationId: string;
  clinicId: string;
  orderId: string;
  sampleReference: string;
  sampleType: string;
  sampleStatus: LabSampleStatus | string;
  collectionInstructions?: string | null;
  collectedById?: string | null;
  collectedAt?: string | null;
  receivedById?: string | null;
  receivedAt?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: LaboratoryOrder;
  collectedBy?: UserProfile | null;
  receivedBy?: UserProfile | null;
}

export interface LaboratoryResultReview {
  id: string;
  resultId: string;
  reviewerId: string;
  decision: ReviewDecision | string;
  comments?: string | null;
  reviewedAt: string;
  reviewer?: UserProfile;
}

export interface LaboratoryResult {
  id: string;
  organizationId: string;
  clinicId: string;
  orderItemId: string;
  resultType: LabResultType | string;
  resultValue: string;
  unit?: string | null;
  referenceRange?: string | null;
  resultNotes?: string | null;
  resultStatus: LabResultStatus | string;
  enteredById: string;
  enteredAt: string;
  amendedReason?: string | null;
  createdAt: string;
  updatedAt: string;
  enteredBy?: UserProfile;
  orderItem?: LaboratoryOrderItem;
  reviews?: LaboratoryResultReview[];
}

export interface LaboratoryReport {
  id: string;
  organizationId: string;
  clinicId: string;
  orderId: string;
  reportReference: string;
  version: number;
  storagePath: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  reportStatus: LabReportStatus | string;
  approvedById?: string | null;
  approvedAt?: string | null;
  releasedById?: string | null;
  releasedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: LaboratoryOrder;
  approvedBy?: UserProfile | null;
  releasedBy?: UserProfile | null;
  accessTokens?: LaboratoryReportAccessToken[];
}

export interface LaboratoryReportAccessToken {
  id: string;
  organizationId: string;
  clinicId: string;
  reportId: string;
  patientId: string;
  tokenHash: string;
  tokenPrefix: string;
  expiresAt: string;
  revokedAt?: string | null;
  accessCount: number;
  maxAccessCount: number;
  createdAt: string;
  report?: LaboratoryReport;
  patient?: Patient;
}

export interface LaboratoryReportAccessLog {
  id: string;
  reportId: string;
  patientId?: string | null;
  tokenId?: string | null;
  accessStatus: LabAccessStatus | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  accessedAt: string;
}

export interface LaboratoryAuditLog {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  createdAt: string;
}

export interface LaboratoryAnalytics {
  totalOrders: number;
  ordersToday: number;
  pendingSamples: number;
  processingSamples: number;
  resultsAwaitingReview: number;
  reportsApproved: number;
  reportsDelivered: number;
  averageTurnaroundMinutes: number;
  ordersByStatus: Record<string, number>;
  samplesByStatus: Record<string, number>;
  reportsByStatus: Record<string, number>;
  volumeByDay: Array<{ date: string; orders: number; completed: number }>;
}

// ==========================================
// Phase 11: Financial Management Entities
// ==========================================

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  itemType: InvoiceItemType | string;
  itemReference?: string | null;
  descriptionSnapshot: string;
  quantity: number;
  unitPriceMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  createdAt: string;
}

export interface Invoice {
  id: string;
  organizationId: string;
  clinicId: string;
  patientId: string;
  appointmentId?: string | null;
  laboratoryOrderId?: string | null;
  invoiceReference: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  subtotalMinor: number;
  discountMinor: number;
  discountType?: string | null;
  discountReason?: string | null;
  taxMinor: number;
  taxRatePercent: number;
  totalMinor: number;
  paidMinor: number;
  outstandingMinor: number;
  currency: string;
  status: InvoiceStatus | string;
  issuedAt?: string | null;
  dueAt?: string | null;
  createdById?: string | null;
  cancellationReason?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: Patient;
  clinic?: Clinic;
  appointment?: Appointment;
  laboratoryOrder?: LaboratoryOrder;
  createdBy?: UserProfile | null;
  items?: InvoiceItem[];
  payments?: Payment[];
  allocations?: PaymentAllocation[];
  refunds?: Refund[];
  adjustments?: FinancialAdjustment[];
}

export interface Payment {
  id: string;
  organizationId: string;
  clinicId: string;
  invoiceId: string;
  patientId?: string | null;
  paymentReference: string;
  method: PaymentMethod | string;
  provider: PaymentProvider | string;
  providerTransactionId?: string | null;
  amountMinor: number;
  currency: string;
  status: PaymentStatus | string;
  idempotencyKey?: string | null;
  collectedById?: string | null;
  confirmedAt?: string | null;
  bankName?: string | null;
  bankReference?: string | null;
  cardLast4?: string | null;
  cardBrand?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  invoice?: Invoice;
  clinic?: Clinic;
  patient?: Patient;
  collectedBy?: UserProfile | null;
  refunds?: Refund[];
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  allocatedMinor: number;
  createdAt: string;
}

export interface Refund {
  id: string;
  organizationId: string;
  clinicId: string;
  paymentId: string;
  invoiceId: string;
  refundReference: string;
  amountMinor: number;
  currency: string;
  reason: string;
  status: RefundStatus | string;
  requestedById: string;
  approvedById?: string | null;
  rejectionReason?: string | null;
  providerRefundId?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  payment?: Payment;
  invoice?: Invoice;
}

export interface FinancialAdjustment {
  id: string;
  organizationId: string;
  clinicId: string;
  invoiceId: string;
  adjustmentType: FinancialAdjustmentType | string;
  amountMinor: number;
  reason: string;
  approvedById?: string | null;
  createdById: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  organizationId: string;
  clinicId: string;
  categoryId: string;
  expenseReference: string;
  description: string;
  amountMinor: number;
  currency: string;
  paymentMethod: string;
  vendor?: string | null;
  referenceNumber?: string | null;
  expenseDate: string;
  status: ExpenseStatus | string;
  createdById: string;
  approvedById?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: ExpenseCategory;
}

export interface CashRegisterSession {
  id: string;
  organizationId: string;
  clinicId: string;
  sessionNumber: string;
  openedById: string;
  closedById?: string | null;
  openingBalanceMinor: number;
  expectedClosingMinor: number;
  actualClosingMinor?: number | null;
  discrepancyMinor?: number | null;
  discrepancyReason?: string | null;
  status: CashSessionStatus | string;
  openedAt: string;
  closedAt?: string | null;
  reopenedAt?: string | null;
  reopenedById?: string | null;
  reopenReason?: string | null;
  createdAt: string;
  updatedAt: string;
  openedBy?: UserProfile;
  closedBy?: UserProfile | null;
  transactions?: CashRegisterTransaction[];
}

export interface CashRegisterTransaction {
  id: string;
  sessionId: string;
  transactionType: CashTransactionType | string;
  referenceType?: string | null;
  referenceId?: string | null;
  amountMinor: number;
  recordedById: string;
  notes?: string | null;
  createdAt: string;
}

export interface FinancialAnalytics {
  todayRevenueMinor: number;
  monthlyRevenueMinor: number;
  totalCollectedMinor: number;
  outstandingReceivablesMinor: number;
  pendingInvoicesCount: number;
  refundedAmountMinor: number;
  recordedExpensesMinor: number;
  netOperatingBalanceMinor: number;
  revenueByPaymentMethod: Record<string, number>;
  revenueByServiceCategory: Record<string, number>;
  revenueByClinic: Record<string, number>;
  timeline: Array<{ date: string; revenueMinor: number; expensesMinor: number; collectionsMinor: number }>;
}

export interface ReconciliationItem {
  id: string;
  type: 'PAYMENT' | 'BANK_RECORD' | 'GATEWAY_EVENT';
  reference: string;
  amountMinor: number;
  method: string;
  date: string;
  status: ReconciliationStatus | string;
  matchedWithReference?: string | null;
  notes?: string | null;
}

// ==========================================
// Phase 12: Clinical Encounter & EMR-Lite Interfaces
// ==========================================

export interface ClinicalEncounter {
  id: string;
  organizationId: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string | null;
  queueTokenId?: string | null;
  encounterReference: string;
  encounterDate: string;
  startTime: string;
  endTime?: string | null;
  timezone: string;
  status: EncounterStatus | string;
  source: EncounterSource | string;
  type: EncounterType | string;
  isFinalized: boolean;
  finalizedAt?: string | null;
  finalizedById?: string | null;
  cancellationReason?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
  clinic?: Clinic;
  patient?: Patient;
  doctor?: Doctor;
  appointment?: Appointment | null;
  queueToken?: QueueToken | null;
  clinicalNote?: ClinicalNote | null;
  observations?: PatientObservation[];
  diagnoses?: EncounterDiagnosis[];
  prescriptions?: Prescription[];
  laboratoryOrders?: LaboratoryOrder[];
  invoices?: Invoice[];
  followups?: EncounterFollowup[];
  amendments?: EncounterAmendment[];
  documentVersions?: ClinicalDocumentVersion[];
}

export interface EncounterStatusHistory {
  id: string;
  encounterId: string;
  fromStatus?: string | null;
  toStatus: string;
  changeReason?: string | null;
  changedById?: string | null;
  createdAt: string;
}

export interface ClinicalNote {
  id: string;
  encounterId: string;
  chiefComplaint: string;
  patientReportedSymptoms?: string | null;
  visitPurpose?: string | null;
  visitContext?: string | null;
  examinationNotes?: string | null;
  clinicalAssessment?: string | null;
  treatmentPlan?: string | null;
  remarks?: string | null;
  recordedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientMedicalHistory {
  id: string;
  organizationId: string;
  patientId: string;
  conditions?: string | null;
  surgeries?: string | null;
  allergies?: string | null;
  familyHistory?: string | null;
  socialHistory?: string | null;
  currentMedications?: string | null;
  lastUpdatedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientObservation {
  id: string;
  organizationId: string;
  clinicId: string;
  patientId: string;
  encounterId?: string | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulseRate?: number | null;
  temperature?: number | null;
  temperatureUnit: string;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
  measuredAt: string;
  recordedById?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface EncounterDiagnosis {
  id: string;
  encounterId: string;
  patientId: string;
  diagnosisDescription: string;
  diagnosisCode?: string | null;
  codingSystem: string;
  type: DiagnosisType | string;
  clinicalStatus: DiagnosisStatus | string;
  notes?: string | null;
  diagnosedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  organizationId: string;
  clinicId: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  prescriptionReference: string;
  version: number;
  status: PrescriptionStatus | string;
  cancellationReason?: string | null;
  notes?: string | null;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
  doctor?: Doctor;
  patient?: Patient;
  clinic?: Clinic;
  items?: PrescriptionItem[];
  amendments?: PrescriptionAmendment[];
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicationName: string;
  genericName?: string | null;
  strength: string;
  dosageForm: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity?: number | null;
  instructions?: string | null;
  createdAt: string;
}

export interface PrescriptionAmendment {
  id: string;
  prescriptionId: string;
  version: number;
  reason: string;
  amendedById: string;
  previousSnapshot: string;
  newSnapshot: string;
  createdAt: string;
}

export interface EncounterFollowup {
  id: string;
  encounterId: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  followupRequired: boolean;
  recommendedDate: string;
  instructions: string;
  status: FollowupStatus | string;
  scheduledAppointmentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EncounterAmendment {
  id: string;
  encounterId: string;
  versionNumber: number;
  amendmentReason: string;
  amendedById: string;
  previousStateJson: string;
  amendedStateJson: string;
  createdAt: string;
}

export interface ClinicalDocumentVersion {
  id: string;
  encounterId: string;
  documentType: string;
  versionNumber: number;
  documentTitle: string;
  contentJson: string;
  isFinal: boolean;
  signedById?: string | null;
  signedAt?: string | null;
  createdAt: string;
}

export interface PatientClinicalHistory {
  patient: Patient;
  medicalHistory: PatientMedicalHistory | null;
  encounters: ClinicalEncounter[];
  observations: PatientObservation[];
  prescriptions: Prescription[];
  diagnoses: EncounterDiagnosis[];
  laboratoryOrders: LaboratoryOrder[];
  followups: EncounterFollowup[];
}








export interface LaboratoryOrder {
  id: string;
  organizationId: string;
  clinicId: string;
  patientId: string;
  orderingDoctorId?: string | null;
  appointmentId?: string | null;
  orderReference: string;
  orderStatus: LabOrderStatus | string;
  totalAmount: number;
  currency: string;
  notes?: string | null;
  cancellationReason?: string | null;
  createdById?: string | null;
  expectedCompletionDate?: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: Patient;
  orderingDoctor?: Doctor | null;
  appointment?: Appointment | null;
  clinic?: Clinic;
  items?: LaboratoryOrderItem[];
  samples?: LaboratorySample[];
  reports?: LaboratoryReport[];
}

export interface LaboratorySample {
  id: string;
  organizationId: string;
  clinicId: string;
  orderId: string;
  sampleReference: string;
  sampleType: string;
  sampleStatus: LabSampleStatus | string;
  collectionInstructions?: string | null;
  collectedById?: string | null;
  collectedAt?: string | null;
  receivedById?: string | null;
  receivedAt?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: LaboratoryOrder;
  collectedBy?: UserProfile | null;
  receivedBy?: UserProfile | null;
}

export interface LaboratoryResultReview {
  id: string;
  resultId: string;
  reviewerId: string;
  decision: ReviewDecision | string;
  comments?: string | null;
  reviewedAt: string;
  reviewer?: UserProfile;
}

export interface LaboratoryResult {
  id: string;
  organizationId: string;
  clinicId: string;
  orderItemId: string;
  resultType: LabResultType | string;
  resultValue: string;
  unit?: string | null;
  referenceRange?: string | null;
  resultNotes?: string | null;
  resultStatus: LabResultStatus | string;
  enteredById: string;
  enteredAt: string;
  amendedReason?: string | null;
  createdAt: string;
  updatedAt: string;
  enteredBy?: UserProfile;
  orderItem?: LaboratoryOrderItem;
  reviews?: LaboratoryResultReview[];
}

export interface LaboratoryReport {
  id: string;
  organizationId: string;
  clinicId: string;
  orderId: string;
  reportReference: string;
  version: number;
  storagePath: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  reportStatus: LabReportStatus | string;
  approvedById?: string | null;
  approvedAt?: string | null;
  releasedById?: string | null;
  releasedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: LaboratoryOrder;
  approvedBy?: UserProfile | null;
  releasedBy?: UserProfile | null;
  accessTokens?: LaboratoryReportAccessToken[];
}

export interface LaboratoryReportAccessToken {
  id: string;
  organizationId: string;
  clinicId: string;
  reportId: string;
  patientId: string;
  tokenHash: string;
  tokenPrefix: string;
  expiresAt: string;
  revokedAt?: string | null;
  accessCount: number;
  maxAccessCount: number;
  createdAt: string;
  report?: LaboratoryReport;
  patient?: Patient;
}

export interface LaboratoryReportAccessLog {
  id: string;
  reportId: string;
  patientId?: string | null;
  tokenId?: string | null;
  accessStatus: LabAccessStatus | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  accessedAt: string;
}

export interface LaboratoryAuditLog {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  createdAt: string;
}

export interface LaboratoryAnalytics {
  totalOrders: number;
  ordersToday: number;
  pendingSamples: number;
  processingSamples: number;
  resultsAwaitingReview: number;
  reportsApproved: number;
  reportsDelivered: number;
  averageTurnaroundMinutes: number;
  ordersByStatus: Record<string, number>;
  samplesByStatus: Record<string, number>;
  reportsByStatus: Record<string, number>;
  volumeByDay: Array<{ date: string; orders: number; completed: number }>;
}







export interface FinancialAdjustment {
  id: string;
  organizationId: string;
  clinicId: string;
  invoiceId: string;
  adjustmentType: FinancialAdjustmentType | string;
  amountMinor: number;
  reason: string;
  approvedById?: string | null;
  createdById: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  organizationId: string;
  clinicId: string;
  categoryId: string;
  expenseReference: string;
  description: string;
  amountMinor: number;
  currency: string;
  paymentMethod: string;
  vendor?: string | null;
  referenceNumber?: string | null;
  expenseDate: string;
  status: ExpenseStatus | string;
  createdById: string;
  approvedById?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: ExpenseCategory;
}

export interface CashRegisterSession {
  id: string;
  organizationId: string;
  clinicId: string;
  sessionNumber: string;
  openedById: string;
  closedById?: string | null;
  openingBalanceMinor: number;
  expectedClosingMinor: number;
  actualClosingMinor?: number | null;
  discrepancyMinor?: number | null;
  discrepancyReason?: string | null;
  status: CashSessionStatus | string;
  openedAt: string;
  closedAt?: string | null;
  reopenedAt?: string | null;
  reopenedById?: string | null;
  reopenReason?: string | null;
  createdAt: string;
  updatedAt: string;
  openedBy?: UserProfile;
  closedBy?: UserProfile | null;
  transactions?: CashRegisterTransaction[];
}

export interface CashRegisterTransaction {
  id: string;
  sessionId: string;
  transactionType: CashTransactionType | string;
  referenceType?: string | null;
  referenceId?: string | null;
  amountMinor: number;
  recordedById: string;
  notes?: string | null;
  createdAt: string;
}

export interface FinancialAnalytics {
  todayRevenueMinor: number;
  monthlyRevenueMinor: number;
  totalCollectedMinor: number;
  outstandingReceivablesMinor: number;
  pendingInvoicesCount: number;
  refundedAmountMinor: number;
  recordedExpensesMinor: number;
  netOperatingBalanceMinor: number;
  revenueByPaymentMethod: Record<string, number>;
  revenueByServiceCategory: Record<string, number>;
  revenueByClinic: Record<string, number>;
  timeline: Array<{ date: string; revenueMinor: number; expensesMinor: number; collectionsMinor: number }>;
}

export interface ReconciliationItem {
  id: string;
  type: 'PAYMENT' | 'BANK_RECORD' | 'GATEWAY_EVENT';
  reference: string;
  amountMinor: number;
  method: string;
  date: string;
  status: ReconciliationStatus | string;
  matchedWithReference?: string | null;
  notes?: string | null;
}

// ==========================================
// Phase 12: Clinical Encounter & EMR-Lite Interfaces
// ==========================================

export interface ClinicalEncounter {
  id: string;
  organizationId: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string | null;
  queueTokenId?: string | null;
  encounterReference: string;
  encounterDate: string;
  startTime: string;
  endTime?: string | null;
  timezone: string;
  status: EncounterStatus | string;
  source: EncounterSource | string;
  type: EncounterType | string;
  isFinalized: boolean;
  finalizedAt?: string | null;
  finalizedById?: string | null;
  cancellationReason?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
  clinic?: Clinic;
  patient?: Patient;
  doctor?: Doctor;
  appointment?: Appointment | null;
  queueToken?: QueueToken | null;
  clinicalNote?: ClinicalNote | null;
  observations?: PatientObservation[];
  diagnoses?: EncounterDiagnosis[];
  prescriptions?: Prescription[];
  laboratoryOrders?: LaboratoryOrder[];
  invoices?: Invoice[];
  followups?: EncounterFollowup[];
  amendments?: EncounterAmendment[];
  documentVersions?: ClinicalDocumentVersion[];
}

export interface EncounterStatusHistory {
  id: string;
  encounterId: string;
  fromStatus?: string | null;
  toStatus: string;
  changeReason?: string | null;
  changedById?: string | null;
  createdAt: string;
}

export interface ClinicalNote {
  id: string;
  encounterId: string;
  chiefComplaint: string;
  patientReportedSymptoms?: string | null;
  visitPurpose?: string | null;
  visitContext?: string | null;
  examinationNotes?: string | null;
  clinicalAssessment?: string | null;
  treatmentPlan?: string | null;
  remarks?: string | null;
  recordedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientMedicalHistory {
  id: string;
  organizationId: string;
  patientId: string;
  conditions?: string | null;
  surgeries?: string | null;
  allergies?: string | null;
  familyHistory?: string | null;
  socialHistory?: string | null;
  currentMedications?: string | null;
  lastUpdatedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientObservation {
  id: string;
  organizationId: string;
  clinicId: string;
  patientId: string;
  encounterId?: string | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulseRate?: number | null;
  temperature?: number | null;
  temperatureUnit: string;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
  measuredAt: string;
  recordedById?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface EncounterDiagnosis {
  id: string;
  encounterId: string;
  patientId: string;
  diagnosisDescription: string;
  diagnosisCode?: string | null;
  codingSystem: string;
  type: DiagnosisType | string;
  clinicalStatus: DiagnosisStatus | string;
  notes?: string | null;
  diagnosedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  organizationId: string;
  clinicId: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  prescriptionReference: string;
  version: number;
  status: PrescriptionStatus | string;
  cancellationReason?: string | null;
  notes?: string | null;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
  doctor?: Doctor;
  patient?: Patient;
  clinic?: Clinic;
  items?: PrescriptionItem[];
  amendments?: PrescriptionAmendment[];
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicationName: string;
  genericName?: string | null;
  strength: string;
  dosageForm: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity?: number | null;
  instructions?: string | null;
  createdAt: string;
}

export interface PrescriptionAmendment {
  id: string;
  prescriptionId: string;
  version: number;
  reason: string;
  amendedById: string;
  previousSnapshot: string;
  newSnapshot: string;
  createdAt: string;
}

export interface EncounterFollowup {
  id: string;
  encounterId: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  followupRequired: boolean;
  recommendedDate: string;
  instructions: string;
  status: FollowupStatus | string;
  scheduledAppointmentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EncounterAmendment {
  id: string;
  encounterId: string;
  versionNumber: number;
  amendmentReason: string;
  amendedById: string;
  previousStateJson: string;
  amendedStateJson: string;
  createdAt: string;
}

export interface ClinicalDocumentVersion {
  id: string;
  encounterId: string;
  documentType: string;
  versionNumber: number;
  documentTitle: string;
  contentJson: string;
  isFinal: boolean;
  signedById?: string | null;
  signedAt?: string | null;
  createdAt: string;
}

export interface PatientClinicalHistory {
  patient: Patient;
  medicalHistory: PatientMedicalHistory | null;
  encounters: ClinicalEncounter[];
  observations: PatientObservation[];
  prescriptions: Prescription[];
  diagnoses: EncounterDiagnosis[];
  laboratoryOrders: LaboratoryOrder[];
  followups: EncounterFollowup[];
}









// ==========================================
// Phase 13: Advanced Analytics & BI Interfaces
// ==========================================

export interface KpiMetric {
  value: number;
  previousValue?: number | null;
  changePercentage?: number | null;
  trend?: 'UP' | 'DOWN' | 'NEUTRAL';
  unit?: string;
  periodLabel?: string;
}

export interface ExecutiveDashboardMetrics {
  period: {
    startDate: string;
    endDate: string;
    previousStartDate: string;
    previousEndDate: string;
    timezone: string;
  };
  appointments: {
    total: KpiMetric;
    completed: KpiMetric;
    cancelled: KpiMetric;
    noShow: KpiMetric;
    completionRate: KpiMetric;
  };
  patients: {
    totalRegistered: KpiMetric;
    newRegistered: KpiMetric;
    activePatients: KpiMetric;
  };
  clinical: {
    totalEncounters: KpiMetric;
    completedEncounters: KpiMetric;
    activeDoctors: KpiMetric;
  };
  laboratory: {
    totalOrders: KpiMetric;
    releasedReports: KpiMetric;
    pendingReviewReports: KpiMetric;
  };
  finance: {
    invoicedAmountPaisa: KpiMetric;
    collectedPaymentsPaisa: KpiMetric;
    outstandingReceivablesPaisa: KpiMetric;
    refundsPaisa: KpiMetric;
    expensesPaisa: KpiMetric;
    netOperatingBalancePaisa: KpiMetric;
  };
  communications: {
    totalWhatsappMessages: KpiMetric;
    totalVoiceCalls: KpiMetric;
    aiInteractions: KpiMetric;
    aiHandovers: KpiMetric;
  };
}

export interface AppointmentAnalytics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  reschedulingCount: number;
  walkInCount: number;
  scheduledCount: number;
  avgBookingLeadTimeHours: number;
  volumeTimeline: Array<{ date: string; total: number; completed: number; cancelled: number; noShow: number }>;
  statusDistribution: Record<string, number>;
  demandBySpecialty: Array<{ specialty: string; count: number }>;
  demandByDoctor: Array<{ doctorId: string; doctorName: string; count: number }>;
  demandByClinic: Array<{ clinicId: string; clinicName: string; count: number }>;
  peakBookingHours: Array<{ hour: number; count: number }>;
  peakBookingDays: Array<{ day: string; count: number }>;
}

export interface QueueAnalytics {
  tokensIssued: number;
  tokensCompleted: number;
  tokensSkipped: number;
  tokensCancelled: number;
  tokensNoShow: number;
  sampleSizeWaitTime: number;
  avgWaitTimeMinutes: number;
  medianWaitTimeMinutes: number;
  sampleSizeServiceDuration: number;
  avgServiceDurationMinutes: number;
  hourlyQueueLoad: Array<{ hour: number; tokens: number }>;
  dailyQueueVolume: Array<{ date: string; tokens: number; completed: number }>;
  doctorQueuePerformance: Array<{
    doctorId: string;
    doctorName: string;
    tokensServed: number;
    avgServiceMinutes: number;
  }>;
  clinicQueuePerformance: Array<{
    clinicId: string;
    clinicName: string;
    tokensServed: number;
    avgWaitMinutes: number;
  }>;
}

export interface PatientAnalytics {
  totalPatients: number;
  newRegistrations: number;
  returningPatients: number;
  activePatients: number;
  inactivePatients: number;
  appointmentToEncounterConversionRate: number;
  registrationTrends: Array<{ date: string; newPatients: number }>;
  visitFrequencyDistribution: Array<{ visitCountRange: string; patientCount: number }>;
  visitsByClinic: Array<{ clinicId: string; clinicName: string; patientCount: number }>;
}

export interface DoctorStaffAnalytics {
  doctorWorkloads: Array<{
    doctorId: string;
    doctorName: string;
    specialty: string;
    appointmentsAssigned: number;
    appointmentsCompleted: number;
    encountersCompleted: number;
    avgEncounterDurationMinutes: number;
    followupsScheduled: number;
    followupsCompleted: number;
    labOrdersInitiated: number;
  }>;
}

export interface LaboratoryAnalyticsData {
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  ordersByCategory: Array<{ category: string; count: number }>;
  sampleCollectionVolume: number;
  sampleRejectionRate: number;
  recollectionRate: number;
  avgTurnaroundHours: number;
  reportsApproved: number;
  reportsReleased: number;
  reportsPendingReview: number;
  revenuePaisa: number;
}

export interface FinancialAnalyticsSummary {
  totalInvoicedPaisa: number;
  totalCollectedPaisa: number;
  outstandingReceivablesPaisa: number;
  totalRefundsPaisa: number;
  totalExpensesPaisa: number;
  netOperatingBalancePaisa: number;
  cashRegisterCollectionsPaisa: number;
  paymentMethodDistribution: Record<string, number>;
  revenueByConsultationPaisa: number;
  revenueByLaboratoryPaisa: number;
  expenseCategoryBreakdown: Array<{ category: string; amountPaisa: number }>;
  revenueTrends: Array<{ date: string; invoicedPaisa: number; collectedPaisa: number }>;
}

export interface CommunicationAnalytics {
  whatsapp: {
    inboundMessages: number;
    outboundMessages: number;
    deliverySuccessRate: number;
    failedMessages: number;
    conversations: number;
    humanHandovers: number;
  };
  voice: {
    totalCalls: number;
    answeredCalls: number;
    missedCalls: number;
    completedCalls: number;
    transferredCalls: number;
    avgDurationSeconds: number;
    languageDistribution: Record<string, number>;
  };
}

export interface AIUsageAnalytics {
  totalInteractions: number;
  intentDistribution: Record<string, number>;
  toolExecutionsCount: number;
  toolExecutionSuccessRate: number;
  appointmentBookingsAttempted: number;
  appointmentBookingsCompleted: number;
  handoverCount: number;
  handoverRate: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  estimatedCostPkr: number;
}

export interface SavedReportConfiguration {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  name: string;
  description?: string | null;
  category: string;
  dimensions: string[];
  metrics: string[];
  filtersJson: Record<string, any>;
  grouping?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledReport {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  reportConfigurationId: string;
  name: string;
  frequency: string;
  recipients: string[];
  exportFormat: string;
  status: string;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  reportConfiguration?: SavedReportConfiguration;
  runs?: ScheduledReportRun[];
}

export interface ScheduledReportRun {
  id: string;
  scheduledReportId: string;
  organizationId: string;
  runStatus: string;
  rowCount: number;
  recipientsDelivered: string[];
  failureReason?: string | null;
  executionDurationMs: number;
  startedAt: string;
  completedAt?: string | null;
}

export interface AnalyticsExportLog {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  reportName: string;
  category: string;
  exportFormat: string;
  filtersApplied: Record<string, any>;
  rowCount: number;
  fileSizeBytes: number;
  exportedById: string;
  exportedAt: string;
}

export interface ReportQueryResult {
  columns: Array<{ key: string; label: string; type: 'string' | 'number' | 'date' | 'currency' }>;
  rows: Array<Record<string, any>>;
  summary?: Record<string, any>;
  totalRows: number;
  generatedAt: string;
}

// ==========================================
// Phase 14: SaaS Subscription Entities & DTOs
// ==========================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  monthlyPricePaisa: number;
  annualPricePaisa: number;
  currency: string;
  trialDays: number;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  versions?: SubscriptionPlanVersion[];
}

export interface SubscriptionPlanVersion {
  id: string;
  planId: string;
  version: number;
  monthlyPricePaisa: number;
  annualPricePaisa: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  features: string[];
  limits: Record<string, number>;
  overagePolicy: string;
  gracePeriodDays: number;
  createdAt: string;
  plan?: SubscriptionPlan;
  entitlements?: PlanEntitlement[];
}

export interface PlanEntitlement {
  id: string;
  planVersionId: string;
  featureCode: FeatureCode | string;
  isIncluded: boolean;
  limitType: 'UNLIMITED' | 'COUNT' | 'BOOLEAN';
  limitValue: number;
  description?: string | null;
  createdAt: string;
}

export interface TenantSubscription {
  id: string;
  organizationId: string;
  planId: string;
  planVersionId: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string | null;
  trialEnd?: string | null;
  gracePeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  unitPricePaisa: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
  plan?: SubscriptionPlan;
  planVersion?: SubscriptionPlanVersion;
}

export interface SubscriptionStatusHistory {
  id: string;
  subscriptionId: string;
  previousStatus?: string | null;
  newStatus: string;
  reason?: string | null;
  changedById?: string | null;
  createdAt: string;
}

export interface SubscriptionInvoice {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  subscriptionId?: string | null;
  planVersionSnapshot: Record<string, any>;
  status: SaasInvoiceStatus;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  currency: string;
  subtotalPaisa: number;
  discountPaisa: number;
  taxPaisa: number;
  totalPaisa: number;
  amountPaidPaisa: number;
  outstandingPaisa: number;
  issueDate: string;
  dueDate: string;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
  items?: SubscriptionInvoiceItem[];
  payments?: SubscriptionPayment[];
}

export interface SubscriptionInvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  itemType: SaasInvoiceItemType | string;
  quantity: number;
  unitPricePaisa: number;
  totalPricePaisa: number;
  createdAt: string;
}

export interface SubscriptionPayment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  organizationId: string;
  amountPaisa: number;
  currency: string;
  paymentMethod: SaasPaymentMethod | string;
  status: SaasPaymentStatus;
  provider: string;
  providerTransactionId?: string | null;
  paymentReference?: string | null;
  proofDocumentUrl?: string | null;
  verifiedById?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  invoice?: SubscriptionInvoice;
}

export interface TenantEntitlementOverride {
  id: string;
  organizationId: string;
  featureCode: FeatureCode | string;
  isIncluded: boolean;
  limitValue?: number | null;
  grantedReason: string;
  expiresAt?: string | null;
  grantedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageEvent {
  id: string;
  organizationId: string;
  clinicId?: string | null;
  featureCode: FeatureCode | string;
  quantity: number;
  source: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, any>;
  timestamp: string;
  createdAt: string;
}

export interface UsagePeriodSummary {
  id: string;
  organizationId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  featureCode: FeatureCode | string;
  totalUsage: number;
  limitValue: number;
  isExceeded: boolean;
  lastAggregatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrialRecord {
  id: string;
  organizationId: string;
  userProfileId: string;
  planId: string;
  startedAt: string;
  expiresAt: string;
  extendedDays: number;
  extensionReason?: string | null;
  status: TrialStatus | string;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionalCredit {
  id: string;
  organizationId: string;
  code: string;
  amountPaisa: number;
  remainingPaisa: number;
  expiresAt?: string | null;
  isActive: boolean;
  grantedById: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAdminAuditLog {
  id: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  createdAt: string;
}

export interface UsageSummaryItem {
  featureCode: FeatureCode | string;
  label: string;
  currentUsage: number;
  limitValue: number;
  isUnlimited: boolean;
  percentageUsed: number;
  status: 'NORMAL' | 'WARNING' | 'EXCEEDED';
  unit: string;
}

export interface TenantUsageSummary {
  organizationId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  daysRemainingInPeriod: number;
  items: UsageSummaryItem[];
}

export interface PlatformOverviewMetrics {
  totalTenants: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  suspendedSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  mrrPaisa: number;
  arrPaisa: number;
  outstandingInvoicesPaisa: number;
  churnRatePercent: number;
  planDistribution: Array<{ planCode: string; planName: string; count: number; percentage: number }>;
  recentSignups: Array<{
    organizationId: string;
    organizationName: string;
    slug: string;
    createdAt: string;
    status: string;
    planName: string;
    subscriptionStatus: string;
  }>;
}

export interface TenantOnboardingStatus {
  accountRegistered: boolean;
  clinicProfileCompleted: boolean;
  planSelected: boolean;
  operatingHoursConfigured: boolean;
  staffInvited: boolean;
  completed: boolean;
}

export interface ClinicRegistrationResponse {
  organizationId: string;
  clinicId: string;
  userProfileId: string;
  token: string;
  subscriptionId?: string;
  status: 'SUCCESS';
  message: string;
}

