# MatabAI REST API Reference

Base Path: `/api/v1`

All requests must include a valid Bearer Token in the `Authorization` header:
`Authorization: Bearer <supabase_access_token>`

Tenant context is derived from the user's authenticated profile session and verified by `TenantGuard`.

---

## 1. Doctor Working Hours

### `GET /api/v1/doctors/:doctorId/working-hours`
Retrieves all configured weekly working hours for a doctor at a clinic.

- **Query Parameters:**
  - `clinicId` (required, UUID): Filter by clinic branch.
- **Roles:** `CLINIC_ADMIN`, `RECEPTIONIST`, `DOCTOR`, `SUPER_ADMIN`.
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "c138f362-e645-4df3-aa6a-6a56e6d18a14",
      "organizationId": "...",
      "clinicId": "...",
      "doctorId": "...",
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "13:00",
      "slotDurationMinutes": 20,
      "breakStartTime": "11:00",
      "breakEndTime": "11:20",
      "effectiveFrom": "2026-01-01T00:00:00.000Z",
      "effectiveUntil": null,
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
  ```

### `POST /api/v1/doctors/:doctorId/working-hours`
Configures a new working hours period for a doctor.

- **Roles:** `CLINIC_ADMIN`, `DOCTOR`, `SUPER_ADMIN`.
- **Body:**
  ```json
  {
    "clinicId": "UUID",
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "13:00",
    "slotDurationMinutes": 20,
    "breakStartTime": "11:00",
    "breakEndTime": "11:20",
    "effectiveFrom": "2026-01-01T00:00:00.000Z"
  }
  ```
- **Response `201 Created`**: Returns created working hours entity.
- **Errors:**
  - `400 Bad Request`: Validation failure (e.g. invalid time format, start >= end, break outside window).
  - `409 Conflict`: Working period overlaps an existing active schedule for the same day.

### `PATCH /api/v1/doctors/:doctorId/working-hours/:id`
Updates working hours, breaks, slot duration, or active status.

- **Roles:** `CLINIC_ADMIN`, `DOCTOR`, `SUPER_ADMIN`.
- **Response `200 OK`**: Returns updated entity.

### `DELETE /api/v1/doctors/:doctorId/working-hours/:id`
Deletes a working hours configuration record.

- **Roles:** `CLINIC_ADMIN`, `DOCTOR`, `SUPER_ADMIN`.
- **Response `200 OK`**: `{ "success": true }`.

---

## 2. Doctor Schedule Exceptions (Holidays & Custom Hours)

### `GET /api/v1/doctors/:doctorId/schedule-exceptions`
Lists all scheduled exceptions, leaves, and custom overrides.

- **Query Parameters:**
  - `clinicId` (required, UUID)
  - `fromDate` (optional, YYYY-MM-DD)
  - `toDate` (optional, YYYY-MM-DD)
- **Roles:** `CLINIC_ADMIN`, `RECEPTIONIST`, `DOCTOR`, `SUPER_ADMIN`.
- **Response `200 OK`:** Array of `DoctorScheduleException`.

### `POST /api/v1/doctors/:doctorId/schedule-exceptions`
Registers a holiday, personal leave, or modified schedule for a specific date.

- **Roles:** `CLINIC_ADMIN`, `DOCTOR`, `SUPER_ADMIN`.
- **Body:**
  ```json
  {
    "clinicId": "UUID",
    "exceptionDate": "2026-12-25",
    "exceptionType": "UNAVAILABLE",
    "reason": "Christmas Holiday"
  }
  ```
- **Response `201 Created`**: Returns created exception entity.
- **Errors:**
  - `409 Conflict`: An exception already exists for this doctor on the specified date.

### `PATCH /api/v1/doctors/:doctorId/schedule-exceptions/:id`
Modifies an existing schedule exception.

- **Roles:** `CLINIC_ADMIN`, `DOCTOR`, `SUPER_ADMIN`.
- **Response `200 OK`**: Returns updated entity.

### `DELETE /api/v1/doctors/:doctorId/schedule-exceptions/:id`
Removes an exception override.

- **Roles:** `CLINIC_ADMIN`, `DOCTOR`, `SUPER_ADMIN`.
- **Response `200 OK`**: `{ "success": true }`.

---

## 3. Slot Availability

### `GET /api/v1/availability`
Dynamically calculates available, booked, and blocked slots for a doctor on a specific date.

- **Query Parameters:**
  - `clinicId` (required, UUID)
  - `doctorId` (required, UUID)
  - `date` (required, YYYY-MM-DD)
- **Roles:** Accessible by all authenticated roles (`SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `PATIENT`).
- **Privacy Assurance:** Only returns time slot ranges and availability flags. Patient names, MRNs, notes, and medical records are NEVER exposed in this endpoint.
- **Response `200 OK`:**
  ```json
  [
    {
      "startTime": "09:00",
      "endTime": "09:20",
      "isAvailable": true
    },
    {
      "startTime": "09:20",
      "endTime": "09:40",
      "isAvailable": false,
      "reason": "BOOKED"
    },
    {
      "startTime": "11:00",
      "endTime": "11:20",
      "isAvailable": false,
      "reason": "BREAK"
    }
  ]
  ```

