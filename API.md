# MatabAI API Specification & REST Contracts

Founder: **Muhammad Talha**  
Project: **MatabAI (ShifaDesk)**  
Status: **Phase 2 Complete — Real Database & Auth Endpoints Active**

---

## 1. Base URL & Protocol

All API routes follow strict URI path versioning:

```text
https://api.matabai.com/api/v1
```

- **Global Prefix**: `/api/v1`
- **Interactive Documentation**: `/api/docs` (OpenAPI Swagger)
- **Standard Protocol**: JSON over HTTPS / REST

---

## 2. Authentication & Headers

Requests to protected endpoints must include the standard HTTP Authorization header:

```http
Authorization: Bearer <SUPABASE_JWT_OR_DEV_TOKEN>
x-organization-id: <ORGANIZATION_UUID> (optional, sets active tenant scope)
Content-Type: application/json
```

### Supported Token Formats
1. **Supabase Auth JWT**: Verified cryptographically via Supabase JWT Secret / JWKS.
2. **Development Session Token**: `dev-token-<role>-<email>` (e.g. `dev-token-clinic_admin-admin@alshifa.local`), permitted in non-production environments for automated testing and UI pairing.

---

## 3. Implemented Phase 2 Endpoints

| Category | Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/api/v1/health` | Public | System status, database latency & uptime |
| **Auth** | `GET` | `/api/v1/auth/me` | Authenticated | Retrieve authenticated user profile & tenant memberships |
| **Auth** | `POST` | `/api/v1/auth/validate-session` | Authenticated | Validate current JWT session token validity |
| **Auth** | `POST` | `/api/v1/auth/logout` | Authenticated | Terminate session & log audit trail |
| **Organizations** | `GET` | `/api/v1/organizations` | All Authenticated | List organizations accessible by current user |
| **Organizations** | `POST` | `/api/v1/organizations` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Register new organization / practice network |
| **Organizations** | `GET` | `/api/v1/organizations/:id` | Member or `SUPER_ADMIN` | Get organization details (tenant-isolated) |
| **Organizations** | `PATCH` | `/api/v1/organizations/:id` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Update organization details |
| **Clinics** | `GET` | `/api/v1/clinics` | Member or `SUPER_ADMIN` | List clinics (filter by `organizationId`) |
| **Clinics** | `POST` | `/api/v1/clinics` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Create new clinic facility / branch |
| **Clinics** | `GET` | `/api/v1/clinics/:id` | Member or `SUPER_ADMIN` | Get clinic facility details |
| **Clinics** | `PATCH` | `/api/v1/clinics/:id` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Update clinic information |
| **Users** | `GET` | `/api/v1/users/me` | Authenticated | Get currently signed-in user profile |
| **Users** | `PATCH` | `/api/v1/users/me` | Authenticated | Update user name, phone, or avatar |
| **Memberships** | `GET` | `/api/v1/memberships` | `SUPER_ADMIN`, `CLINIC_ADMIN` | List organization and clinic memberships |
| **Memberships** | `POST` | `/api/v1/memberships` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Invite/assign staff member to organization |
| **Memberships** | `PATCH` | `/api/v1/memberships/:id` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Update member role or status |
| **Memberships** | `DELETE` | `/api/v1/memberships/:id` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Revoke staff membership |
| **Audit Logs** | `GET` | `/api/v1/audit-logs` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Query immutable audit log events |

---

## 4. Role-Based Access Control (RBAC) Matrix

| Permission / Action | SUPER_ADMIN | CLINIC_ADMIN | DOCTOR | RECEPTIONIST | LAB_STAFF |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Manage Organizations | ✅ | ⚠️ Own Tenant | ❌ | ❌ | ❌ |
| Create / Edit Clinics | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Staff & Memberships | ✅ | ✅ | ❌ | ❌ | ❌ |
| View System Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Appointments & Queue | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Patient Records | ✅ | ✅ | ✅ | ✅ | ❌ |
| Laboratory Test & Reports | ✅ | ✅ | ✅ | ❌ | ✅ |
| Change Own Profile | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 5. Standard Response Envelope

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2026-11-09T12:00:00.000Z"
}
```

## 6. Standard Error Response

```json
{
  "success": false,
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Cross-tenant access forbidden. You are not a member of this organization.",
  "errorCode": "FORBIDDEN",
  "timestamp": "2026-11-09T12:00:00.000Z",
  "path": "/api/v1/organizations/org-b-uuid"
}
```
