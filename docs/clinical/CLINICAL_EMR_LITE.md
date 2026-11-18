# Clinical Encounter Management & EMR-Lite Architecture

## 1. Executive Summary

Phase 12 delivers the **Clinical Encounter Management & EMR-Lite** system for MatabAI (ShifaDesk). Fully integrated into the multi-tenant clinic operations platform, this module empowers attending physicians and clinical healthcare staff to manage consultation visits from check-in to completion, record structured clinical notes, track longitudinal patient medical background, record physical observations and vitals with verified BMI calculations, enter manual diagnoses with coding systems, issue outpatient prescriptions (`RX-YYYYMM-XXXX`) with medication versioning and printable Rx layouts, order diagnostic laboratory tests (Phase 10), link consultation billing and invoices (Phase 11), schedule follow-up visits, and enforce tamper-evident finalization with immutable clinical document snapshots and amendment ledgers.

The system upholds strict medical safety boundaries: **Zero automated AI diagnosis and zero AI prescribing**. All diagnoses and prescriptions are entered and validated exclusively by licensed medical professionals.

---

## 2. Architecture & Data Flow

```
                      [ Appointment / Queue Token / Walk-in ]
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │      Clinical Encounter Service      │
                      │  • Sequence: ENC-YYYYMM-XXXX         │
                      │  • Appointment Duplicate Prevention  │
                      │  • Atomic Token & Status Sync        │
                      └──────────────────┬───────────────────┘
                                         │
                ┌────────────────────────┼────────────────────────┐
                ▼                        ▼                        ▼
     ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
     │   Clinical Notes    │  │ Vitals/Observations │  │   Diagnoses (MD)    │
     │ • Chief Complaint   │  │ • BP, Pulse, SpO2   │  │ • Primary/Secondary │
     │ • Symptoms & Exam   │  │ • Safe BMI Formula  │  │ • ICD-10 & Custom   │
     │ • Assessment & Plan │  │ • Range Validations │  │ • Clinical Status   │
     └─────────────────────┘  └─────────────────────┘  └─────────────────────┘
                │                        │                        │
                └────────────────────────┼────────────────────────┘
                                         │
                ┌────────────────────────┼────────────────────────┐
                ▼                        ▼                        ▼
     ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
     │  Prescriptions (Rx) │  │ Diagnostic Lab (P10)│  │ Billing/Invoices(P11│
     │ • Ref: RX-YYYYMM-X  │  │ • Order Tests       │  │ • Consultation Fee  │
     │ • Dosage, Frequency │  │ • Track Samples     │  │ • Invoice Linking   │
     │ • Printable Layout  │  │ • Released Reports  │  │ • Payment Status    │
     └─────────────────────┘  └─────────────────────┘  └─────────────────────┘
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │    Finalization & Immutability       │
                      │  • Doctor Clinical Confirmation      │
                      │  • Immutable Version Snapshot        │
                      │  • Status -> COMPLETED (Locked)      │
                      │  • Audited Amendment Ledger          │
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │    Longitudinal EMR-Lite Chart       │
                      │  • Chronological Visit Timeline      │
                      │  • Vitals Trend & Allergies Alert    │
                      │  • Sanitized Patient Portal View     │
                      └──────────────────────────────────────┘
```

---

## 3. Database Schema

Phase 12 introduces 12 tables in PostgreSQL via Prisma with Row-Level Security:

1. **`clinical_encounters`**:
   - `id`, `organization_id`, `clinic_id`, `patient_id`, `doctor_id`, `appointment_id`, `queue_token_id`
   - `encounter_reference`: Unique format `ENC-YYYYMM-XXXX` (monthly reset per org)
   - `encounter_date`, `start_time`, `end_time`, `timezone`
   - `status`: `SCHEDULED`, `CHECKED_IN`, `IN_PROGRESS`, `PENDING_REVIEW`, `COMPLETED`, `CANCELLED`
   - `source`: `APPOINTMENT`, `WALK_IN`, `DOCTOR_INITIATED`, `RECEPTIONIST_ASSISTED`
   - `type`: `GENERAL_CONSULTATION`, `FOLLOW_UP`, `EMERGENCY`, `TELEMEDICINE`, `ROUTINE_CHECKUP`
   - `is_finalized`, `finalized_at`, `finalized_by_id`, `created_by_id`

2. **`encounter_status_history`**:
   - `id`, `encounter_id`, `from_status`, `to_status`, `change_reason`, `changed_by_id`, `created_at`

3. **`clinical_notes`**:
   - `id`, `encounter_id` (1:1), `chief_complaint`, `patient_reported_symptoms`, `visit_purpose`, `visit_context`, `examination_notes`, `clinical_assessment`, `treatment_plan`, `remarks`, `recorded_by_id`

4. **`patient_medical_history`**:
   - `id`, `organization_id`, `patient_id` (1:1), `conditions`, `surgeries`, `allergies`, `family_history`, `social_history`, `current_medications`, `last_reviewed_by_id`