---

## 4. Appointments

### `GET /api/v1/appointments`
Lists appointments filtered by clinic, doctor, patient, date range, or status.

- **Query Parameters:**
  - `clinicId` (optional, UUID)
  - `doctorId` (optional, UUID)
  - `patientId` (optional, UUID)
  - `date` (optional, YYYY-MM-DD)
  - `startDate` (optional, YYYY-MM-DD)
  - `endDate` (optional, YYYY-MM-DD)
  - `status` (optional, `PENDING` | `CONFIRMED` | `CANCELLED` | `COMPLETED` | `NO_SHOW` | `IN_PROGRESS`)
  - `search` (optional, string)
  - `page` (optional, default 1)
  - `limit` (optional, default 20)
- **RBAC:**
  - `PATIENT` role is automatically restricted to appointments where `patientId` matches their own profile.
  - `LAB_STAFF` is blocked from accessing appointments.
- **Response `200 OK`:**
  ```json
  {
    "data": [
      {
        "id": "...",
        "appointmentNumber": "APT-2026-1001",
        "appointmentDate": "2026-11-15T00:00:00.000Z",
        "startTime": "10:00",
        "endTime": "10:20",
        "timezone": "Asia/Karachi",
        "status": "CONFIRMED",
        "bookingSource": "MANUAL",
        "reasonForVisit": "Follow-up checkup",
        "patient": {
          "id": "...",
          "fullName": "Ahmed Khan",
          "mrn": "MRN-2026-0001",
          "phone": "+923001234567"
        },
        "doctor": {
          "id": "...",
          "fullName": "Dr. Sarah Khan",
          "specialty": "General Medicine"
        },
        "clinic": {
          "id": "...",
          "name": "Main Healthcare Campus"
        }
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
  ```

### `POST /api/v1/appointments`
Books a new appointment with interactive database transaction conflict prevention.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `PATIENT`.
- **Body:**
  ```json
  {
    "clinicId": "UUID",
    "doctorId": "UUID",
    "patientId": "UUID",
    "appointmentDate": "2026-11-15",
    "startTime": "10:00",
    "endTime": "10:20",
    "bookingSource": "MANUAL",
    "reasonForVisit": "Follow-up checkup",
    "internalNotes": "VIP patient"
  }
  ```
- **Response `201 Created`**: Returns created appointment entity.
- **Errors:**
  - `400 Bad Request`: Slot falls on doctor break, outside working hours, or on a doctor leave day.
  - `409 Conflict`: The requested slot was already booked by another user during a concurrent race condition.

### `GET /api/v1/appointments/:id`
Retrieves appointment details and status transition audit history.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `PATIENT` (own only).
- **Response `200 OK`**: Returns appointment record with patient, doctor, clinic, and `statusHistory`.

### `POST /api/v1/appointments/:id/reschedule`
Reschedules an existing appointment to a new date and time slot.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `PATIENT` (own only).
- **Body:**
  ```json
  {
    "newDate": "2026-11-18",
    "newStartTime": "14:00",
    "newEndTime": "14:20",
    "reason": "Doctor rescheduled clinic session"
  }
  ```
- **Response `200 OK`**: Returns newly updated appointment.
- **Errors:**
  - `400 Bad Request`: Appointment is in a terminal state (`CANCELLED`, `COMPLETED`, `NO_SHOW`).
  - `409 Conflict`: The target slot is already occupied.

### `POST /api/v1/appointments/:id/cancel`
Cancels an appointment, releases the slot, and records the cancellation reason.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `PATIENT` (own only).
- **Body:**
  ```json
  {
    "cancellationReason": "Patient requested cancellation due to travel"
  }
  ```
