import {
  ApiResponse,
  ApiErrorResponse,
  AuthMeResponse,
  Organization,
  Clinic,
  UserProfile,
  OrganizationMembership,
  AuditLog,
  Doctor,
  StaffMember,
  Patient,
  DoctorWorkingHours,
  DoctorScheduleException,
  Appointment,
  AvailableSlot,
  PaginatedResult,
  ClinicQueueSettings,
  ClinicQueueSession,
  QueueToken,
  PublicQueueDisplay,
  WhatsappIntegration,
  WhatsappContact,
  WhatsappConversation,
  WhatsappMessage,
  WhatsappMessageTemplate,
  WhatsAppConnectionHealth,
  AiAssistantSettings,
  AiConversationState,
  AiInteractionLog,
  ClinicFaq,
  AiToolExecutionLog,
  AiAssistantHealth,
  AiUsageStats,
  NotificationPreference,
  NotificationRule,
  NotificationTemplate,
  NotificationJob,
  InAppNotification,
  NotificationAnalytics,
  VoiceIntegration,
  VoiceCallSession,
  VoiceConversationMessage,
  VoiceProviderSettings,
  VoiceAnalytics,
  LaboratoryTestCategory,
  LaboratoryTest,
  LaboratoryPackage,
  LaboratoryOrder,
  LaboratorySample,
  LaboratoryResult,
  LaboratoryReport,
  LaboratoryAnalytics,
  Invoice,
  Payment,
  Refund,
  Expense,
  ExpenseCategory,
  CashRegisterSession,
  FinancialAnalytics,
  ClinicalEncounter,
  ClinicalNote,
  PatientMedicalHistory,
  PatientObservation,
  EncounterDiagnosis,
  Prescription,
  EncounterFollowup,
  PatientClinicalHistory,
  ExecutiveDashboardMetrics,
  AppointmentAnalytics,
  QueueAnalytics,
  PatientAnalytics,
  DoctorStaffAnalytics,
  LaboratoryAnalyticsData,
  FinancialAnalyticsSummary,
  CommunicationAnalytics,
  AIUsageAnalytics,
  SavedReportConfiguration,
  ScheduledReport,
  ReportQueryResult,
  SubscriptionPlan,
  TenantSubscription,
  SubscriptionInvoice,
  SubscriptionPayment,
  TenantUsageSummary,
  PlatformOverviewMetrics,
  TenantOnboardingStatus,
  ClinicRegistrationResponse,
  TenantEntitlementOverride,
  PromotionalCredit,
  PlatformAdminAuditLog,
} from '@matabai/shared';
import {
  CreateWhatsappIntegrationInput,
  SendWhatsappTextMessageInput,
  SendWhatsappTemplateMessageInput,
  UpdateWhatsappConsentInput,
  UpdateAiAssistantSettingsInput,
  CreateClinicFaqInput,
  UpdateClinicFaqInput,
  SaveNotificationPreferenceDto,
  OptOutNotificationPreferenceDto,
  CreateNotificationRuleDto,
  UpdateNotificationRuleDto,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  PreviewNotificationTemplateDto,
  QueryNotificationJobsDto,
  CreateVoiceIntegrationInput,
  UpdateVoiceIntegrationInput,
  UpdateVoiceSettingsInput,
  QueryVoiceCallsInput,
  AssignVoiceHandoverInput,
  SimulateVoiceCallInput,
  CreateLabCategoryInput,
  UpdateLabCategoryInput,
  CreateLabTestInput,
  UpdateLabTestInput,
  QueryLabTestsInput,
  CreateLabPackageInput,
  UpdateLabPackageInput,
  CreateLabOrderInput,
  UpdateLabOrderInput,
  CancelLabOrderInput,
  QueryLabOrdersInput,
  CreateLabSampleInput,
  UpdateLabSampleStatusInput,
  QueryLabSamplesInput,
  EnterLabResultInput,
  AmendLabResultInput,
  ReviewLabResultInput,
  ApproveLabReportInput,
  ReleaseLabReportInput,
  RevokeReportAccessInput,
  VerifyReportAccessInput,
  QueryLabReportsInput,
  QueryLabAnalyticsInput,
  CreateInvoiceInput,
  CancelInvoiceInput,
  QueryInvoicesInput,
  CollectPaymentInput,
  QueryPaymentsInput,
  RequestRefundInput,
  ReviewRefundInput,
  QueryRefundsInput,
  CreateExpenseCategoryInput,
  CreateExpenseInput,
  UpdateExpenseInput,
  QueryExpensesInput,
  OpenCashRegisterInput,
  CloseCashRegisterInput,
  ReopenCashRegisterInput,
  QueryCashSessionsInput,
  QueryFinancialAnalyticsInput,
  ManualReconciliationInput,
  CreateEncounterInput,
  UpdateEncounterStatusInput,
  ReassignEncounterInput,
  CancelEncounterInput,
  QueryEncountersInput,
  SaveClinicalNoteInput,
  SaveMedicalHistoryInput,
  RecordObservationInput,
  CreateDiagnosisInput,
  UpdateDiagnosisInput,
  CreatePrescriptionInput,
  AmendPrescriptionInput,
  CancelPrescriptionInput,
  QueryPrescriptionsInput,
  CreateFollowupInput,
  UpdateFollowupInput,
  QueryFollowupsInput,
  FinalizeEncounterInput,
  AmendEncounterInput,
  AnalyticsFilterInput,
  SaveReportConfigurationInput,
  UpdateReportConfigurationInput,
  RunReportQueryInput,
  ExportReportInput,
  CreateScheduledReportInput,
  UpdateScheduledReportInput,
  ClinicRegistrationInput,
  CompleteOnboardingInput,
  CreateSubscriptionPlanInput,
  UpdateSubscriptionPlanInput,
  UpgradePlanInput,
  DowngradePlanInput,
  CancelSubscriptionInput,
  SubmitPaymentProofInput,
  TenantStatusActionInput,
  GrantEntitlementOverrideInput,
  GrantPromotionalCreditInput,
} from '@matabai/validation';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiClient {
  private static token: string | null = null;
  private static organizationId: string | null = null;

  static setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('matabai_token', token);
      else localStorage.removeItem('matabai_token');
    }
  }

  static getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('matabai_token');
    }
    return this.token;
  }

  static setOrganizationId(orgId: string | null) {
    this.organizationId = orgId;
    if (typeof window !== 'undefined') {
      if (orgId) localStorage.setItem('matabai_org_id', orgId);
      else localStorage.removeItem('matabai_org_id');
    }
  }

  static getOrganizationId(): string | null {
    if (!this.organizationId && typeof window !== 'undefined') {
      this.organizationId = localStorage.getItem('matabai_org_id');
    }
    return this.organizationId;
  }

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = this.getToken();
    const orgId = this.getOrganizationId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(orgId && { 'x-organization-id': orgId }),
      ...(options.headers as Record<string, string>),
    };

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${cleanEndpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const error: ApiErrorResponse = data || {
          success: false,
          statusCode: response.status,
          error: response.statusText,
          message: 'Network request failed',
          timestamp: new Date().toISOString(),
        };
        throw error;
      }

      // Handle ApiResponse envelope or direct payload
      if (data && typeof data === 'object' && 'data' in data && 'success' in data) {
        return (data as ApiResponse<T>).data;
      }

      return data as T;
    } catch (err) {
      if ((err as ApiErrorResponse).statusCode) {
        throw err;
      }
      throw {
        success: false,
        statusCode: 0,
        error: 'NetworkError',
        message: (err as Error).message || 'Unable to connect to backend server',
        timestamp: new Date().toISOString(),
      } as ApiErrorResponse;
    }
  }

  // Auth Endpoints
  static auth = {
    getMe: () => ApiClient.request<AuthMeResponse>('/auth/me'),
    logout: () => ApiClient.request<{ success: boolean; message: string }>('/auth/logout', { method: 'POST' }),
    validateSession: () => ApiClient.request<{ valid: boolean }>('/auth/validate-session', { method: 'POST' }),
  };

  // Organizations Endpoints
  static organizations = {
    list: (page = 1, limit = 20) =>
      ApiClient.request<PaginatedResult<Organization>>(`/organizations?page=${page}&limit=${limit}`),
    get: (id: string) => ApiClient.request<Organization>(`/organizations/${id}`),
    create: (data: { name: string; slug: string }) =>
      ApiClient.request<Organization>('/organizations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Organization>) =>
      ApiClient.request<Organization>(`/organizations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  };

  // Clinics Endpoints
  static clinics = {
    list: (params?: { organizationId?: string; page?: number; limit?: number; search?: string; status?: string }) => {
      const query = new URLSearchParams();
      if (params?.organizationId) query.set('organizationId', params.organizationId);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.search) query.set('search', params.search);
      if (params?.status) query.set('status', params.status);
      return ApiClient.request<PaginatedResult<Clinic>>(`/clinics?${query.toString()}`);
    },
    get: (id: string) => ApiClient.request<Clinic>(`/clinics/${id}`),
    create: (data: {
      organizationId: string;
      name: string;
      slug: string;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      timezone?: string;
      status?: string;
    }) =>
      ApiClient.request<Clinic>('/clinics', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Clinic>) =>
      ApiClient.request<Clinic>(`/clinics/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string) =>
      ApiClient.request<Clinic>(`/clinics/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  };

  // Doctors Endpoints
  static doctors = {
    list: (params?: {
      organizationId?: string;
      clinicId?: string;
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      specialty?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.organizationId) query.set('organizationId', params.organizationId);
      if (params?.clinicId) query.set('clinicId', params.clinicId);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.search) query.set('search', params.search);
      if (params?.status) query.set('status', params.status);
      if (params?.specialty) query.set('specialty', params.specialty);
      return ApiClient.request<PaginatedResult<Doctor>>(`/doctors?${query.toString()}`);
    },
    get: (id: string) => ApiClient.request<Doctor>(`/doctors/${id}`),
    create: (data: {
      clinicId: string;
      fullName: string;
      email?: string | null;
      phone: string;
      specialty: string;
      qualification: string;
      registrationNumber?: string;
      consultationFee: number;
      biography?: string | null;
      profileImageUrl?: string | null;
      status?: string;
      organizationId?: string;
    }) =>
      ApiClient.request<Doctor>('/doctors', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Doctor>) =>
      ApiClient.request<Doctor>(`/doctors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string) =>
      ApiClient.request<Doctor>(`/doctors/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  };

  // Staff Members Endpoints
  static staff = {
    list: (params?: {
      organizationId?: string;
      clinicId?: string;
      page?: number;
      limit?: number;
      search?: string;
      designation?: string;
      department?: string;
      status?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.organizationId) query.set('organizationId', params.organizationId);
      if (params?.clinicId) query.set('clinicId', params.clinicId);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.search) query.set('search', params.search);
      if (params?.designation) query.set('designation', params.designation);
      if (params?.department) query.set('department', params.department);
      if (params?.status) query.set('status', params.status);
      return ApiClient.request<PaginatedResult<StaffMember>>(`/staff?${query.toString()}`);
    },
    get: (id: string) => ApiClient.request<StaffMember>(`/staff/${id}`),
    create: (data: {
      clinicId: string;
      fullName: string;
      email: string;
      phone: string;
      designation: string;
      department: string;
      employmentStatus?: string;
      organizationId?: string;
    }) =>
      ApiClient.request<StaffMember>('/staff', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<StaffMember>) =>
      ApiClient.request<StaffMember>(`/staff/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string) =>
      ApiClient.request<StaffMember>(`/staff/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  };

  // Patients Endpoints
  static patients = {
    list: (params?: {
      organizationId?: string;
      clinicId?: string;
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.organizationId) query.set('organizationId', params.organizationId);
      if (params?.clinicId) query.set('clinicId', params.clinicId);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.search) query.set('search', params.search);
      if (params?.status) query.set('status', params.status);
      return ApiClient.request<PaginatedResult<Patient>>(`/patients?${query.toString()}`);
    },
    get: (id: string) => ApiClient.request<Patient>(`/patients/${id}`),
    create: (data: {
      clinicId: string;
      fullName: string;
      phone: string;
      email?: string | null;
      dateOfBirth?: string | null;
      gender?: string | null;
      address?: string | null;
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
      consentStatus?: string;
      status?: string;
      organizationId?: string;
    }) =>
      ApiClient.request<Patient>('/patients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Patient>) =>
      ApiClient.request<Patient>(`/patients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string) =>
      ApiClient.request<Patient>(`/patients/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  };

  // User Profile Endpoints
  static users = {
    getMe: () => ApiClient.request<UserProfile>('/users/me'),
    updateMe: (data: { fullName?: string; phone?: string | null; avatarUrl?: string | null }) =>
      ApiClient.request<UserProfile>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  };

  // Memberships Endpoints
  static memberships = {
    list: (params?: { organizationId?: string; clinicId?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.organizationId) query.set('organizationId', params.organizationId);
      if (params?.clinicId) query.set('clinicId', params.clinicId);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<OrganizationMembership>>(`/memberships?${query.toString()}`);
    },
    create: (data: {
      scope: 'organization' | 'clinic';
      scopeId: string;
      email?: string;
      userProfileId?: string;
      role: string;
    }) =>
      ApiClient.request('/memberships', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { role?: string; status?: string }) =>
      ApiClient.request(`/memberships/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      ApiClient.request(`/memberships/${id}`, {
        method: 'DELETE',
      }),
  };

  // Audit Logs Endpoints
  static auditLogs = {
    list: (params?: { organizationId?: string; clinicId?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.organizationId) query.set('organizationId', params.organizationId);
      if (params?.clinicId) query.set('clinicId', params.clinicId);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<AuditLog>>(`/audit-logs?${query.toString()}`);
    },
  };

  // Doctor Working Hours Endpoints
  static workingHours = {
    list: (doctorId: string, clinicId?: string) => {
      const query = new URLSearchParams();
      if (clinicId) query.set('clinicId', clinicId);
      return ApiClient.request<DoctorWorkingHours[]>(`/doctors/${doctorId}/working-hours?${query.toString()}`);
    },
    create: (doctorId: string, data: {
      clinicId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDurationMinutes?: number;
      breakStartTime?: string | null;
      breakEndTime?: string | null;
      isActive?: boolean;
    }) =>
      ApiClient.request<DoctorWorkingHours>(`/doctors/${doctorId}/working-hours`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (doctorId: string, id: string, data: Partial<DoctorWorkingHours>) =>
      ApiClient.request<DoctorWorkingHours>(`/doctors/${doctorId}/working-hours/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (doctorId: string, id: string) =>
      ApiClient.request<{ success: boolean; message: string }>(`/doctors/${doctorId}/working-hours/${id}`, {
        method: 'DELETE',
      }),
  };

  // Doctor Schedule Exceptions Endpoints
  static scheduleExceptions = {
    list: (doctorId: string, clinicId?: string) => {
      const query = new URLSearchParams();
      if (clinicId) query.set('clinicId', clinicId);
      return ApiClient.request<DoctorScheduleException[]>(`/doctors/${doctorId}/schedule-exceptions?${query.toString()}`);
    },
    create: (doctorId: string, data: {
      clinicId: string;
      exceptionDate: string;
      exceptionType: string;
      startTime?: string | null;
      endTime?: string | null;
      reason?: string | null;
    }) =>
      ApiClient.request<DoctorScheduleException>(`/doctors/${doctorId}/schedule-exceptions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (doctorId: string, id: string, data: Partial<DoctorScheduleException>) =>
      ApiClient.request<DoctorScheduleException>(`/doctors/${doctorId}/schedule-exceptions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (doctorId: string, id: string) =>
      ApiClient.request<{ success: boolean; message: string }>(`/doctors/${doctorId}/schedule-exceptions/${id}`, {
        method: 'DELETE',
      }),
  };

  // Availability Endpoints
  static availability = {
    get: (params: { clinicId: string; doctorId: string; date: string }) => {
      const query = new URLSearchParams();
      query.set('clinicId', params.clinicId);
      query.set('doctorId', params.doctorId);
      query.set('date', params.date);
      return ApiClient.request<AvailableSlot[]>(`/availability?${query.toString()}`);
    },
  };

  // Appointments Endpoints
  static appointments = {
    list: (params?: {
      page?: number;
      limit?: number;
      clinicId?: string;
      doctorId?: string;
      patientId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.clinicId) query.set('clinicId', params.clinicId);
      if (params?.doctorId) query.set('doctorId', params.doctorId);
      if (params?.patientId) query.set('patientId', params.patientId);
      if (params?.status) query.set('status', params.status);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      if (params?.search) query.set('search', params.search);
      if (params?.sortBy) query.set('sortBy', params.sortBy);
      if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
      return ApiClient.request<PaginatedResult<Appointment>>(`/appointments?${query.toString()}`);
    },
    get: (id: string) => ApiClient.request<Appointment>(`/appointments/${id}`),
    create: (data: {
      clinicId: string;
      doctorId: string;
      patientId: string;
      appointmentDate: string;
      startTime: string;
      endTime: string;
      bookingSource?: string;
      reasonForVisit?: string | null;
      internalNotes?: string | null;
    }) =>
      ApiClient.request<Appointment>('/appointments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    reschedule: (id: string, data: {
      appointmentDate: string;
      startTime: string;
      endTime: string;
      reason?: string | null;
    }) =>
      ApiClient.request<Appointment>(`/appointments/${id}/reschedule`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (id: string, data: { reason: string }) =>
      ApiClient.request<{ success: boolean; message: string; appointment: Appointment }>(
        `/appointments/${id}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),
    updateStatus: (id: string, data: { status: string; reason?: string | null }) =>
      ApiClient.request<Appointment>(`/appointments/${id}/status`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // Phase 5 Queue Settings
  static queueSettings = {
    list: (params?: { clinicId?: string }) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.append('clinicId', params.clinicId);
      return ApiClient.request<ClinicQueueSettings[]>(`/queue/settings?${q.toString()}`);
    },
    get: (id: string) => ApiClient.request<ClinicQueueSettings>(`/queue/settings/${id}`),
    create: (data: Partial<ClinicQueueSettings>) =>
      ApiClient.request<ClinicQueueSettings>('/queue/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<ClinicQueueSettings>) =>
      ApiClient.request<ClinicQueueSettings>(`/queue/settings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    regeneratePublicKey: (id: string) =>
      ApiClient.request<{ publicQueueId: string }>(`/queue/settings/${id}/regenerate-public-key`, {
        method: 'POST',
      }),
  };

  // Phase 5 Queue Sessions
  static queueSessions = {
    list: (params?: { clinicId?: string; doctorId?: string; sessionDate?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.append('clinicId', params.clinicId);
      if (params?.doctorId) q.append('doctorId', params.doctorId);
      if (params?.sessionDate) q.append('sessionDate', params.sessionDate);
      if (params?.status) q.append('status', params.status);
      return ApiClient.request<PaginatedResult<ClinicQueueSession>>(`/queue/sessions?${q.toString()}`);
    },
    get: (id: string) =>
      ApiClient.request<ClinicQueueSession & {
        stats: {
          waitingCount: number;
          servingCount: number;
          completedCount: number;
          skippedCount: number;
          cancelledCount: number;
          totalRegistered: number;
        };
        activeCalledToken: QueueToken | null;
        activeServingToken: QueueToken | null;
      }>(`/queue/sessions/${id}`),
    create: (data: { clinicId: string; queueSettingsId: string; doctorId?: string; sessionDate?: string }) =>
      ApiClient.request<ClinicQueueSession>('/queue/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    start: (id: string) =>
      ApiClient.request<ClinicQueueSession>(`/queue/sessions/${id}/start`, { method: 'POST' }),
    pause: (id: string) =>
      ApiClient.request<ClinicQueueSession>(`/queue/sessions/${id}/pause`, { method: 'POST' }),
    resume: (id: string) =>
      ApiClient.request<ClinicQueueSession>(`/queue/sessions/${id}/resume`, { method: 'POST' }),
    close: (id: string, force = false) =>
      ApiClient.request<ClinicQueueSession>(`/queue/sessions/${id}/close`, {
        method: 'POST',
        body: JSON.stringify({ force }),
      }),
  };

  // Phase 5 Queue Tokens & Operations
  static queueTokens = {
    checkInAppointment: (appointmentId: string) =>
      ApiClient.request<QueueToken>('/queue/check-in/appointment', {
        method: 'POST',
        body: JSON.stringify({ appointmentId }),
      }),
    checkInWalkIn: (data: {
      clinicId: string;
      patientId: string;
      queueSessionId?: string;
      queueSettingsId?: string;
      notes?: string;
      priorityType?: string;
    }) =>
      ApiClient.request<QueueToken>('/queue/check-in/walk-in', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: (params?: { clinicId?: string; queueSessionId?: string; status?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.append('clinicId', params.clinicId);
      if (params?.queueSessionId) q.append('queueSessionId', params.queueSessionId);
      if (params?.status) q.append('status', params.status);
      if (params?.search) q.append('search', params.search);
      return ApiClient.request<PaginatedResult<QueueToken>>(`/queue/tokens?${q.toString()}`);
    },
    get: (id: string) => ApiClient.request<QueueToken>(`/queue/tokens/${id}`),
    callNext: (sessionId: string) =>
      ApiClient.request<QueueToken>(`/queue/sessions/${sessionId}/call-next`, { method: 'POST' }),
    recall: (id: string) =>
      ApiClient.request<QueueToken>(`/queue/tokens/${id}/recall`, { method: 'POST' }),
    startServing: (id: string) =>
      ApiClient.request<QueueToken>(`/queue/tokens/${id}/start-serving`, { method: 'POST' }),
    complete: (id: string) =>
      ApiClient.request<QueueToken>(`/queue/tokens/${id}/complete`, { method: 'POST' }),
    skip: (id: string, reason?: string) =>
      ApiClient.request<QueueToken>(`/queue/tokens/${id}/skip`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    restore: (id: string) =>
      ApiClient.request<QueueToken>(`/queue/tokens/${id}/restore`, { method: 'POST' }),
    noShow: (id: string, reason?: string) =>
      ApiClient.request<QueueToken>(`/queue/tokens/${id}/no-show`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    cancel: (id: string, reason?: string) =>
      ApiClient.request<QueueToken>(`/queue/tokens/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    setPriority: (id: string, priorityType: string, reason?: string) =>
      ApiClient.request<QueueToken>(`/queue/tokens/${id}/priority`, {
        method: 'POST',
        body: JSON.stringify({ priorityType, reason }),
      }),
  };

  // Phase 5 Patient Tokens
  static patientTokens = {
    list: () => ApiClient.request<{ data: QueueToken[] }>('/patient/tokens'),
    get: (id: string) =>
      ApiClient.request<QueueToken & { currentActiveToken?: any; patientsAhead: number }>(
        `/patient/tokens/${id}`,
      ),
  };

  // Phase 5 Public Queue
  static publicQueue = {
    get: (publicQueueId: string) =>
      ApiClient.request<PublicQueueDisplay>(`/public/queues/${publicQueueId}`),
  };
  // Phase 6 WhatsApp Business Cloud API Integration Endpoints
  static whatsapp = {
    getIntegration: (clinicId: string) =>
      ApiClient.request<WhatsappIntegration | null>(`/whatsapp/integration?clinicId=${clinicId}`),

    upsertIntegration: (data: CreateWhatsappIntegrationInput) =>
      ApiClient.request<WhatsappIntegration>('/whatsapp/integration', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    checkHealth: (clinicId: string) =>
      ApiClient.request<WhatsAppConnectionHealth>(`/whatsapp/integration/health?clinicId=${clinicId}`),

    getTemplates: (clinicId: string) =>
      ApiClient.request<WhatsappMessageTemplate[]>(`/whatsapp/templates?clinicId=${clinicId}`),

    sendTextMessage: (data: SendWhatsappTextMessageInput) =>
      ApiClient.request<WhatsappMessage>('/whatsapp/send-text', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    sendTemplateMessage: (data: SendWhatsappTemplateMessageInput) =>
      ApiClient.request<WhatsappMessage>('/whatsapp/send-template', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listConversations: (params: {
      clinicId: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      query.set('clinicId', params.clinicId);
      if (params.status) query.set('status', params.status);
      if (params.search) query.set('search', params.search);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<WhatsappConversation>>(`/whatsapp/conversations?${query.toString()}`);
    },

    getConversation: (id: string) =>
      ApiClient.request<WhatsappConversation>(`/whatsapp/conversations/${id}`),

    replyConversation: (id: string, message: string) =>
      ApiClient.request<WhatsappMessage>(`/whatsapp/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),

    claimConversation: (id: string) =>
      ApiClient.request<WhatsappConversation>(`/whatsapp/conversations/${id}/claim`, {
        method: 'POST',
      }),

    resolveConversation: (id: string) =>
      ApiClient.request<WhatsappConversation>(`/whatsapp/conversations/${id}/resolve`, {
        method: 'POST',
      }),

    reopenConversation: (id: string) =>
      ApiClient.request<WhatsappConversation>(`/whatsapp/conversations/${id}/reopen`, {
        method: 'POST',
      }),

    updateConsent: (contactId: string, data: UpdateWhatsappConsentInput) =>
      ApiClient.request<WhatsappContact>(`/whatsapp/contacts/${contactId}/consent`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  static ai = {
    getSettings: (clinicId?: string) => {
      const url = clinicId ? `/ai/settings?clinicId=${clinicId}` : '/ai/settings';
      return ApiClient.request<AiAssistantSettings>(url);
    },

    updateSettings: (data: UpdateAiAssistantSettingsInput) =>
      ApiClient.request<AiAssistantSettings>('/ai/settings', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    enableAssistant: (clinicId?: string) =>
      ApiClient.request<AiAssistantSettings>('/ai/settings/enable', {
        method: 'POST',
        body: JSON.stringify({ clinicId }),
      }),

    disableAssistant: (clinicId?: string) =>
      ApiClient.request<AiAssistantSettings>('/ai/settings/disable', {
        method: 'POST',
        body: JSON.stringify({ clinicId }),
      }),

    listFaqs: (params?: {
      clinicId?: string;
      category?: string;
      search?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.clinicId) query.set('clinicId', params.clinicId);
      if (params?.category) query.set('category', params.category);
      if (params?.search) query.set('search', params.search);
      if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<ClinicFaq>>(`/ai/faqs?${query.toString()}`);
    },

    getFaq: (id: string) =>
      ApiClient.request<ClinicFaq>(`/ai/faqs/${id}`),

    createFaq: (data: CreateClinicFaqInput) =>
      ApiClient.request<ClinicFaq>('/ai/faqs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateFaq: (id: string, data: UpdateClinicFaqInput) =>
      ApiClient.request<ClinicFaq>(`/ai/faqs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteFaq: (id: string) =>
      ApiClient.request<{ success: boolean; message: string }>(`/ai/faqs/${id}`, {
        method: 'DELETE',
      }),

    listInteractions: (params?: {
      clinicId?: string;
      conversationId?: string;
      outcome?: string;
      detectedIntent?: string;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.clinicId) query.set('clinicId', params.clinicId);
      if (params?.conversationId) query.set('conversationId', params.conversationId);
      if (params?.outcome) query.set('outcome', params.outcome);
      if (params?.detectedIntent) query.set('detectedIntent', params.detectedIntent);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<AiInteractionLog>>(`/ai/interactions?${query.toString()}`);
    },

    listToolExecutions: (params?: {
      clinicId?: string;
      conversationId?: string;
      toolName?: string;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.clinicId) query.set('clinicId', params.clinicId);
      if (params?.conversationId) query.set('conversationId', params.conversationId);
      if (params?.toolName) query.set('toolName', params.toolName);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<AiToolExecutionLog>>(`/ai/tool-executions?${query.toString()}`);
    },

    getUsageStats: (clinicId?: string) => {
      const url = clinicId ? `/ai/usage?clinicId=${clinicId}` : '/ai/usage';
      return ApiClient.request<AiUsageStats>(url);
    },

    getHealth: () =>
      ApiClient.request<AiAssistantHealth>('/ai/health'),

    getConversationState: (conversationId: string) =>
      ApiClient.request<AiConversationState>(`/ai/conversations/${conversationId}/state`),

    resetConversationState: (conversationId: string) =>
      ApiClient.request<AiConversationState>(`/ai/conversations/${conversationId}/reset`, {
        method: 'POST',
      }),

    testConversationInteraction: (conversationId: string, message: string, clinicId?: string) =>
      ApiClient.request<{ response: string; intent: string; outcome: string }>(
        `/ai/conversations/${conversationId}/test`,
        {
          method: 'POST',
          body: JSON.stringify({ message, clinicId }),
        },
      ),
  };

  // Phase 8 Notification Orchestration & Workflow Engine
  static notifications = {
    list: (params?: Partial<QueryNotificationJobsDto>) => {
      const query = new URLSearchParams();
      if (params?.clinicId) query.set('clinicId', params.clinicId);
      if (params?.channel) query.set('channel', params.channel);
      if (params?.eventType) query.set('eventType', params.eventType);
      if (params?.status) query.set('status', params.status);
      if (params?.recipientId) query.set('recipientId', params.recipientId);
      if (params?.relatedEntityType) query.set('relatedEntityType', params.relatedEntityType);
      if (params?.relatedEntityId) query.set('relatedEntityId', params.relatedEntityId);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<NotificationJob>>(`/notifications?${query.toString()}`);
    },

    getById: (id: string) =>
      ApiClient.request<NotificationJob>(`/notifications/${id}`),

    getAnalytics: (clinicId?: string) => {
      const url = clinicId ? `/notifications/analytics?clinicId=${clinicId}` : '/notifications/analytics';
      return ApiClient.request<NotificationAnalytics>(url);
    },

    retry: (id: string, force: boolean = false) =>
      ApiClient.request<NotificationJob>(`/notifications/${id}/retry`, {
        method: 'POST',
        body: JSON.stringify({ force }),
      }),

    cancel: (id: string, reason?: string) =>
      ApiClient.request<NotificationJob>(`/notifications/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  };

  static notificationRules = {
    list: (clinicId?: string) => {
      const url = clinicId ? `/notification-rules?clinicId=${clinicId}` : '/notification-rules';
      return ApiClient.request<NotificationRule[]>(url);
    },

    getById: (id: string) =>
      ApiClient.request<NotificationRule>(`/notification-rules/${id}`),

    create: (data: CreateNotificationRuleDto) =>
      ApiClient.request<NotificationRule>('/notification-rules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateNotificationRuleDto) =>
      ApiClient.request<NotificationRule>(`/notification-rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      ApiClient.request<void>(`/notification-rules/${id}`, {
        method: 'DELETE',
      }),
  };

  static notificationTemplates = {
    list: (clinicId?: string) => {
      const url = clinicId ? `/notification-templates?clinicId=${clinicId}` : '/notification-templates';
      return ApiClient.request<NotificationTemplate[]>(url);
    },

    getById: (id: string) =>
      ApiClient.request<NotificationTemplate>(`/notification-templates/${id}`),

    create: (data: CreateNotificationTemplateDto) =>
      ApiClient.request<NotificationTemplate>('/notification-templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateNotificationTemplateDto) =>
      ApiClient.request<NotificationTemplate>(`/notification-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      ApiClient.request<void>(`/notification-templates/${id}`, {
        method: 'DELETE',
      }),

    preview: (data: PreviewNotificationTemplateDto) =>
      ApiClient.request<{ body: string; subject?: string }>('/notification-templates/preview', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  static notificationPreferences = {
    get: (params?: { patientId?: string; userId?: string }) => {
      const query = new URLSearchParams();
      if (params?.patientId) query.set('patientId', params.patientId);
      if (params?.userId) query.set('userId', params.userId);
      return ApiClient.request<NotificationPreference[]>(`/notification-preferences?${query.toString()}`);
    },

    save: (data: SaveNotificationPreferenceDto) =>
      ApiClient.request<NotificationPreference>('/notification-preferences', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    optOut: (data: OptOutNotificationPreferenceDto) =>
      ApiClient.request<NotificationPreference>('/notification-preferences/opt-out', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  static inApp = {
    list: (params?: { page?: number; limit?: number; unreadOnly?: boolean; category?: string }) => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.unreadOnly !== undefined) query.set('unreadOnly', String(params.unreadOnly));
      if (params?.category) query.set('category', params.category);
      return ApiClient.request<PaginatedResult<InAppNotification>>(`/in-app-notifications?${query.toString()}`);
    },

    getUnreadCount: () =>
      ApiClient.request<{ unreadCount: number }>('/in-app-notifications/unread-count'),

    markAsRead: (id: string) =>
      ApiClient.request<void>(`/in-app-notifications/${id}/read`, {
        method: 'POST',
      }),

    markAllAsRead: () =>
      ApiClient.request<{ updatedCount: number }>('/in-app-notifications/read-all', {
        method: 'POST',
      }),
  };

  // Phase 9: Voice Assistant & Telephony Endpoints
  static voice = {
    getCalls: (params?: QueryVoiceCallsInput) => {
      const query = new URLSearchParams();
      if (params?.clinicId) query.set('clinicId', params.clinicId);
      if (params?.status) query.set('status', params.status);
      if (params?.direction) query.set('direction', params.direction);
      if (params?.language) query.set('language', params.language);
      if (params?.callerPhone) query.set('callerPhone', params.callerPhone);
      if (params?.handoverStatus) query.set('handoverStatus', params.handoverStatus);
      if (params?.fromDate) query.set('fromDate', params.fromDate);
      if (params?.toDate) query.set('toDate', params.toDate);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<VoiceCallSession>>(`/voice/calls?${query.toString()}`);
    },

    getCall: (id: string) => ApiClient.request<VoiceCallSession>(`/voice/calls/${id}`),

    getTranscript: (id: string) =>
      ApiClient.request<{
        callSessionId: string;
        providerCallId: string;
        callerPhone: string;
        selectedLanguage: string;
        messages: VoiceConversationMessage[];
      }>(`/voice/calls/${id}/transcript`),

    getAnalytics: (clinicId?: string) => {
      const query = new URLSearchParams();
      if (clinicId) query.set('clinicId', clinicId);
      return ApiClient.request<VoiceAnalytics>(`/voice/analytics?${query.toString()}`);
    },

    getSettings: (clinicId?: string) => {
      const query = new URLSearchParams();
      if (clinicId) query.set('clinicId', clinicId);
      return ApiClient.request<VoiceProviderSettings>(`/voice/settings?${query.toString()}`);
    },

    updateSettings: (clinicId: string, data: UpdateVoiceSettingsInput) => {
      const query = new URLSearchParams();
      query.set('clinicId', clinicId);
      return ApiClient.request<VoiceProviderSettings>(`/voice/settings?${query.toString()}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    getIntegration: (clinicId?: string) => {
      const query = new URLSearchParams();
      if (clinicId) query.set('clinicId', clinicId);
      return ApiClient.request<VoiceIntegration | null>(`/voice/integrations?${query.toString()}`);
    },

    getProviderStatus: (clinicId?: string) => {
      const query = new URLSearchParams();
      if (clinicId) query.set('clinicId', clinicId);
      return ApiClient.request<{
        status: string;
        provider: string;
        phoneNumber: string | null;
        isVerified: boolean;
        liveCallTestingBlocked: boolean;
        message: string;
        regulatoryNotice: string;
      }>(`/voice/integrations/status?${query.toString()}`);
    },

    createIntegration: (data: CreateVoiceIntegrationInput) =>
      ApiClient.request<VoiceIntegration>('/voice/integrations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateIntegration: (id: string, data: UpdateVoiceIntegrationInput) =>
      ApiClient.request<VoiceIntegration>(`/voice/integrations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    simulateTurn: (data: SimulateVoiceCallInput) =>
      ApiClient.request<{
        sessionId: string;
        message: string;
        language: string;
        intent: string;
        actionTaken: string;
        transcript: VoiceConversationMessage[];
      }>('/voice/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    triggerHandover: (id: string, data: AssignVoiceHandoverInput) =>
      ApiClient.request<any>(`/voice/calls/${id}/handover`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // Phase 10: Diagnostic Laboratory Management & Secure Report Delivery
  static laboratory = {
    // Categories
    listCategories: (clinicId?: string) => {
      const q = new URLSearchParams();
      if (clinicId) q.set('clinicId', clinicId);
      return ApiClient.request<LaboratoryTestCategory[]>(`/laboratory/categories?${q.toString()}`);
    },
    createCategory: (data: CreateLabCategoryInput) =>
      ApiClient.request<LaboratoryTestCategory>('/laboratory/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateCategory: (id: string, data: UpdateLabCategoryInput) =>
      ApiClient.request<LaboratoryTestCategory>(`/laboratory/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // Tests Catalog
    listTests: (params?: Partial<QueryLabTestsInput>) => {
      const q = new URLSearchParams();
      if (params?.categoryId) q.set('categoryId', params.categoryId);
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.sampleType) q.set('sampleType', params.sampleType);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<LaboratoryTest>>(`/laboratory/tests?${q.toString()}`);
    },
    getTest: (id: string) => ApiClient.request<LaboratoryTest>(`/laboratory/tests/${id}`),
    createTest: (data: CreateLabTestInput) =>
      ApiClient.request<LaboratoryTest>('/laboratory/tests', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateTest: (id: string, data: UpdateLabTestInput) =>
      ApiClient.request<LaboratoryTest>(`/laboratory/tests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // Packages
    listPackages: (params?: { clinicId?: string; search?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<LaboratoryPackage>>(`/laboratory/packages?${q.toString()}`);
    },
    getPackage: (id: string) => ApiClient.request<LaboratoryPackage>(`/laboratory/packages/${id}`),
    createPackage: (data: CreateLabPackageInput) =>
      ApiClient.request<LaboratoryPackage>('/laboratory/packages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updatePackage: (id: string, data: UpdateLabPackageInput) =>
      ApiClient.request<LaboratoryPackage>(`/laboratory/packages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // Orders
    listOrders: (params?: Partial<QueryLabOrdersInput>) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.patientId) q.set('patientId', params.patientId);
      if (params?.orderStatus) q.set('orderStatus', params.orderStatus);
      if (params?.date) q.set('date', params.date);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<LaboratoryOrder>>(`/laboratory/orders?${q.toString()}`);
    },
    getOrder: (id: string) => ApiClient.request<LaboratoryOrder>(`/laboratory/orders/${id}`),
    createOrder: (data: CreateLabOrderInput) =>
      ApiClient.request<LaboratoryOrder>('/laboratory/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateOrder: (id: string, data: UpdateLabOrderInput) =>
      ApiClient.request<LaboratoryOrder>(`/laboratory/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    cancelOrder: (id: string, data: CancelLabOrderInput) =>
      ApiClient.request<LaboratoryOrder>(`/laboratory/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Samples
    listSamples: (params?: Partial<QueryLabSamplesInput>) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.orderId) q.set('orderId', params.orderId);
      if (params?.sampleStatus) q.set('sampleStatus', params.sampleStatus);
      if (params?.sampleType) q.set('sampleType', params.sampleType);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<LaboratorySample>>(`/laboratory/samples?${q.toString()}`);
    },
    getSample: (id: string) => ApiClient.request<LaboratorySample>(`/laboratory/samples/${id}`),
    createSample: (data: CreateLabSampleInput) =>
      ApiClient.request<LaboratorySample>('/laboratory/samples', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateSampleStatus: (id: string, data: UpdateLabSampleStatusInput) =>
      ApiClient.request<LaboratorySample>(`/laboratory/samples/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // Results & Reviews
    getOrderResults: (orderId: string) =>
      ApiClient.request<Array<{
        orderItemId: string;
        testName: string;
        testCode: string;
        price: number;
        result: LaboratoryResult | null;
      }>>(`/laboratory/orders/${orderId}/results`),
    enterResult: (orderItemId: string, data: EnterLabResultInput) =>
      ApiClient.request<LaboratoryResult>(`/laboratory/order-items/${orderItemId}/result`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    amendResult: (resultId: string, data: AmendLabResultInput) =>
      ApiClient.request<LaboratoryResult>(`/laboratory/results/${resultId}/amend`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    reviewResult: (resultId: string, data: ReviewLabResultInput) =>
      ApiClient.request<any>(`/laboratory/results/${resultId}/review`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Reports
    listReports: (params?: Partial<QueryLabReportsInput>) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.orderId) q.set('orderId', params.orderId);
      if (params?.reportStatus) q.set('reportStatus', params.reportStatus);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<LaboratoryReport>>(`/laboratory/reports?${q.toString()}`);
    },
    getReport: (id: string) => ApiClient.request<LaboratoryReport>(`/laboratory/reports/${id}`),
    generateReport: (orderId: string) =>
      ApiClient.request<LaboratoryReport>(`/laboratory/reports/generate/${orderId}`, {
        method: 'POST',
      }),
    approveReport: (reportId: string, data: ApproveLabReportInput) =>
      ApiClient.request<LaboratoryReport>(`/laboratory/reports/${reportId}/approve`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    releaseReport: (reportId: string, data: ReleaseLabReportInput) =>
      ApiClient.request<LaboratoryReport>(`/laboratory/reports/${reportId}/release`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createAccessToken: (reportId: string, expiresInHours?: number) =>
      ApiClient.request<{ token: string; prefix: string; expiresAt: string; accessUrl: string }>(
        `/laboratory/reports/${reportId}/access-token`,
        {
          method: 'POST',
          body: JSON.stringify({ expiresInHours }),
        },
      ),
    revokeAccess: (reportId: string, data: RevokeReportAccessInput) =>
      ApiClient.request<{ message: string }>(`/laboratory/reports/${reportId}/revoke-access`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    resendNotification: (reportId: string) =>
      ApiClient.request<{ success: boolean; message: string }>(`/laboratory/reports/${reportId}/resend`, {
        method: 'POST',
      }),
    getDownloadUrl: (reportId: string) => `${API_BASE_URL}/laboratory/reports/${reportId}/download`,

    // Analytics
    getAnalytics: (params?: QueryLabAnalyticsInput) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      return ApiClient.request<LaboratoryAnalytics>(`/laboratory/analytics?${q.toString()}`);
    },

    // Patient Portal
    getMyOrders: () => ApiClient.request<LaboratoryOrder[]>('/patient/laboratory/orders'),
    getMyReports: () => ApiClient.request<LaboratoryReport[]>('/patient/laboratory/reports'),

    // Public Delivery Verification
    verifyPublicReport: (token: string, data: VerifyReportAccessInput) =>
      ApiClient.request<{
        verified: boolean;
        reportReference: string;
        fileName: string;
        fileSizeBytes: number;
      }>(`/public/reports/access/${token}/verify`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getPublicStreamUrl: (token: string, params: { phone?: string; dobYear?: number }) => {
      const q = new URLSearchParams();
      if (params.phone) q.set('phone', params.phone);
      if (params.dobYear) q.set('dobYear', String(params.dobYear));
      return `${API_BASE_URL}/public/reports/access/${token}/stream?${q.toString()}`;
    },
  };

  // Phase 11: Financial Management, Billing, Invoicing & Payments
  static finance = {
    // Invoices
    listInvoices: (params?: Partial<QueryInvoicesInput>) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.patientId) q.set('patientId', params.patientId);
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<Invoice>>(`/finance/invoices?${q.toString()}`);
    },
    getInvoice: (id: string) => ApiClient.request<Invoice>(`/finance/invoices/${id}`),
    createInvoice: (data: CreateInvoiceInput) =>
      ApiClient.request<Invoice>('/finance/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    issueInvoice: (id: string) =>
      ApiClient.request<Invoice>(`/finance/invoices/${id}/issue`, {
        method: 'POST',
      }),
    cancelInvoice: (id: string, data: CancelInvoiceInput) =>
      ApiClient.request<Invoice>(`/finance/invoices/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getPrintableA4Url: (id: string) => `${API_BASE_URL}/finance/invoices/${id}/print/a4`,
    getPdfDownloadUrl: (id: string) => `${API_BASE_URL}/finance/invoices/${id}/pdf`,

    // Payments
    listPayments: (params?: Partial<QueryPaymentsInput>) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.invoiceId) q.set('invoiceId', params.invoiceId);
      if (params?.patientId) q.set('patientId', params.patientId);
      if (params?.method) q.set('method', params.method);
      if (params?.status) q.set('status', params.status);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<Payment>>(`/finance/payments?${q.toString()}`);
    },
    getPayment: (id: string) => ApiClient.request<Payment>(`/finance/payments/${id}`),
    collectPayment: (data: CollectPaymentInput) =>
      ApiClient.request<Payment>('/finance/payments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getReceiptThermalUrl: (id: string) => `${API_BASE_URL}/finance/payments/${id}/receipt`,
    getPaymentMethodsStatus: () =>
      ApiClient.request<{
        cash: { enabled: boolean; mode: string };
        bankTransfer: { enabled: boolean; details: any };
        raast: { isConfigured: boolean; participantCode?: string; merchantIban?: string };
        card: { isConfigured: boolean; provider: string };
      }>('/finance/payments/methods/status'),

    // Refunds
    listRefunds: (params?: Partial<QueryRefundsInput>) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.invoiceId) q.set('invoiceId', params.invoiceId);
      if (params?.status) q.set('status', params.status);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<Refund>>(`/finance/refunds?${q.toString()}`);
    },
    requestRefund: (data: RequestRefundInput) =>
      ApiClient.request<Refund>('/finance/refunds', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    reviewRefund: (id: string, data: ReviewRefundInput) =>
      ApiClient.request<Refund>(`/finance/refunds/${id}/review`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Expenses
    listExpenseCategories: () => ApiClient.request<ExpenseCategory[]>('/finance/expense-categories'),
    createExpenseCategory: (data: CreateExpenseCategoryInput) =>
      ApiClient.request<ExpenseCategory>('/finance/expense-categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    listExpenses: (params?: Partial<QueryExpensesInput>) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.categoryId) q.set('categoryId', params.categoryId);
      if (params?.status) q.set('status', params.status);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<Expense>>(`/finance/expenses?${q.toString()}`);
    },
    createExpense: (data: CreateExpenseInput) =>
      ApiClient.request<Expense>('/finance/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateExpense: (id: string, data: UpdateExpenseInput) =>
      ApiClient.request<Expense>(`/finance/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // Cash Register Sessions
    getActiveCashSession: (clinicId: string) =>
      ApiClient.request<CashRegisterSession | null>(`/finance/cash-register/active?clinicId=${clinicId}`),
    openCashSession: (data: OpenCashRegisterInput) =>
      ApiClient.request<CashRegisterSession>('/finance/cash-register/open', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    closeCashSession: (id: string, data: CloseCashRegisterInput) =>
      ApiClient.request<CashRegisterSession>(`/finance/cash-register/${id}/close`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    reopenCashSession: (id: string, data: ReopenCashRegisterInput) =>
      ApiClient.request<CashRegisterSession>(`/finance/cash-register/${id}/reopen`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    listCashSessions: (params?: Partial<QueryCashSessionsInput>) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.status) q.set('status', params.status);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<CashRegisterSession>>(`/finance/cash-register/sessions?${q.toString()}`);
    },

    // Analytics & Reconciliation
    getAnalytics: (params?: QueryFinancialAnalyticsInput) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      return ApiClient.request<FinancialAnalytics>(`/finance/analytics?${q.toString()}`);
    },
    getReconciliation: (params?: QueryFinancialAnalyticsInput) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      return ApiClient.request<any>(`/finance/reconciliation?${q.toString()}`);
    },
    reconcileManually: (data: ManualReconciliationInput) =>
      ApiClient.request<{ success: boolean; reference: string; status: string }>(
        '/finance/reconciliation/manual',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),

    // Patient Billing Endpoints
    getPatientInvoices: () => ApiClient.request<Invoice[]>('/patient/finance/invoices'),
    getPatientInvoice: (id: string) => ApiClient.request<Invoice>(`/patient/finance/invoices/${id}`),
    getPatientPayments: () => ApiClient.request<Payment[]>('/patient/finance/payments'),
    getPatientPdfUrl: (id: string) => `${API_BASE_URL}/patient/finance/invoices/${id}/pdf`,
    getPatientReceiptUrl: (paymentId: string) => `${API_BASE_URL}/patient/finance/receipts/${paymentId}`,
  };

  static readonly encounter = {
    // Encounters
    create: (data: CreateEncounterInput) =>
      ApiClient.request<ClinicalEncounter>('/encounters', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: (params?: Partial<QueryEncountersInput>) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.doctorId) q.set('doctorId', params.doctorId);
      if (params?.patientId) q.set('patientId', params.patientId);
      if (params?.status) q.set('status', params.status);
      if (params?.date) q.set('date', params.date);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<ClinicalEncounter>>(`/encounters?${q.toString()}`);
    },
    get: (id: string) => ApiClient.request<ClinicalEncounter>(`/encounters/${id}`),
    updateStatus: (id: string, data: UpdateEncounterStatusInput) =>
      ApiClient.request<ClinicalEncounter>(`/encounters/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    reassign: (id: string, data: ReassignEncounterInput) =>
      ApiClient.request<ClinicalEncounter>(`/encounters/${id}/reassign`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (id: string, data: CancelEncounterInput) =>
      ApiClient.request<ClinicalEncounter>(`/encounters/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    finalize: (id: string, data: FinalizeEncounterInput) =>
      ApiClient.request<ClinicalEncounter>(`/encounters/${id}/finalize`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    amend: (id: string, data: AmendEncounterInput) =>
      ApiClient.request<any>(`/encounters/${id}/amend`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Clinical Notes
    saveNote: (encounterId: string, data: SaveClinicalNoteInput) =>
      ApiClient.request<ClinicalNote>(`/encounters/${encounterId}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getNote: (encounterId: string) =>
      ApiClient.request<ClinicalNote>(`/encounters/${encounterId}/notes`),

    // Observations / Vitals
    recordObservation: (data: RecordObservationInput) =>
      ApiClient.request<PatientObservation>('/encounters/observations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getEncounterObservations: (encounterId: string) =>
      ApiClient.request<PatientObservation[]>(`/encounters/${encounterId}/observations`),
    getPatientObservations: (patientId: string) =>
      ApiClient.request<PatientObservation[]>(`/patients/${patientId}/observations`),

    // Diagnoses
    createDiagnosis: (encounterId: string, data: Omit<CreateDiagnosisInput, 'encounterId'>) =>
      ApiClient.request<EncounterDiagnosis>(`/encounters/${encounterId}/diagnoses`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getDiagnoses: (encounterId: string) =>
      ApiClient.request<EncounterDiagnosis[]>(`/encounters/${encounterId}/diagnoses`),
    updateDiagnosis: (id: string, data: UpdateDiagnosisInput) =>
      ApiClient.request<EncounterDiagnosis>(`/encounters/diagnoses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteDiagnosis: (id: string) =>
      ApiClient.request<{ success: boolean }>(`/encounters/diagnoses/${id}`, {
        method: 'DELETE',
      }),

    // Prescriptions
    createPrescription: (data: CreatePrescriptionInput) =>
      ApiClient.request<Prescription>('/prescriptions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    listPrescriptions: (params?: Partial<QueryPrescriptionsInput>) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.doctorId) q.set('doctorId', params.doctorId);
      if (params?.patientId) q.set('patientId', params.patientId);
      if (params?.encounterId) q.set('encounterId', params.encounterId);
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<Prescription>>(`/prescriptions?${q.toString()}`);
    },
    getPrescription: (id: string) =>
      ApiClient.request<Prescription>(`/prescriptions/${id}`),
    amendPrescription: (id: string, data: AmendPrescriptionInput) =>
      ApiClient.request<Prescription>(`/prescriptions/${id}/amend`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancelPrescription: (id: string, data: CancelPrescriptionInput) =>
      ApiClient.request<Prescription>(`/prescriptions/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getPrescriptionHtml: (id: string) =>
      ApiClient.request<{ html: string }>(`/prescriptions/${id}/html`),
    getPrescriptionPrintUrl: (id: string) => `${API_BASE_URL}/prescriptions/${id}/print`,

    // Follow-ups
    createFollowup: (encounterId: string, data: Omit<CreateFollowupInput, 'encounterId'>) =>
      ApiClient.request<EncounterFollowup>(`/encounters/${encounterId}/followups`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateFollowup: (id: string, data: UpdateFollowupInput) =>
      ApiClient.request<EncounterFollowup>(`/encounters/followups/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    listFollowups: (params?: Partial<QueryFollowupsInput>) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.doctorId) q.set('doctorId', params.doctorId);
      if (params?.patientId) q.set('patientId', params.patientId);
      if (params?.status) q.set('status', params.status);
      if (params?.date) q.set('date', params.date);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<EncounterFollowup>>(`/encounters/followups?${q.toString()}`);
    },

    // Patient Clinical History & Portal
    getPatientClinicalHistory: (patientId: string) =>
      ApiClient.request<PatientClinicalHistory>(`/patients/${patientId}/clinical-history`),
    getPatientMedicalHistory: (patientId: string) =>
      ApiClient.request<PatientMedicalHistory>(`/patients/${patientId}/medical-history`),
    savePatientMedicalHistory: (patientId: string, data: SaveMedicalHistoryInput) =>
      ApiClient.request<PatientMedicalHistory>(`/patients/${patientId}/medical-history`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getPatientEncounters: () =>
      ApiClient.request<any[]>('/patient/clinical/encounters'),
    getPatientPrescriptions: () =>
      ApiClient.request<PaginatedResult<Prescription>>('/patient/clinical/prescriptions'),
  };

  // Phase 13 Advanced Analytics & Reporting
  static analytics = {
    getDashboard: (params?: AnalyticsFilterInput) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.doctorId) q.set('doctorId', params.doctorId);
      if (params?.period) q.set('period', params.period);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      return ApiClient.request<ExecutiveDashboardMetrics>(`/analytics/dashboard?${q.toString()}`);
    },
    getAppointments: (params?: AnalyticsFilterInput) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.doctorId) q.set('doctorId', params.doctorId);
      if (params?.period) q.set('period', params.period);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      return ApiClient.request<AppointmentAnalytics>(`/analytics/appointments?${q.toString()}`);
    },
    getQueue: (params?: AnalyticsFilterInput) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.doctorId) q.set('doctorId', params.doctorId);
      if (params?.period) q.set('period', params.period);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      return ApiClient.request<QueueAnalytics>(`/analytics/queue?${q.toString()}`);
    },
    getPatients: (params?: AnalyticsFilterInput) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.period) q.set('period', params.period);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      return ApiClient.request<PatientAnalytics>(`/analytics/patients?${q.toString()}`);
    },
    getStaff: (params?: AnalyticsFilterInput) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.period) q.set('period', params.period);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      return ApiClient.request<DoctorStaffAnalytics>(`/analytics/staff?${q.toString()}`);
    },
    getLaboratory: (params?: AnalyticsFilterInput) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.period) q.set('period', params.period);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      return ApiClient.request<LaboratoryAnalyticsData>(`/analytics/laboratory?${q.toString()}`);
    },
    getFinance: (params?: AnalyticsFilterInput) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.period) q.set('period', params.period);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      return ApiClient.request<FinancialAnalyticsSummary>(`/analytics/finance?${q.toString()}`);
    },
    getCommunications: (params?: AnalyticsFilterInput) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.period) q.set('period', params.period);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      return ApiClient.request<CommunicationAnalytics>(`/analytics/communications?${q.toString()}`);
    },
    getAIUsage: (params?: AnalyticsFilterInput) => {
      const q = new URLSearchParams();
      if (params?.clinicId) q.set('clinicId', params.clinicId);
      if (params?.period) q.set('period', params.period);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      return ApiClient.request<AIUsageAnalytics>(`/analytics/ai-usage?${q.toString()}`);
    },
  };

  static reports = {
    query: (data: RunReportQueryInput) =>
      ApiClient.request<ReportQueryResult>('/analytics/reports/query', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    export: (data: ExportReportInput) =>
      ApiClient.request<Blob>('/analytics/reports/export', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    listConfigurations: (clinicId?: string) =>
      ApiClient.request<SavedReportConfiguration[]>(
        `/analytics/reports/configurations${clinicId ? `?clinicId=${clinicId}` : ''}`,
      ),
    createConfiguration: (data: SaveReportConfigurationInput) =>
      ApiClient.request<SavedReportConfiguration>('/analytics/reports/configurations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getConfiguration: (id: string) =>
      ApiClient.request<SavedReportConfiguration>(`/analytics/reports/configurations/${id}`),
    updateConfiguration: (id: string, data: UpdateReportConfigurationInput) =>
      ApiClient.request<SavedReportConfiguration>(`/analytics/reports/configurations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteConfiguration: (id: string) =>
      ApiClient.request<{ success: boolean }>(`/analytics/reports/configurations/${id}`, {
        method: 'DELETE',
      }),
    listScheduledReports: (clinicId?: string) =>
      ApiClient.request<ScheduledReport[]>(
        `/analytics/reports/scheduled${clinicId ? `?clinicId=${clinicId}` : ''}`,
      ),
    createScheduledReport: (data: CreateScheduledReportInput) =>
      ApiClient.request<ScheduledReport>('/analytics/reports/scheduled', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getScheduledReport: (id: string) =>
      ApiClient.request<ScheduledReport>(`/analytics/reports/scheduled/${id}`),
    updateScheduledReport: (id: string, data: UpdateScheduledReportInput) =>
      ApiClient.request<ScheduledReport>(`/analytics/reports/scheduled/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteScheduledReport: (id: string) =>
      ApiClient.request<{ success: boolean }>(`/analytics/reports/scheduled/${id}`, {
        method: 'DELETE',
      }),
    runScheduledReport: (id: string) =>
      ApiClient.request<any>(`/analytics/reports/scheduled/${id}/run`, {
        method: 'POST',
      }),
  };

  // ==========================================
  // Phase 14: Onboarding API
  // ==========================================
  public static onboarding = {
    register: (data: ClinicRegistrationInput) =>
      ApiClient.request<ClinicRegistrationResponse>('/onboarding/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getStatus: () => ApiClient.request<TenantOnboardingStatus>('/onboarding/status'),
    complete: (data: CompleteOnboardingInput) =>
      ApiClient.request<{ success: boolean; message: string }>('/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // ==========================================
  // Phase 14: Tenant Subscription API
  // ==========================================
  public static subscription = {
    getCurrent: () => ApiClient.request<TenantSubscription | null>('/subscription'),
    getPlans: () => ApiClient.request<SubscriptionPlan[]>('/subscription/plans'),
    getUsage: () => ApiClient.request<TenantUsageSummary>('/subscription/usage'),
    upgrade: (data: UpgradePlanInput) =>
      ApiClient.request<{ subscription: TenantSubscription; invoice: SubscriptionInvoice }>(
        '/subscription/upgrade',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),
    downgrade: (data: DowngradePlanInput) =>
      ApiClient.request<TenantSubscription>('/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (data: CancelSubscriptionInput) =>
      ApiClient.request<TenantSubscription>('/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    reactivate: () =>
      ApiClient.request<TenantSubscription>('/subscription/reactivate', {
        method: 'POST',
      }),
    getInvoices: (page = 1, limit = 20) =>
      ApiClient.request<PaginatedResult<SubscriptionInvoice>>(
        `/subscription/invoices?page=${page}&limit=${limit}`,
      ),
    getInvoice: (id: string) => ApiClient.request<SubscriptionInvoice>(`/subscription/invoices/${id}`),
    submitManualPayment: (data: SubmitPaymentProofInput) =>
      ApiClient.request<SubscriptionPayment>('/subscription/payments/manual', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    initiateCardPayment: (invoiceId: string, redirectUrl?: string) =>
      ApiClient.request<any>('/subscription/payments/card/initiate', {
        method: 'POST',
        body: JSON.stringify({ invoiceId, redirectUrl }),
      }),
  };

  // ==========================================
  // Phase 14: Super-Admin Platform API
  // ==========================================
  public static platform = {
    getOverview: () => ApiClient.request<PlatformOverviewMetrics>('/platform/overview'),
    getTenants: (params?: { search?: string; status?: string; planCode?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.status) q.append('status', params.status);
      if (params?.planCode) q.append('planCode', params.planCode);
      if (params?.page) q.append('page', String(params.page));
      if (params?.limit) q.append('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<any>>(`/platform/tenants?${q.toString()}`);
    },
    getTenant: (id: string) => ApiClient.request<any>(`/platform/tenants/${id}`),
    handleTenantAction: (id: string, data: TenantStatusActionInput) =>
      ApiClient.request<{ success: boolean; message: string }>(`/platform/tenants/${id}/action`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    grantOverride: (id: string, data: GrantEntitlementOverrideInput) =>
      ApiClient.request<TenantEntitlementOverride>(`/platform/tenants/${id}/overrides`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    grantCredit: (id: string, data: GrantPromotionalCreditInput) =>
      ApiClient.request<PromotionalCredit>(`/platform/tenants/${id}/credits`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getPlans: () => ApiClient.request<SubscriptionPlan[]>('/platform/plans'),
    createPlan: (data: CreateSubscriptionPlanInput) =>
      ApiClient.request<SubscriptionPlan>('/platform/plans', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updatePlan: (id: string, data: UpdateSubscriptionPlanInput) =>
      ApiClient.request<SubscriptionPlan>(`/platform/plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deletePlan: (id: string) =>
      ApiClient.request<{ success: boolean }>(`/platform/plans/${id}`, {
        method: 'DELETE',
      }),
    getInvoices: (page = 1, limit = 20) =>
      ApiClient.request<PaginatedResult<SubscriptionInvoice>>(
        `/platform/invoices?page=${page}&limit=${limit}`,
      ),
    getPayments: (params?: { status?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.page) q.append('page', String(params.page));
      if (params?.limit) q.append('limit', String(params.limit));
      return ApiClient.request<PaginatedResult<SubscriptionPayment>>(`/platform/payments?${q.toString()}`);
    },
    verifyPayment: (id: string, notes?: string) =>
      ApiClient.request<any>(`/platform/payments/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),
    rejectPayment: (id: string, rejectionReason: string) =>
      ApiClient.request<any>(`/platform/payments/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason }),
      }),
    getAuditLogs: (page = 1, limit = 20) =>
      ApiClient.request<PaginatedResult<PlatformAdminAuditLog>>(
        `/platform/audit-logs?page=${page}&limit=${limit}`,
      ),
  };
}
