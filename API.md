# MatabAI API Specification & REST Contracts

Founder: **Muhammad Talha**  
Project: **MatabAI (ShifaDesk)**  
Status: **Phase 3 Complete — Clinic, Doctor, Staff & Patient Management Active**

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

## 3. Complete Phase 3 REST Endpoints

### A. Health & Auth

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Public | System status, database latency & uptime |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve authenticated user profile & tenant memberships |
| `POST` | `/api/v1/auth/validate-session` | Authenticated | Validate current JWT session token validity |
| `POST` | `/api/v1/auth/logout` | Authenticated | Terminate session & log audit trail |

### B. Organizations & Clinics

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/organizations` | All Authenticated | List organizations accessible by current user |
| `POST` | `/api/v1/organizations` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Register new organization / practice network |
| `GET` | `/api/v1/organizations/:id` | Member or `SUPER_ADMIN` | Get organization details (tenant-isolated) |
| `PATCH` | `/api/v1/organizations/:id` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Update organization details |
| `GET` | `/api/v1/clinics` | Member or `SUPER_ADMIN` | Search & list clinics (page, limit, status, search) |
| `POST` | `/api/v1/clinics` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Create new clinic facility / branch |
| `GET` | `/api/v1/clinics/:id` | Member or `SUPER_ADMIN` | Get clinic facility details |
| `PATCH` | `/api/v1/clinics/:id` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Update clinic information |
| `PATCH` | `/api/v1/clinics/:id/status` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Toggle clinic status (`ACTIVE` <-> `INACTIVE`) |

### C. Doctors

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/doctors` | All Tenant Staff | List doctors with filtering (`clinicId`, `status`, `specialty`, `search`, pagination) |
| `POST` | `/api/v1/doctors` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Create doctor profile with clinic assignment and fees |
| `GET` | `/api/v1/doctors/:id` | All Tenant Staff | Get doctor details (Registration No. masked to `***RESTRICTED***` for non-admins) |
| `PATCH` | `/api/v1/doctors/:id` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Update doctor specialty, qualification, fee, or bio |
| `PATCH` | `/api/v1/doctors/:id/status` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Toggle doctor roster status (`ACTIVE` <-> `INACTIVE`) |

### D. Staff Members

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/staff` | All Tenant Staff | List staff members (`clinicId`, `designation`, `status`, `search`, pagination) |
| `POST` | `/api/v1/staff` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Register receptionist, laboratory staff, or clinical support |
| `GET` | `/api/v1/staff/:id` | All Tenant Staff | Get staff member profile |
| `PATCH` | `/api/v1/staff/:id` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Update staff designation, department, contact |
| `PATCH` | `/api/v1/staff/:id/status` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Toggle employment status (`ACTIVE` <-> `INACTIVE`) |

### E. Patients

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/patients` | `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST` | Search & list patients (search by name, MRN, phone; filter by clinic/status) |
| `POST` | `/api/v1/patients` | `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST` | Register outpatient (auto-generates `MRN-YYYY-XXXX`, checks duplicate) |
| `GET` | `/api/v1/patients/:id` | Authorized Staff / Patient Self | Get patient chart & demographic details (strictly tenant-isolated) |
| `PATCH` | `/api/v1/patients/:id` | `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST` | Update demographics, emergency contacts, consent |
| `PATCH` | `/api/v1/patients/:id/status` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Soft delete or toggle patient status (`ACTIVE` <-> `INACTIVE`) |

### F. Users, Memberships & Audit Logs

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | Authenticated | Get currently signed-in user profile |
| `PATCH` | `/api/v1/users/me` | Authenticated | Update user name, phone, or avatar |
| `GET` | `/api/v1/memberships` | `SUPER_ADMIN`, `CLINIC_ADMIN` | List organization and clinic memberships |
| `POST` | `/api/v1/memberships` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Invite/assign staff member to organization |
| `PATCH` | `/api/v1/memberships/:id` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Update member role or status |
| `DELETE` | `/api/v1/memberships/:id` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Revoke staff membership |
| `GET` | `/api/v1/audit-logs` | `SUPER_ADMIN`, `CLINIC_ADMIN` | Query immutable audit log events |

---

## 4. Role-Based Access Control (RBAC) Matrix

| Action / Resource | SUPER_ADMIN | CLINIC_ADMIN | DOCTOR | RECEPTIONIST | LAB_STAFF | PATIENT |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Manage Organizations | ✅ | ⚠️ Own Tenant | ❌ | ❌ | ❌ | ❌ |
| Create / Edit Clinics | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Doctors | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Unmasked Doctor License | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Staff Members | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Register Patients | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Patient Records | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ Own Record |
| Toggle Patient Status | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View System Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Change Own Profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 5. Security & Privacy Highlights

1. **Doctor Registration Number Privacy**: To safeguard medical license numbers from unauthorized internal scraping, `DoctorService` automatically masks `registrationNumber` to `'***RESTRICTED***'` whenever requested by non-administrator roles (`DOCTOR`, `RECEPTIONIST`, `LAB_STAFF`, `PATIENT`).
2. **Deterministic MRN Generation**: The patient number is auto-generated as `MRN-YYYY-XXXX` where `XXXX` is a zero-padded sequential counter based on the organization's existing patient count for the current calendar year.
3. **Duplicate Prevention**: Registration attempts with duplicate clinic ID, phone number, and full name are intercepted with `409 ConflictException`.
4. **Tenant Isolation**: Cross-tenant record lookups return `403 ForbiddenException` (or `404 Not Found`) and emit structured security audit entries.