- **Response `200 OK`**: Returns updated appointment with status `CANCELLED`.
- **Errors:**
  - `400 Bad Request`: Missing cancellation reason, or appointment is already completed/cancelled.

### `POST /api/v1/appointments/:id/status`
Updates appointment lifecycle status according to the valid state machine.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Body:**
  ```json
  {
    "status": "IN_PROGRESS",
    "reason": "Patient called into consultation room"
  }
  ```
- **Valid State Machine Transitions:**
  - `PENDING` -> `CONFIRMED`, `CANCELLED`
  - `CONFIRMED` -> `IN_PROGRESS`, `COMPLETED`, `NO_SHOW`, `CANCELLED`
  - `IN_PROGRESS` -> `COMPLETED`, `CANCELLED`
  - Terminal states (`CANCELLED`, `COMPLETED`, `NO_SHOW`) cannot transition further.
- **Response `200 OK`**: Returns updated appointment.
- **Errors:**
  - `400 Bad Request`: Disallowed state transition.

---

## 5. Queue Settings

### `GET /api/v1/queue/settings`
Lists operational queue settings for clinics.

- **Query Parameters:**
  - `clinicId` (optional, UUID): Filter by clinic location.
- **Roles:** `CLINIC_ADMIN`, `RECEPTIONIST`, `DOCTOR`, `SUPER_ADMIN`.
- **Response `200 OK`**: Array of `ClinicQueueSettings`.

### `POST /api/v1/queue/settings`
Creates queue settings configuration.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`.
- **Body:**
  ```json
  {
    "clinicId": "UUID",
    "doctorId": "UUID (optional)",
    "queueName": "General OPD",
    "tokenPrefix": "A",
    "tokenResetPolicy": "DAILY",
    "allowWalkIns": true,
    "allowAppointmentCheckIn": true,
    "estimatedConsultationMinutes": 15,
    "maxQueueCapacity": 100,
    "isPublicDisplayEnabled": true
  }
  ```
- **Response `201 Created`**: Returns created `ClinicQueueSettings`.

### `PATCH /api/v1/queue/settings/:id`
Updates operational queue configuration.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`.
- **Response `200 OK`**: Returns updated entity.

### `POST /api/v1/queue/settings/:id/regenerate-public-key`
Regenerates the public waiting room display token/URL for security.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`.
- **Response `200 OK`**: `{ "publicQueueId": "new-uuid" }`.

---

## 6. Queue Sessions

### `GET /api/v1/queue/sessions`
Lists daily operational queue sessions.

- **Query Parameters:**
  - `clinicId` (optional, UUID)
  - `doctorId` (optional, UUID)
  - `sessionDate` (optional, YYYY-MM-DD)
  - `status` (optional, `ACTIVE` | `PAUSED` | `CLOSED`)
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Response `200 OK`**: Paginated list of `ClinicQueueSession`.

### `POST /api/v1/queue/sessions`
Initializes a queue session for today.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Body:**
  ```json
  {
    "clinicId": "UUID",
    "queueSettingsId": "UUID",
    "doctorId": "UUID (optional)",
    "sessionDate": "2026-11-09 (optional, defaults to clinic local date)"
  }
  ```
- **Response `201 Created`**: Returns created session.

### `GET /api/v1/queue/sessions/:id`
Retrieves session details, current stats, active called token, and active serving token.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Response `200 OK`**: Session entity with `stats`, `activeCalledToken`, and `activeServingToken`.

### `POST /api/v1/queue/sessions/:id/start`
Starts or resumes a queue session (`NOT_STARTED` -> `ACTIVE` or `PAUSED` -> `ACTIVE`).

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Response `200 OK`**: Returns session with status `ACTIVE`.

### `POST /api/v1/queue/sessions/:id/pause`
Pauses an active queue session (`ACTIVE` -> `PAUSED`).

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Response `200 OK`**: Returns session with status `PAUSED`.

### `POST /api/v1/queue/sessions/:id/resume`
Resumes a paused queue session (`PAUSED` -> `ACTIVE`).

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Response `200 OK`**: Returns session with status `ACTIVE`.

### `POST /api/v1/queue/sessions/:id/close`
Closes a queue session for the day (`ACTIVE` or `PAUSED` -> `CLOSED`).

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Body:** `{ "force": true }` (required if a patient is currently in `SERVING`).
- **Response `200 OK`**: Returns session with status `CLOSED`.

---

## 7. Patient Check-In & Token Issuance

### `POST /api/v1/queue/check-in/appointment`
Checks in an eligible confirmed appointment for today, atomically issuing a digital token.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`, `PATIENT` (own appointment only).
- **Body:**
  ```json
  {
    "appointmentId": "UUID"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": "...",
    "tokenNumber": 1,
    "tokenDisplay": "A001",
    "queuePosition": 1,
    "status": "WAITING",
    "priorityType": "NORMAL",
    "estimatedWaitMinutes": 0,
    "checkedInAt": "2026-11-09T09:00:00.000Z"
  }
  ```
