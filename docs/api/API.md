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