5. **`patient_observations`**:
   - `id`, `organization_id`, `clinic_id`, `patient_id`, `encounter_id`, `measured_at`, `systolic_bp`, `diastolic_bp`, `pulse_rate`, `temperature`, `temperature_unit`, `respiratory_rate`, `oxygen_saturation`, `height_cm`, `weight_kg`, `bmi`, `notes`, `measured_by_id`

6. **`encounter_diagnoses`**:
   - `id`, `encounter_id`, `patient_id`, `diagnosis_description`, `diagnosis_code`, `coding_system`, `type` (`PRIMARY`/`SECONDARY`), `clinical_status`, `notes`, `diagnosed_by_id`

7. **`prescriptions`**:
   - `id`, `organization_id`, `clinic_id`, `patient_id`, `doctor_id`, `encounter_id`
   - `prescription_reference`: Unique format `RX-YYYYMM-XXXX`
   - `version`, `status` (`DRAFT`, `ACTIVE`, `AMENDED`, `CANCELLED`, `DISPENSED`), `notes`, `cancellation_reason`

8. **`prescription_items`**:
   - `id`, `prescription_id`, `medication_name`, `generic_name`, `strength`, `dosage_form`, `dosage`, `route`, `frequency`, `duration`, `quantity`, `instructions`

9. **`prescription_amendments`**:
   - `id`, `prescription_id`, `version_number`, `reason`, `amended_by_id`, `previous_snapshot_json`, `new_snapshot_json`, `created_at`

10. **`encounter_followups`**:
    - `id`, `encounter_id`, `clinic_id`, `patient_id`, `doctor_id`, `followup_required`, `recommended_date`, `instructions`, `status` (`PENDING`, `SCHEDULED`, `COMPLETED`, `CANCELLED`), `scheduled_appointment_id`

11. **`encounter_amendments`**:
    - `id`, `encounter_id`, `version_number`, `amendment_reason`, `amended_by_id`, `previous_state_json`, `amended_state_json`, `amended_at`

12. **`clinical_document_versions`**:
    - `id`, `encounter_id`, `document_type`, `version_number`, `document_title`, `content_json`, `is_final`, `signed_by_id`, `signed_at`

---

## 4. Key Workflows & Engineering Controls

### Sequential Numbering
Encounters and prescriptions follow guaranteed sequential numbering:
- `ENC-YYYYMM-XXXX` (e.g. `ENC-202611-0001`)
- `RX-YYYYMM-XXXX` (e.g. `RX-202611-0001`)
Zero-padded to 4 digits, scoped per organization.

### Duplicate Active Encounter Prevention
When opening an encounter linked to a scheduled appointment, the system checks whether an active encounter (`SCHEDULED`, `CHECKED_IN`, `IN_PROGRESS`, `PENDING_REVIEW`) already exists for that appointment. If detected, creation is rejected with `BadRequestException`.

### Atomic Appointment and Queue Synchronization
When an encounter status transitions to `IN_PROGRESS`, linked appointments are automatically updated to `IN_PROGRESS` and queue tokens are updated to `SERVING` (with `serviceStartedAt = now()`).
When an encounter is finalized (`COMPLETED`), linked appointments and queue tokens transition to `COMPLETED`.

### Strict Conditional BMI Calculation
BMI is strictly calculated as:
$$\text{BMI} = \frac{\text{weightKg}}{(\text{heightCm} / 100)^2}$$
Calculated **only** when both `heightCm > 0` and `weightKg > 0` are present. Missing values evaluate to `null` to prevent false medical data.

### Immutability & Document Snapshots
1. **Direct Edit Locking**: Once finalized (`isFinalized: true`), direct edits to clinical notes, observations, and diagnoses are blocked with `BadRequestException`.
2. **Explicit Confirmation**: Finalization requires explicit doctor confirmation (`confirmedByDoctor: true`) and mandatory chief complaint.
3. **Signed Snapshot**: Creates a frozen JSON snapshot in `ClinicalDocumentVersion` signed by the attending physician.
4. **Audited Amendment**: Changes post-finalization must use `amendEncounter` with an audited justification reason (`amendmentReason`), creating an `EncounterAmendment` ledger entry and incrementing document versions (`v2`, `v3`, etc.).

---

## 5. Security & RBAC Matrix

| Role | Encounter Read | Encounter Write | Encounter Finalize / Amend | Prescription Read | Prescription Write |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **SUPER_ADMIN** | Yes | Yes | Yes | Yes | Yes |
| **CLINIC_ADMIN** | Yes | Yes | Yes | Yes | Yes |
| **DOCTOR** | Yes | Yes | Yes (Attending) | Yes | Yes |
| **RECEPTIONIST** | Yes | Yes (Open/Vitals) | No | Yes | No |
| **PATIENT** | Yes (Sanitized) | No | No | Yes (Own Rx) | No |