- **Errors:**
  - `400 Bad Request`: Appointment is not scheduled for today, or is cancelled/completed.
  - `409 Conflict`: Appointment already checked in with active token.

### `POST /api/v1/queue/check-in/walk-in`
Registers a walk-in patient directly into the queue without requiring an appointment.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Body:**
  ```json
  {
    "clinicId": "UUID",
    "patientId": "UUID",
    "queueSettingsId": "UUID (optional)",
    "queueSessionId": "UUID (optional)",
    "priorityType": "NORMAL" | "PRIORITY",
    "notes": "Elderly patient with high blood pressure"
  }
  ```
- **Response `201 Created`**: Returns created `QueueToken`.
- **Errors:**
  - `400 Bad Request`: Queue settings do not allow walk-ins, or max capacity reached.
  - `409 Conflict`: Patient already holds an active token in this session.

### `GET /api/v1/queue/tokens`
Lists queue tokens for a session or clinic.

- **Query Parameters:** `clinicId`, `queueSessionId`, `status`, `search`, `page`, `limit`.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Response `200 OK`**: Paginated list of `QueueToken`.

### `GET /api/v1/queue/tokens/:id`
Retrieves token details, wait estimate, and full status transition history.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `PATIENT` (own only).
- **Response `200 OK`**: Returns `QueueToken`.

---

## 8. Queue Calling & Operational Controls

### `POST /api/v1/queue/sessions/:id/call-next`
Atomically calls the next waiting patient in deterministic FIFO order (with priority override). Auto-skips any unserved previously called patient to prevent multiple active patients.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Response `200 OK`**: Returns called `QueueToken` with status `CALLED`.
- **Errors:**
  - `400 Bad Request`: Session is paused or closed, or no waiting patients remain.

### `POST /api/v1/queue/tokens/:id/recall`
Re-announces the currently called patient and updates the `calledAt` timestamp.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Response `200 OK`**: Returns updated `QueueToken`.

### `POST /api/v1/queue/tokens/:id/start-serving`
Marks called patient as actively in consultation (`CALLED` -> `SERVING`).

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Response `200 OK`**: Returns updated `QueueToken` with status `SERVING`.

### `POST /api/v1/queue/tokens/:id/complete`
Completes the consultation (`SERVING` -> `COMPLETED`), increments session total completed, and finishes the associated appointment if present.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Response `200 OK`**: Returns updated `QueueToken` with status `COMPLETED`.

### `POST /api/v1/queue/tokens/:id/skip`
Skips a patient absent during calling (`CALLED` or `WAITING` -> `SKIPPED`) and recalculates remaining waiting positions.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Body:** `{ "reason": "Patient not in waiting room" }`
- **Response `200 OK`**: Returns updated `QueueToken`.

### `POST /api/v1/queue/tokens/:id/restore`
Restores a skipped patient back into active waiting queue (`SKIPPED` -> `WAITING`) and recalculates positions.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Response `200 OK`**: Returns updated `QueueToken` with status `WAITING`.

### `POST /api/v1/queue/tokens/:id/no-show`
Marks patient as no-show (`CALLED` or `WAITING` -> `NO_SHOW`).

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Response `200 OK`**: Returns updated `QueueToken`.

