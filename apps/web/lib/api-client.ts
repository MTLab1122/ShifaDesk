import {
  ApiResponse,
  ApiErrorResponse,
  AuthMeResponse,
  Organization,
  Clinic,
  UserProfile,
  OrganizationMembership,
  AuditLog,
  PaginatedResult,
} from '@matabai/shared';

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
    list: (orgId?: string, page = 1, limit = 20) =>
      ApiClient.request<PaginatedResult<Clinic>>(
        `/clinics?page=${page}&limit=${limit}${orgId ? `&organizationId=${orgId}` : ''}`,
      ),
    get: (id: string) => ApiClient.request<Clinic>(`/clinics/${id}`),
    create: (data: {
      organizationId: string;
      name: string;
      slug: string;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      timezone?: string;
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
}