### `POST /api/v1/queue/tokens/:id/cancel`
Cancels a token and removes patient from queue (`WAITING` or `CALLED` or `SKIPPED` -> `CANCELLED`).

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`.
- **Response `200 OK`**: Returns updated `QueueToken`.

### `POST /api/v1/queue/tokens/:id/priority`
Adjusts priority level of token (`NORMAL` <-> `PRIORITY`) and recalculates queue positions.

- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Body:**
  ```json
  {
    "priorityType": "PRIORITY",
    "reason": "Elderly patient with wheelchair"
  }
  ```
- **Response `200 OK`**: Returns updated `QueueToken`.

---

## 9. Patient Queue & Public Display

### `GET /api/v1/patient/tokens`
Lists authenticated patient's tokens.

- **Roles:** `PATIENT`.
- **Response `200 OK`**: `{ "data": [QueueToken] }`.

### `GET /api/v1/patient/tokens/:id`
Retrieves detailed live token tracker for patient: position, doctor room, now serving token, and estimated wait minutes.

- **Roles:** `PATIENT`.
- **Response `200 OK`**: `QueueToken` with `patientsAhead` and `currentActiveToken`.

### `GET /api/v1/public/queues/:publicQueueId`
Public waiting room monitor endpoint (no authorization header required).

- **Security & Privacy:**
  - Returns strictly non-sensitive display fields.
  - Patient names, phones, MRNs, and internal database IDs are NEVER exposed.
- **Response `200 OK`:**
  ```json
  {
    "clinicName": "Al-Shifa Hospital",
    "queueName": "General OPD",
    "doctorName": "Dr. Muhammad Talha",
    "status": "ACTIVE",
    "currentServingToken": "A004",
    "recentlyCalledTokens": ["A004", "A003", "A002"],
    "waitingCount": 6,
    "estimatedWaitMinutes": 90,
    "lastUpdated": "2026-11-09T18:00:00.000Z"
  }
  ```

---

## 10. WhatsApp Business Cloud API Integration Endpoints (Phase 6)

### `GET /api/v1/webhooks/whatsapp`
Meta Webhook Verification Challenge Handshake.
- **Query Parameters:** `hub.mode`, `hub.verify_token`, `hub.challenge`.
- **Behavior:** Returns `hub.challenge` as raw string with `200 OK` when verify token matches. Returns `403 Forbidden` on mismatch.

### `POST /api/v1/webhooks/whatsapp`
Meta Webhook Event Ingestion (Inbound Messages, Status Receipts, Handover Triggers).
- **Security:** Verifies `X-Hub-Signature-256` HMAC-SHA256 signature using `META_APP_SECRET`.
- **Idempotency:** Webhook event deduplication via `whatsapp_webhook_events`.
- **Response `200 OK`:** `{ "status": "EVENT_RECEIVED" }`.

### `GET /api/v1/whatsapp/integration`
Fetches clinic Meta integration status and configuration with masked credentials.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`.
- **Query:** `clinicId`.
- **Response `200 OK`:** `WhatsappIntegration` object.

### `POST /api/v1/whatsapp/integration`
Registers or updates clinic WhatsApp Cloud API credentials.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`.
- **Body:**
  ```json
  {
    "clinicId": "UUID",
    "phoneNumberId": "1234567890",
    "wabaId": "9876543210",
    "businessPhoneNumber": "+923001234567",
    "displayName": "Al-Shifa Clinic",
    "accessToken": "EAA...",
    "webhookVerifyToken": "my-secret-token-12345"
  }
  ```
- **Response `200 OK`:** Created/updated integration.

### `GET /api/v1/whatsapp/integration/health`
Live connection status check against Meta Graph API.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Query:** `clinicId`.
- **Response `200 OK`:**
  ```json
  {
    "configured": true,
    "connected": true,
    "status": "CONNECTED",
    "phoneNumberId": "1234567890",
    "businessPhoneNumber": "+923001234567",
    "verifiedName": "Al-Shifa Clinic",
    "webhookVerified": true,
    "lastCheckedAt": "2026-11-09T22:30:00.000Z"
  }
  ```

### `GET /api/v1/whatsapp/templates`
Lists approved message templates registered for the clinic.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`, `DOCTOR`.
- **Query:** `clinicId`.
- **Response `200 OK`:** `WhatsappMessageTemplate[]`.

### `POST /api/v1/whatsapp/send-text`
Dispatches a free-form text message.
- **Enforcement:** Strictly rejects (`400 Bad Request`) if 24-hour customer window is expired or recipient is opted out.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Body:** `{ "clinicId": "UUID", "to": "+923001234567", "message": "Text" }`.
- **Response `200 OK`:** `WhatsappMessage`.

### `POST /api/v1/whatsapp/send-template`
Dispatches an approved Meta template message (allowed outside 24-hr window).
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Body:**
  ```json
  {
    "clinicId": "UUID",
    "to": "+923001234567",
    "templateName": "appointment_confirmation",
    "languageCode": "en_US",
    "parameters": ["Ali", "Dr. Tariq", "2026-11-10", "10:00 AM", "A001"]
  }
  ```
- **Response `200 OK`:** `WhatsappMessage`.

### `GET /api/v1/whatsapp/conversations`
Lists conversations for a clinic with filters and search.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`, `DOCTOR`.
- **Query Parameters:** `clinicId`, `status` (`ALL`, `HUMAN_HANDOVER`, `OPEN`, `RESOLVED`), `search`, `page`, `limit`.
- **Response `200 OK`:** Paginated list of `WhatsappConversation` with `isWithin24HourWindow` indicator.

### `GET /api/v1/whatsapp/conversations/:id`
Retrieves single conversation thread and full message history.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`, `DOCTOR`.
- **Response `200 OK`:** `WhatsappConversation` with messages thread.

### `POST /api/v1/whatsapp/conversations/:id/messages`
Staff receptionist reply to patient conversation.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Body:** `{ "message": "Your prescription is ready for pickup." }`.
- **Response `201 Created`:** `WhatsappMessage`.

### `POST /api/v1/whatsapp/conversations/:id/claim`
Receptionist claims conversation from Human Handover queue.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Response `200 OK`:** Updated `WhatsappConversation` with assigned staff user.

### `POST /api/v1/whatsapp/conversations/:id/resolve`
Resolves a conversation.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Response `200 OK`:** Updated `WhatsappConversation` with status `RESOLVED`.

### `POST /api/v1/whatsapp/conversations/:id/reopen`
Reopens a resolved conversation.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Response `200 OK`:** Updated `WhatsappConversation` with status `OPEN`.

### `POST /api/v1/whatsapp/contacts/:id/consent`
Updates patient opt-in / opt-out consent status manually.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Body:** `{ "consentStatus": "OPTED_OUT", "optOutReason": "Patient requested stop" }`.
- **Response `200 OK`:** Updated `WhatsappContact`.

---

## 11. AI Multilingual Receptionist API

### `GET /api/v1/ai/settings`
Retrieves AI Assistant configuration for the clinic/organization.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Query Parameters:** `clinicId` (optional).
- **Response `200 OK`:** `AiAssistantSettings`.

### `PATCH /api/v1/ai/settings`
Updates AI Assistant settings, capabilities, language defaults, and greeting message.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`.
- **Body:** `UpdateAiAssistantSettingsInput`.
- **Response `200 OK`:** Updated `AiAssistantSettings`.

### `POST /api/v1/ai/settings/enable` & `POST /api/v1/ai/settings/disable`
Quick toggles to activate or pause the automated AI receptionist.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`.
- **Body:** `{ "clinicId": "UUID" }`.
- **Response `200 OK`:** Updated `AiAssistantSettings`.

### `GET /api/v1/ai/faqs`
Lists verified clinic FAQ entries with category and keyword search filters.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`, `DOCTOR`.
- **Query Parameters:** `clinicId`, `category`, `search`, `isActive`, `page`, `limit`.
- **Response `200 OK`:** Paginated list of `ClinicFaq`.

### `POST /api/v1/ai/faqs`
Creates a verified multilingual clinic FAQ.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`.
- **Body:** `CreateClinicFaqInput` (`questionEn`, `answerEn`, optional Urdu/Pashto, `category`, `isActive`).
- **Response `201 Created`:** Created `ClinicFaq`.

### `PATCH /api/v1/ai/faqs/:id` & `DELETE /api/v1/ai/faqs/:id`
Updates or deletes an existing clinic FAQ entry.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`.

### `GET /api/v1/ai/interactions`
Audit log of all conversational turns, detected intents, languages, outcomes, latency, and costs.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Query Parameters:** `clinicId`, `conversationId`, `outcome`, `detectedIntent`, `page`, `limit`.
- **Response `200 OK`:** Paginated `AiInteractionLog`.

### `GET /api/v1/ai/tool-executions`
Audit log of all executed sandboxed server tools.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Query Parameters:** `clinicId`, `conversationId`, `toolName`, `page`, `limit`.
- **Response `200 OK`:** Paginated `AiToolExecutionLog`.

### `GET /api/v1/ai/usage`
Aggregated usage analytics (total interactions, token volume, estimated cost USD, average latency ms, handover percentage, language breakdown, top patient intents).
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`.
- **Query Parameters:** `clinicId` (optional).
- **Response `200 OK`:** `AiUsageStats`.

### `GET /api/v1/ai/health`
Health and rate limit status of the AI provider.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Response `200 OK`:** `AiAssistantHealth`.

### `GET /api/v1/ai/conversations/:id/state`
Inspects active workflow state, current intent, step, and context for debugging.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.

### `POST /api/v1/ai/conversations/:id/reset`
Resets the conversation workflow state to `IDLE`.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.

### `POST /api/v1/ai/conversations/:id/test`
Direct testing endpoint simulating incoming user messages in the playground simulator.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`.
- **Body:** `{ "message": "...", "clinicId": "UUID" }`.
- **Response `200 OK`:** `{ "response": "...", "intent": "...", "outcome": "..." }`.

---

## 12. Notification Orchestration, Automated Reminders & Workflow Engine (Phase 8)

### `GET /api/v1/notifications`
Queries notification jobs ledger with tenancy filters and pagination.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`, `DOCTOR`.
- **Query Parameters:** `clinicId`, `channel`, `eventType`, `status`, `recipientId`, `relatedEntityType`, `relatedEntityId`, `startDate`, `endDate`, `page`, `limit`.
- **Response `200 OK`:** Paginated `NotificationJob` objects with associated `attemptLogs` and `template`.

### `GET /api/v1/notifications/analytics`
Fetches high-level notification delivery metrics and breakdown.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Query Parameters:** `clinicId` (optional).
- **Response `200 OK`:** `NotificationAnalytics` with `totalJobs`, `sentCount`, `deliveredCount`, `deliverySuccessRate`, `suppressedCount`, `failedCount`, and channel/status/event breakdown.

### `GET /api/v1/notifications/:id`
Retrieves granular job detail including full attempt audit trail and lifecycle events.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`, `DOCTOR`.

### `POST /api/v1/notifications/:id/retry`
Forces immediate re-dispatch of a failed or dead-lettered notification job.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Body:** `{ "force": true }`.
- **Response `200 OK`:** Updated `NotificationJob`.

### `POST /api/v1/notifications/:id/cancel`
Cancels a scheduled or pending reminder job.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Body:** `{ "reason": "Patient requested cancellation" }`.
- **Response `200 OK`:** Cancelled `NotificationJob`.

### `GET /api/v1/notification-preferences`
Retrieves communication preferences and consent status for a patient or user.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`, `DOCTOR`, `PATIENT`.
- **Query Parameters:** `patientId`, `userId`.

### `POST /api/v1/notification-preferences`
Saves or updates channel consent settings.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`, `PATIENT`.
- **Body:** `SaveNotificationPreferenceDto`.

### `POST /api/v1/notification-preferences/opt-out`
Records explicit opt-out suppression for a channel.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`, `PATIENT`.
- **Body:** `OptOutNotificationPreferenceDto`.

### `GET /api/v1/notification-rules`
Lists event routing rules, schedule offsets, quiet hours policies, and fallback channels.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Query Parameters:** `clinicId`.

### `POST /api/v1/notification-rules` & `PUT /api/v1/notification-rules/:id` & `DELETE /api/v1/notification-rules/:id`
CRUD operations for clinic operational notification rules.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`.

### `GET /api/v1/notification-templates`
Lists reusable multilingual message templates.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`, `DOCTOR`.
- **Query Parameters:** `clinicId`.

### `POST /api/v1/notification-templates` & `PUT /api/v1/notification-templates/:id` & `DELETE /api/v1/notification-templates/:id`
CRUD operations for notification templates.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`.

### `POST /api/v1/notification-templates/preview`
Renders template body and subject with test variable values.
- **Roles:** `SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`.
- **Body:** `PreviewNotificationTemplateDto`.

### `GET /api/v1/in-app-notifications`
Lists in-app notifications for the authenticated user.
- **Query Parameters:** `unreadOnly`, `category`, `page`, `limit`.

### `GET /api/v1/in-app-notifications/unread-count`
Returns unread count badge for dashboard topbar.
- **Response `200 OK`:** `{ "unreadCount": 3 }`.

### `POST /api/v1/in-app-notifications/:id/read` & `POST /api/v1/in-app-notifications/read-all`
Marks single or all in-app notifications as read for current user.





