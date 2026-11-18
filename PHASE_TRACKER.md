# MatabAI Phase Tracker & Engineering Milestones

Founder: **Muhammad Talha**  
Project: **MatabAI (ShifaDesk)**  
Current Status: **Phases 0 through 15 Verified & Complete (Production Ready)**

---

## 🚦 Phase Overview

| Phase | Description | Status | Gate Condition |
| :---: | :--- | :---: | :--- |
| **0** | **Engineering Foundation & Monorepo Initialization** | **VERIFIED** | Monorepo builds, health check passes, test suites pass, docs complete. Committed (`c9e3645`). |
| **1** | **Frontend UI/UX, Design System & Application Foundation** | **VERIFIED** | Responsive Next.js 15 UI, 29 routes, RTL multilingual support (En, Ur, Ps), live queue board, patient portal. |
| **2** | **Backend Modular Monolith, Database, Auth & Tenant Isolation** | **VERIFIED** | Real PostgreSQL/Supabase schema, Prisma ORM, 5-role RBAC, TenantGuard, Supabase JWT verification, REST endpoints, audit logs. Committed (`c72c044`). |
| **3** | **Clinic, Doctor, Staff & Patient Management** | **VERIFIED** | Real database persistence, multi-tenant RLS, strict RBAC, registration number privacy masking, MRN generation, duplicate prevention, 4 full dashboard interfaces, 44 backend unit tests (100% passing). Committed (`749d0b2`). |
| **4** | **Appointment Scheduling & Booking Engine** | **VERIFIED** | Real database persistence, doctor weekly working hours, schedule exceptions/leaves, dynamic timezone slot generation, double-booking prevention under concurrency, state machine transitions, guided booking wizards, calendar/table views, 68 backend tests (100% passing). Committed (`6111058`). |
| **5** | **Digital Token & Real-Time Queue Management** | **VERIFIED** | Real database persistence, atomic token generation, appointment & walk-in check-in, deterministic queue ordering (priority + FIFO), doctor & receptionist calling controls, real-time events, public TV monitor display, patient live queue tracker, 87 backend tests (100% passing). Committed (`9b37bd6`). |
| **6** | **WhatsApp Business Cloud API Integration** | **VERIFIED** | Official Meta Graph API v21.0 client, secure webhook verification (HMAC-SHA256 timing-safe), event deduplication, 24-hr service window enforcement, opt-in/opt-out consent tracking, human receptionist handover, appointment/queue notifications, 117 tests passing (100%). Committed (`756c250`). |
| **7** | **AI-Powered Multilingual Receptionist** | **VERIFIED** | Multilingual NLU (EN, UR, PS, Roman Urdu, Roman Pashto), 21 administrative intents, strict medical safety boundaries (ZERO medical advice), immediate emergency guidance & escalation to Rescue 1122, multi-turn booking with explicit confirmation, 11 allowlisted server tools, audit ledger, and interactive web dashboard. All 151 tests passing (100%). Committed (`a1b3736`). |
| **8** | **Notification Orchestration, Automated Reminders & Workflow Engine** | **VERIFIED** | Centralized notification engine: WhatsApp (Meta Cloud API), Persistent In-App dashboard alerts, real Email & SMS adapters (unconfigured detection without simulated delivery), appointment reminders (-24h, -2h), invalidation on reschedule/cancellation, quiet hours enforcement, opt-in/opt-out keyword handling, atomic worker claiming, dead-letter state, and interactive notification dashboard. All 25 test suites (167 tests) passing (100%). Committed (`578bbfe`). |
| **9** | **AI Voice Receptionist, Telephony & Intelligent IVR System** | **VERIFIED** | Multi-language inbound telephony (Urdu, Pashto, English), Keypad DTMF IVR (1: Urdu, 2: Pashto, 3: English, 0: Receptionist), Twilio Voice adapter (TwiML generation, HMAC-SHA1 signature verification), strict medical safety (100% refusal of medical advice, immediate Rescue 1122 escalation), conversational appointment booking & queue token lookup, TwiML `<Dial>` receptionist transfer with staff alerts, Pakistan PTA regulatory trunking architecture, browser-based voice simulator playground, and voice dashboard. All 29 test suites (189 tests) passing (100%). Committed (`661074e`). |
| **10** | **Diagnostic Laboratory Management & Secure Report Delivery** | **VERIFIED** | Outpatient pathology test directory, packages/panels, physical specimen tracking (`SMP-YYYYMM-XXXX`) through 8 lifecycle stages, lab orders (`LAB-YYYYMM-XXXX`) with immutable price snapshotting, two-stage result review with strict separation of duties, amendment ledger, AES-256-GCM encrypted PDF report storage (%PDF- magic byte check), 256-bit unguessable tokens with phone verification, WhatsApp & in-app notifications, full laboratory operations dashboard, tests catalog, reports archive, and public access portal. All 34 test suites (218 tests) passing (100%). |
| **11** | **Financial Management, Billing, Invoicing & Payment Processing** | **VERIFIED** | Outpatient & diagnostic invoices (`INV-YYYYMM-XXXX`), multi-tender collections (`PAY-YYYYMM-XXXX`), cash register drawer sessions (`CRS-YYYYMM-XXXX`) with mandatory physical discrepancy explanation, separation of duties refunds (`REF-YYYYMM-XXXX`), operating expenses (`EXP-YYYYMM-XXXX`), multi-source reconciliation, A4/80mm thermal receipts, Phase 8 notifications, and patient billing portal. All 40 test suites (249 tests) passing (100%). |
| **12** | **Clinical Encounter Management & EMR-Lite** | **VERIFIED** | Outpatient consultation lifecycle (`ENC-YYYYMM-XXXX`), structured clinical notes, longitudinal medical background, vitals/observations with safe conditional BMI, physician-entered diagnoses (ICD-10/Custom), outpatient prescriptions (`RX-YYYYMM-XXXX`) with medication versioning & printable Rx layout, direct Phase 10 lab ordering & Phase 11 invoice linking, doctor finalization & immutable document snapshot, audited amendments, longitudinal EMR-Lite chart, and patient consultation portal. All 5 test suites (23 tests) passing (100%). |
| **13** | **Advanced Analytics, Business Intelligence & Executive Reporting** | **VERIFIED** | Multi-domain executive KPI metrics across all operational records, 8 domain dashboards (Appointments, Queue, Patients, Staff, Laboratory, Finance in paisa, WhatsApp/Voice Comms, AI reception telemetry), custom query runner, formula-injection protected exports (CSV, XLSX, PDF), scheduled recurring reports. All 50 test suites (287 tests) passing (100%). |
| **14** | **SaaS Subscription Management, Tenant Onboarding & Platform Administration** | **VERIFIED** | Multi-tenant SaaS transformation: clinic self-registration (`/register/clinic`), guided onboarding (`/onboarding`), 3 subscription tiers (`STARTER`, `PROFESSIONAL`, `LABORATORY`), versioned pricing in minor units (paisa), 19 feature entitlements (`EntitlementGuard`), metered usage telemetry, strict financial boundary separation from Phase 11 patient billing, sequential SaaS invoices (`SUB-YYYYMM-XXXX`) and payments (`SPAY-YYYYMM-XXXX`), manual bank transfer review queue, Safepay card gateway adapter, Central Super-Admin Platform Console (`/dashboard/platform/*`), clinic subscription manager (`/dashboard/subscription/*`), Phase 8 automated notifications, 24 SaaS backend unit tests (100% passing), full monorepo 311/311 tests passing. |
| **15** | **Production Readiness, DevOps, Security Hardening & Deployment Automation** | **VERIFIED** | Full-stack production hardening: zero CVE vulnerability remediation (Next.js 15.2.8), multi-environment separation (.env.staging, .env.production), runtime health probes (/live, /ready, /metrics), sliding-window rate limiting guard, structured JSON logging with distributed correlation IDs, database constraint verification (100 models audited), automated backup & non-destructive restore testing (RPO 1h, RTO 15m), CI/CD pipelines (GitHub Actions for CI, Staging, and Production), load testing & smoke test suites, 11 operational runbooks in docs/production/. Monorepo 56/56 test suites (314/314 tests) passing (100%), all 60 web routes cleanly compiled. |

---

## 📋 Phase 10 Execution Checklist (Complete & Verified)

### Database Schema & Security
- [x] Prisma models: `LaboratoryTestCategory`, `LaboratoryTest`, `LaboratoryPackage`, `LaboratoryPackageItem`, `LaboratoryOrder`, `LaboratoryOrderItem`, `LaboratorySample`, `LaboratoryResult`, `LaboratoryResultReview`, `LaboratoryReport`, `LaboratoryReportAccessToken`, `LaboratoryReportAccessLog`, `LaboratoryAuditLog`
- [x] Back-relations connected to `Organization`, `Clinic`, `UserProfile`, `Patient`, `Doctor`, and `Appointment`
- [x] Row Level Security (RLS) policies implemented for all 13 Phase 10 tables in `infrastructure/database/rls-policies.sql`
- [x] Generated Prisma Client v6.19.3 (`pnpm run db:generate`)

### Shared Packages & Validation
- [x] `@matabai/shared`: Enums (`LabOrderStatus`, `LabSampleStatus`, `LabResultStatus`, `LabReportStatus`, `LabDeliveryStatus`, `LabResultType`, `ReviewDecision`, `LabSampleType`, `LabAccessStatus`), permissions (`LAB_READ`, `LAB_WRITE`, `LAB_MANAGE`, `LAB_REVIEW`, `LAB_APPROVE`, `LAB_RELEASE`, `REPORT_READ`, `REPORT_WRITE`), roles (`LAB_MANAGER`, `LAB_REVIEWER`), role matrix mappings, and entity interfaces
- [x] `@matabai/validation`: Zod schemas for test categories, diagnostic tests, packages, lab orders, sample transitions, result entry, result amendments, reviews, and delivery verifications
- [x] Built packages cleanly with `pnpm run build:packages` (0 errors)

### Storage & Cryptographic Security
- [x] `PrivateReportStorageService`:
  - AES-256-GCM authenticated encryption at rest with random 12-byte IV and 16-byte authentication tag
  - `%PDF-` magic-byte inspection (`0x25 0x50 0x44 0x46 0x2D`) to prevent arbitrary file execution
  - Cryptographic SHA-256 checksum calculation for tamper-evidence
  - Strict path traversal sanitization and private storage quarantine
  - Standard synthetic PDF report generation

### Core Laboratory Services
- [x] `LaboratoryCatalogService`: Category, test, and package management with unique code constraints per organization
- [x] `LaboratoryOrderService`: Sequential numbering (`LAB-YYYYMM-XXXX`), immutable unit price snapshotting, initial sample group creation, status synchronization, and cancellation with reason
- [x] `LaboratorySampleService`: Specimen tracking (`SMP-YYYYMM-XXXX`), phlebotomist/technician lifecycle transitions, mandatory rejection reasons, and automatic parent order synchronization
- [x] `LaboratoryResultService`: Two-stage result entry, amendment ledger with mandatory justification, and strict separation of duties (technicians cannot self-approve their own results)
- [x] `LaboratoryReportService`: Synthetic report generation, external PDF upload with magic-byte check, pathologist formal approval, and release gating (unapproved reports cannot be released)
- [x] `LaboratoryDeliveryService`: Unguessable 256-bit token generation (`crypto.randomBytes(32)`), SHA-256 token hashing, patient phone/DOB verification challenge, instant one-click revocation, and WhatsApp/In-App notification dispatch
- [x] `LaboratoryAnalyticsService`: Laboratory KPIs (orders, samples, turnaround times, revenue, sample status breakdown, 7-day volume timeline)
- [x] `LaboratoryAuditService`: Tamper-evident ledger for all laboratory mutations

### API Controllers & Webhooks
- [x] `/api/v1/laboratory/categories`: List, create, update test categories
- [x] `/api/v1/laboratory/tests`: Catalog list, create, update tests
- [x] `/api/v1/laboratory/packages`: Package list, create packages
- [x] `/api/v1/laboratory/orders`: Order directory, create order (`LAB-YYYYMM-XXXX`), get order, cancel order
- [x] `/api/v1/laboratory/samples`: Sample list, transition sample status (`SMP-YYYYMM-XXXX`)
- [x] `/api/v1/laboratory/order-items/:id/result`: Result entry
- [x] `/api/v1/laboratory/results/:id/amend`: Result amendment with mandatory reason
- [x] `/api/v1/laboratory/results/:id/review`: Separation-of-duties review & approval
- [x] `/api/v1/laboratory/reports`: Report archive, generate report, upload external PDF, approve, release, download
- [x] `/api/v1/laboratory/reports/:id/access-token`: Generate secure 256-bit token delivery link
- [x] `/api/v1/laboratory/reports/:id/revoke-access`: Instant access revocation
- [x] `/api/v1/laboratory/analytics`: Operational KPIs and volume statistics
- [x] `/api/v1/patient/laboratory/orders`: Patient portal orders
- [x] `/api/v1/patient/laboratory/reports`: Patient portal released reports
- [x] `/api/v1/public/reports/access/:token/verify`: Patient identity verification challenge
- [x] `/api/v1/public/reports/access/:token/stream`: Decrypted authenticated PDF streaming

### Frontend Laboratory Interfaces
- [x] Extended `ApiClient.laboratory` in `apps/web/lib/api-client.ts` with all catalog, order, specimen, result, report, analytics, patient, and public endpoints
- [x] Added `Laboratory` navigation item in `apps/web/app/(dashboard)/layout.tsx` for `LAB_MANAGER`, `LAB_REVIEWER`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`
- [x] Added `Lab Reports` navigation item in `apps/web/app/(patient)/layout.tsx` for patient portal
- [x] Implemented Laboratory Operations Dashboard at `apps/web/app/(dashboard)/dashboard/laboratory/page.tsx`:
  - 6 KPI metric cards (Total Orders, Pending Samples, Under Review, Reports Ready, Completed, Total Revenue)
  - Orders table with status filtering, search, and details modal
  - New Outpatient Order modal with patient/doctor selection, test/package multi-select, and live total calculation
  - Specimens tab with status transition controls, phlebotomist tracking, and rejection reason input
  - Results & Review tab with technician result entry, separation-of-duties review modal, and amendment support
  - Report actions: synthetic PDF generation, external upload, pathologist approval, secure release, and delivery link generation
- [x] Implemented Tests Catalog at `apps/web/app/(dashboard)/dashboard/laboratory/tests/page.tsx`:
  - Category and Test management, reference ranges, units, sample types, turnaround minutes, and base pricing
  - New Category and New Test modals
- [x] Implemented Reports Archive at `apps/web/app/(dashboard)/dashboard/laboratory/reports/page.tsx`:
  - Archived reports directory, download decrypted PDF, generate secure link, and instant one-click revocation
- [x] Implemented Patient Portal Lab Reports at `apps/web/app/(patient)/patient/reports/page.tsx`:
  - Released reports list, test summaries, and one-click PDF download
- [x] Implemented Public Token Verification & Download at `apps/web/app/reports/access/[token]/page.tsx`:
  - Patient identity verification (phone / DOB challenge)
  - Decrypted report viewing, download button, and access logging
- [x] Next.js 15 production build verified: all 32 routes compiled cleanly

### Automated Verification
- [x] 5 dedicated laboratory unit test suites: `laboratory-catalog.spec.ts`, `laboratory-order.spec.ts`, `laboratory-sample.spec.ts`, `laboratory-result-approval.spec.ts`, `laboratory-report-delivery.spec.ts` (29/29 tests passing)
- [x] Entire API test suite passing: 34/34 suites, 218/218 tests passing (100%)

---

## 📋 Phase 9 Execution Checklist (Complete & Verified)

### Database Schema & Security
- [x] Prisma models: `VoiceIntegration`, `VoiceCallSession`, `VoiceConversationMessage`, `VoiceCallEvent`, `VoiceProviderSettings`, `VoiceHandoverRecord`
- [x] Back-relations connected to `Organization`, `Clinic`, `UserProfile`, and `Patient`
- [x] Row Level Security (RLS) policies implemented for all 6 Phase 9 tables in `infrastructure/database/rls-policies.sql`
- [x] Generated Prisma Client v6.19.3 (`pnpm run db:generate`)

### Shared Packages & Validation
- [x] `@matabai/shared`: Enums (`VoiceProvider`, `CallDirection`, `CallStatus`, `VoiceHandoverStatus`, `VoiceSpeakerType`, `TelephonyEventType`, `SttProvider`, `TtsProvider`, `CallerVerificationStatus`, `VoiceTransferStatus`), permissions (`VOICE_READ`, `VOICE_WRITE`, `VOICE_MANAGE`), role matrix mappings, and entity interfaces
- [x] `@matabai/validation`: Zod schemas for voice integrations, voice settings, call queries, handover assignments, Twilio webhooks, and call simulation
- [x] Built packages cleanly with `pnpm run build:packages` (0 errors)

### Telephony Adapters & Security
- [x] `ITelephonyAdapter` interface: Welcome IVR, speech gather, dial transfer, say and hangup, webhook signature verification
- [x] `TwilioVoiceAdapter`: Production TwiML generator for Urdu (`ur-PK`), Pashto (`ps-AF`), English (`en-US`), Amazon Polly neural voice mapping, timing-safe HMAC-SHA1 `X-Twilio-Signature` verification
- [x] Strict Zero Fake Simulation: Unconfigured carrier credentials explicitly return `BLOCKED` status with Pakistan PTA regulatory trunking guidance

### Core Voice Services & Receptionist Engine
- [x] `VoiceCallSessionService`: Session lifecycle, caller identification, privacy verification status, message transcripts, and lifecycle event logging
- [x] `VoiceIvrService`: Trilingual IVR welcome prompt, DTMF (1, 2, 3, 0) and spoken language selection, automatic fallback
- [x] `VoiceAiReceptionistService`:
  - 100% Medical Advice Refusal: Administrative boundaries strictly preserved
  - Immediate Emergency Escalation: Immediate Rescue 1122 and hospital ER guidance
  - Conversational multi-turn appointment booking with explicit confirmation
  - Server tools execution via `AiToolsService` and automatic trigger of Phase 8 notification engine
  - Real-time digital queue token inquiries
- [x] `VoiceHandoverService`: TwiML `<Dial>` call transfer, conversation summary generation, staff in-app alert dispatch, and transfer completion tracking
- [x] `VoiceAnalyticsService`: Aggregated metrics (total calls, completion rate, average duration, language distribution, bookings, daily timeline)
- [x] `VoiceSimulatorService`: Interactive browser playground executing real NLU intents and backend tools without carrier hardware

### API Controllers & Webhooks
- [x] `/api/v1/webhooks/voice/incoming`: Root incoming call TwiML endpoint
- [x] `/api/v1/webhooks/voice/gather`: Handles DTMF & speech recognition returns
- [x] `/api/v1/webhooks/voice/transfer-status`: Receptionist dial completion callback
- [x] `/api/v1/webhooks/voice/status`: Call termination and audio duration callback
- [x] `/api/v1/voice/calls`: Paginated call logs with status and language filtering
- [x] `/api/v1/voice/calls/:id/transcript`: Complete conversational speech transcript
- [x] `/api/v1/voice/calls/:id/handover`: Manual receptionist transfer trigger
- [x] `/api/v1/voice/analytics`: Voice KPIs and call analytics
- [x] `/api/v1/voice/settings`: Clinic STT, TTS, IVR, and transfer configuration
- [x] `/api/v1/voice/integrations`: Carrier account SID and phone number setup
- [x] `/api/v1/voice/integrations/status`: Telephony readiness & PTA regulatory status
- [x] `/api/v1/voice/simulate`: Interactive browser simulator conversational turn

### Frontend Voice Assistant Dashboard
- [x] Extended `ApiClient.voice` in `apps/web/lib/api-client.ts`
- [x] Added `Voice Assistant` navigation item in `apps/web/app/(dashboard)/layout.tsx`
- [x] Implemented Voice Dashboard at `apps/web/app/(dashboard)/dashboard/voice-assistant/page.tsx`:
  - Carrier Readiness Status Banner (Twilio / Blocked notice / PTA regulatory trunking guidance)
  - 6 KPI metric cards (Total calls, Completed, Missed/Busy, Avg duration, Voice bookings, Handovers)
  - Call Logs table with status/language filtering and phone search
  - Transcript modal displaying conversation message bubbles and timestamps
  - Interactive Browser Voice Simulator with DTMF keypad, quick test scenarios (Emergency 1122, Medical Advice Refusal, Doctor Search, Appointment Booking, Queue Token, Receptionist Handover)
  - Telephony & IVR Settings tab (STT/TTS engines, voice speed, human transfer number, recording policy)
- [x] Next.js 15 production build verified: 31/31 routes compiled cleanly

### Automated Verification
- [x] 4 dedicated voice unit test suites: `twilio-voice.adapter.spec.ts`, `voice-ivr.spec.ts`, `voice-ai-receptionist.spec.ts`, `voice-handover.spec.ts` (22/22 tests passing)
- [x] Entire API test suite passing: 29/29 suites, 189/189 tests passing (100%)


---

## 📋 Phase 8 Execution Checklist (Complete & Verified)

### Database Schema & Security
- [x] Prisma models: `NotificationPreference`, `NotificationRule`, `NotificationTemplate`, `NotificationJob`, `NotificationAttempt`, `NotificationEvent`, `InAppNotification`
- [x] Back-relations connected to `Organization`, `Clinic`, `UserProfile`, and `Patient`
- [x] Row Level Security (RLS) policies implemented for all 7 Phase 8 tables in `infrastructure/database/rls-policies.sql`
- [x] Generated Prisma Client v6.19.3 (`pnpm run db:generate`)

### Shared Packages & Validation
- [x] `@matabai/shared`: Enums (`NotificationChannel`, `NotificationEventType`, `NotificationJobStatus`, `NotificationPriority`, `QuietHoursPolicy`, `FallbackPolicy`, `TemplateApprovalStatus`, `InAppCategory`, `NotificationConsentStatus`, `NotificationConsentSource`, `NotificationAttemptStatus`), permissions (`NOTIFICATION_READ`, `NOTIFICATION_WRITE`, `NOTIFICATION_MANAGE`, `NOTIFICATION_PREFERENCE_WRITE`), role matrix mappings, and entity interfaces
- [x] `@matabai/validation`: Zod schemas for preference CRUD & opt-out, notification rules, templates, job queries, retries, cancellations, and in-app notifications
- [x] Built packages cleanly with `pnpm run build:packages` (0 errors)

### Channel Adapters & Zero Fake Simulation
- [x] `ChannelAdapter` interface and delivery contract
- [x] `WhatsAppAdapter`: Dispatches via `WhatsAppOutboundService` / `MetaApiClient` (HSM templates or 24-hr session text)
- [x] `InAppAdapter`: Persistent in-app notifications for authenticated dashboard staff
- [x] `EmailAdapter`: Real integration checking `RESEND_API_KEY` or `SMTP_HOST`; returns explicit `EMAIL_PROVIDER_UNCONFIGURED` without fake delivery simulation
- [x] `SmsAdapter`: Real integration checking `TWILIO` credentials; returns explicit `SMS_PROVIDER_UNCONFIGURED` without fake delivery simulation

### Core Workflow & Dispatch Services
- [x] `NotificationTemplateService`: Multilingual rendering (EN, UR, PS) with variable interpolation, clinical safety sanitization, and preview endpoint
- [x] `NotificationPreferenceService`: Channel consent checks, WhatsApp keyword consent parser (`STOP`, `START`, etc.), and clinic timezone-based quiet hours evaluation
- [x] `NotificationRulesService`: Event rule resolution, priority, quiet hours policy (`ALLOW_IMMEDIATE`, `QUEUE_UNTIL_MORNING`, `SUPPRESS`), and fallback channels
- [x] `NotificationSchedulerService`:
  - Immediate confirmations on `APPOINTMENT_BOOKED` / `APPOINTMENT_CONFIRMED`
  - Future appointment reminders (-1440m, -120m) with past offset suppression
  - Invalidation: automatic cancellation of pending reminders on reschedule or cancellation
  - Queue notifications on `TOKEN_GENERATED`, `TOKEN_CALLED`, and `QUEUE_DELAYED`
  - Staff operational alerts broadcast to clinic admins and receptionists
- [x] `NotificationDispatcherService`: Atomic dispatch execution, consent/quiet-hours evaluation, channel dispatch, fallback routing, and attempt auditing
- [x] `NotificationRetryService`: Bounded exponential backoff with random jitter, transitioning to `DEAD_LETTER` upon exhausting `maxAttempts`
- [x] `NotificationWorkerService`: Background polling worker with atomic batch claiming and stale lock recovery

### API Controllers & Endpoints
- [x] `NotificationController`: `/api/v1/notifications` (list, get, analytics, retry, cancel)
- [x] `NotificationPreferenceController`: `/api/v1/notification-preferences` (get, save, opt-out)
- [x] `NotificationRuleController`: `/api/v1/notification-rules` (CRUD for clinic rules)
- [x] `NotificationTemplateController`: `/api/v1/notification-templates` (CRUD & live preview)
- [x] `InAppNotificationController`: `/api/v1/in-app-notifications` (list, unread count, mark read, mark all read)

### Frontend UI/UX
- [x] Added `ApiClient.notifications`, `ApiClient.notificationRules`, `ApiClient.notificationTemplates`, `ApiClient.notificationPreferences`, and `ApiClient.inApp`
- [x] Live unread count badge on the Dashboard topbar notification bell in `apps/web/app/(dashboard)/layout.tsx`
- [x] Notification Dashboard Page (`/dashboard/notifications`):
  - Overview KPI metrics: Total Messages, Dispatched, Delivery Rate %, Scheduled Reminders, Dead Letter / Failed, Suppressed
  - History & Delivery Log with channel/event/status filters, attempt audit modal, and retry action
  - Scheduled Reminders pipeline with cancel prompt
  - Dead-Letter / Failed Queue with Force Retry action
  - Rules & Quiet Hours management
  - Multilingual Templates directory & interactive live template preview tester
  - Staff In-App Feed with mark as read controls

### Verification & Testing
- [x] All 25 test suites (167 tests) passing at 100%
- [x] Frontend and backend typecheck clean (0 errors)
- [x] Next.js production build succeeded with all 30 routes built cleanly

---

## 📋 Phase 7 Execution Checklist (Complete & Verified)

### Database Schema & Security
- [x] Prisma models: `AiAssistantSettings`, `AiConversationState`, `AiInteractionLog`, `ClinicFaq`, `AiToolExecutionLog`
- [x] Multi-tenant RLS policies for all 5 Phase 7 tables in `infrastructure/database/rls-policies.sql`
- [x] Generated Prisma Client v6.19.3 (`pnpm run db:generate`)
- [x] Sandboxed execution: Zero arbitrary SQL or direct Prisma exposure to the model

### Multilingual NLU & Safety Guardrails
- [x] Linguistic coverage: English (`en`), Urdu Nastaliq (`ur`), Pashto script (`ps`), Roman Urdu (`ur-Latn`), Roman Pashto (`ps-Latn`)
- [x] Explicit language switching support ("Urdu please", "switch to English", "پښتو")
- [x] Medical Safety Guardrail: 100% refusal on clinical diagnosis, prescriptions, dosage, and lab reports
- [x] Emergency Escalation Protocol: Immediate localized advisory (Rescue 1122 & hospital ER) + automatic conversation handover on life-threatening symptoms
- [x] Explicit Confirmation Requirement: Booking is NEVER finalized without explicit confirmation ("YES" / "جی ہاں" / "هو") from the patient

### 11 Controlled Allowlisted Server Tools
- [x] `getClinicInformation`
- [x] `searchDoctors`
- [x] `getDoctorAvailability`
- [x] `createAppointment`
- [x] `getPatientAppointments`
- [x] `rescheduleAppointment`
- [x] `cancelAppointment`
- [x] `getPatientToken`
- [x] `getQueueStatus`
- [x] `searchClinicFaq`
- [x] `requestHumanHandover`
- [x] Full execution auditing in `ai_tool_execution_logs`

### Backend Services & REST API
- [x] `AIConversationManagerService`: Orchestrates conversation states, safety checks, multi-turn booking, queue inquiries, and outbound delivery
- [x] `AiConfigService`: Provider configuration, timeout, temperature, and cost estimation
- [x] `AiProviderClient`: Chat completions client with timeout, exponential backoff, and offline rule fallback
- [x] `AiAssistantController`: Settings, toggles, interactions, tool logs, usage statistics, health check, simulator
- [x] `AiFaqController` & `AiFaqService`: Multilingual FAQ CRUD with category filtering

### Frontend UI/UX
- [x] Added `ApiClient.ai` client SDK in `apps/web/lib/api-client.ts`
- [x] Added `AI Receptionist` navigation item in dashboard sidebar
- [x] Dashboard Page (`/dashboard/ai-assistant`):
  - Active/Paused master toggle
  - Assistant persona and capability settings
  - Multilingual FAQ manager modal and CRUD
  - Live interaction and tool invocation audit tables
  - Usage KPIs (interactions, tokens, latency, handover rate, cost)
  - Interactive WhatsApp AI Simulator Playground

### Verification & Testing
- [x] All 21 test suites (151 tests) passing at 100%
- [x] Frontend typecheck clean (0 errors)
- [x] Next.js production build succeeded with all 30 routes built cleanly

---

## 📋 Phase 6 Execution Checklist (Complete & Verified)

### Database & Security
- [x] Prisma models: `WhatsappIntegration`, `WhatsappContact`, `WhatsappConversation`, `WhatsappMessage`, `WhatsappWebhookEvent`, `WhatsappMessageTemplate`
- [x] Multi-tenant RLS policies for all 6 WhatsApp tables in `infrastructure/database/rls-policies.sql`
- [x] Generated Prisma Client v6.19.3 (`pnpm run db:generate`)
- [x] AES-256 encrypted permanent token storage (`access_token_encrypted`)
- [x] Webhook signature verification: HMAC-SHA256 with `crypto.timingSafeEqual` against `X-Hub-Signature-256`
- [x] Webhook event deduplication ledger preventing replay attacks and duplicate processing
- [x] Patient privacy: Zero diagnostic reports or clinical notes sent over WhatsApp

### Shared Packages & Validation
- [x] `@matabai/shared`: Enums (`WhatsAppConnectionStatus`, `WhatsAppConsentStatus`, `WhatsAppConversationStatus`, `WhatsAppMessageDirection`, `WhatsAppDeliveryStatus`, `WhatsAppWebhookStatus`, `WhatsAppTemplateStatus`, `WhatsAppTemplateCategory`), permissions (`CONVERSATION_READ`, `CONVERSATION_WRITE`, `WHATSAPP_MANAGE`), and entity interfaces
- [x] `@matabai/validation`: Zod schemas for integration settings, outbound text, outbound template, conversation status, receptionist claiming, and consent management
- [x] `pnpm run build:packages` passed cleanly with 0 errors

### Backend Modular Monolith
- [x] `MetaApiClient`: Official Meta Graph API v21.0 client with retry backoff for 429/5xx, timeouts, and sanitized error logging
- [x] `WhatsAppWebhookController`:
  - `GET /api/v1/webhooks/whatsapp` (hub.challenge handshake)
  - `POST /api/v1/webhooks/whatsapp` (HMAC-SHA256 verification, deduplication, 200 OK contract)
- [x] `WhatsAppInboundService`:
  - E.164 phone normalization, contact record creation, auto-patient linking
  - Keyword opt-out detection (`STOP`, `UNSUBSCRIBE`, etc.) -> `OPTED_OUT`
  - Keyword opt-in detection (`START`, `YES`, etc.) -> `OPTED_IN`
  - Keyword handover detection (`HUMAN`, `AGENT`, etc.) -> `HUMAN_HANDOVER`
  - Status updates processing (`sent`, `delivered`, `read`, `failed`)
- [x] `WhatsAppOutboundService`:
  - 24-hour customer service window enforcement (rejects free text after 24 hrs)
  - Approved template messaging permitted outside 24-hr window
  - Recipient opt-out policy enforcement
- [x] `WhatsAppConversationService` & `WhatsAppConversationController`:
  - List conversations with filters and pagination
  - Message thread retrieval
  - Receptionist claiming, resolve, reopen workflows
  - Manual consent updates
- [x] `WhatsAppIntegrationService` & `WhatsAppIntegrationController`:
  - Integration configuration and token encryption
  - Live health check endpoint against Meta Graph API
  - Pre-approved healthcare template management
- [x] `WhatsAppNotificationService`:
  - Appointment confirmation trigger
  - Queue token called trigger
  - Queue delay notice broadcast trigger

### Frontend Integration
- [x] `ApiClient.whatsapp`: Full typed API client in `apps/web/lib/api-client.ts`
- [x] Connected `/dashboard/conversations`:
  - Live Meta Cloud API connection health badge
  - Real-time conversation listing with "Handover (Priority)", "Open", and "Resolved" tabs
  - 24-hour service window indicator (active vs expired)
  - Message thread with delivery receipts (`SENT`, `DELIVERED`, `READ`, `FAILED`)
  - Dynamic composer: free-text in window, template picker outside window
  - Receptionist claiming, resolving, and reopening actions
  - Interactive patient opt-in / opt-out consent toggle

### Verification & Automated Testing
- [x] `webhook.spec.ts`: Webhook verification challenge, signature security, deduplication
- [x] `outbound.spec.ts`: 24-hr window enforcement, template messaging, opt-out policy
- [x] `handover.spec.ts`: Inbound keyword trigger, receptionist claim, resolve, reopen, consent
- [x] `notification.spec.ts`: Appointment and queue lifecycle triggers
- [x] 117 tests passing across monorepo (113 backend + 4 web) with 100% pass rate
- [x] `pnpm run typecheck` passed with 0 errors
- [x] `pnpm run lint` passed with 0 errors
- [x] `pnpm run build` passed with 0 errors (all packages, NestJS API, and Next.js 29 routes)

---

## 📋 Phase 5 Execution Checklist (Complete & Verified)

### Database & Security
- [x] Prisma models: `ClinicQueueSettings`, `ClinicQueueSession`, `QueueToken`, `QueueStatusHistory`
- [x] Multi-tenant RLS policies for all 4 queue tables in `infrastructure/database/rls-policies.sql`
- [x] Generated Prisma Client v6.19.3 (`pnpm run db:generate`)
- [x] Unique compound index `[queue_settings_id, session_date]` preventing duplicate sessions
- [x] Concurrency safety: Server-side interactive `$transaction` for token number increments and status transitions
- [x] Duplicate active token prevention for appointments and walk-in patients
- [x] Public privacy protection: High-entropy revocable `public_queue_id` without exposing internal UUIDs or patient records

### Shared Packages & Validation
- [x] `@matabai/shared`: Enums (`QueueSessionStatus`, `QueueTokenStatus`, `TokenPriorityType`, `VALID_QUEUE_TOKEN_TRANSITIONS`, `VALID_QUEUE_SESSION_TRANSITIONS`) and interfaces (`ClinicQueueSettings`, `ClinicQueueSession`, `QueueToken`, `QueueStatusHistory`, `PublicQueueDisplay`, `QueueStats`)
- [x] `@matabai/validation`: Zod schemas for queue settings CRUD, queue sessions CRUD, appointment check-in, walk-in check-in, token operational actions, and priority assignment
- [x] `pnpm run build:packages` passed cleanly with 0 errors

### Backend Modular Monolith
- [x] `QueueSettingsService` & `QueueSettingsController`:
  - `GET /api/v1/queue/settings` (list settings, auto-initialization fallback)
  - `POST /api/v1/queue/settings` (create queue settings)
  - `PATCH /api/v1/queue/settings/:id` (update queue settings)
  - `POST /api/v1/queue/settings/:id/regenerate-public-key` (rotate public display key)
- [x] `QueueSessionService` & `QueueSessionController`:
  - `GET /api/v1/queue/sessions`
  - `POST /api/v1/queue/sessions` (session initialization)
  - `GET /api/v1/queue/sessions/:id` (session stats and active called/serving token)
  - `POST /api/v1/queue/sessions/:id/start`, `pause`, `resume`, `close`
- [x] `QueueTokenService` & `QueueTokenController`:
  - `POST /api/v1/queue/check-in/appointment` (appointment check-in with validation)
  - `POST /api/v1/queue/check-in/walk-in` (walk-in check-in with capacity check)
  - `GET /api/v1/queue/tokens`
  - `GET /api/v1/queue/tokens/:id`
  - `POST /api/v1/queue/sessions/:id/call-next` (atomic FIFO calling with priority override, auto-skips unserved patient)
  - `POST /api/v1/queue/tokens/:id/recall`
  - `POST /api/v1/queue/tokens/:id/start-serving` (CALLED -> SERVING)
  - `POST /api/v1/queue/tokens/:id/complete` (SERVING -> COMPLETED, completes appointment)
  - `POST /api/v1/queue/tokens/:id/skip` (CALLED/WAITING -> SKIPPED)
  - `POST /api/v1/queue/tokens/:id/restore` (SKIPPED -> WAITING)
  - `POST /api/v1/queue/tokens/:id/no-show`
  - `POST /api/v1/queue/tokens/:id/cancel`
  - `POST /api/v1/queue/tokens/:id/priority` (updates priority and recalculates queue positions)
- [x] `PatientQueueController`:
  - `GET /api/v1/patient/tokens`
  - `GET /api/v1/patient/tokens/:id` (live progress, patients ahead, doctor room, estimated wait)
- [x] `PublicQueueController`:
  - `GET /api/v1/public/queues/:publicQueueId` (privacy-safe waiting room display, 0 patient personal data)
- [x] `QueueRealtimeService`:
  - In-memory event bus broadcasting real-time queue transitions scoped by session and clinic

### Automated Tests & Verification
- [x] `apps/api/src/modules/queue/queue-token.spec.ts`: 7/7 tests passed (atomic generation, appointment check-in, duplicate prevention, priority ordering, transitions, skip/restore)
- [x] `apps/api/src/modules/queue/queue-session.spec.ts`: 6/6 tests passed (session lifecycle, duplicate session prevention, pause/resume, close guard)
- [x] `apps/api/src/modules/queue/public-queue.spec.ts`: 3/3 tests passed (privacy guarantee, disabled display rejection, 404 for invalid key)
- [x] All 13 backend test suites: **87 tests passed 100%** (0 failures)
- [x] Web test suite: **4 tests passed 100%** (0 failures)
- [x] Total automated tests: **91 tests passed 100%**
- [x] Full monorepo typecheck: `pnpm run typecheck` **100% clean** (0 errors)
- [x] Full monorepo lint: `pnpm run lint` **100% clean** (0 errors)
- [x] NestJS API build: `pnpm run build:api` **Successful** (`dist/main.js`)
- [x] Next.js Web build: `pnpm run build:web` **Successful** (29 static + dynamic `/queue/[publicQueueId]` generated)

### Frontend Integration
- [x] Updated `apps/web/lib/api-client.ts` with complete real endpoints for queue settings, sessions, tokens, patient tokens, and public queue
- [x] Connected Receptionist Queue Dashboard (`/dashboard/queue`):
  - Session status bar (Active, Paused, Closed) with Start / Pause / Resume / Close controls
  - Hero Now Serving / Active Called Card with Call Next, Recall, Start Serving, Complete Consultation, Skip
  - 4 Live Queue Stats cards (Waiting, In Consultation, Completed, Skipped)
  - Patient Check-In Dialog: Tab 1 (Appointment check-in) & Tab 2 (Walk-in check-in with priority & notes)
  - Waiting Queue Table with deterministic position numbers, priority badges, and quick actions
  - Skipped Queue Table with one-click "Restore to Queue"
  - Completed Consultations Table
  - Direct shortcut button to open Public Waiting Room Display
- [x] Connected Patient Token Tracker (`/patient/tokens`):
  - Real-time token display, live calling pulse banner ("NOW CALLING YOUR TOKEN!"), patients ahead, estimated wait time, doctor/clinic room info
- [x] Created Public Waiting Room Display (`/queue/[publicQueueId]`):
  - Full-screen TV waiting room monitor mode
  - Large Now Calling/Serving token display
  - Recently called tokens ticker
  - Live clock and waiting stats
  - Auto-refresh every 5s with live pulse
  - Strict privacy: zero patient names, phones, or private data displayed

---

## 📋 Phase 11 Execution Checklist (Complete & Verified)

### Database Schema & Security
- [x] 12 Prisma models created: `Invoice`, `InvoiceItem`, `Payment`, `PaymentAllocation`, `Refund`, `FinancialAdjustment`, `ExpenseCategory`, `Expense`, `CashRegisterSession`, `CashRegisterTransaction`, `PaymentWebhookEvent`, `FinancialAuditLog`
- [x] Wired back-relations to `Organization`, `Clinic`, `UserProfile`, `Patient`, `Appointment`, and `LaboratoryOrder`
- [x] Implemented multi-tenant Row Level Security (RLS) policies for all 12 tables in `infrastructure/database/rls-policies.sql`
- [x] Generated Prisma Client v6.19.3 (`pnpm run db:generate`)

### Shared Packages & Validation
- [x] `@matabai/shared`: Added role `ACCOUNTANT`, permissions (`FINANCE_READ`, `FINANCE_WRITE`, `FINANCE_MANAGE`, `FINANCE_REFUND`, `FINANCE_EXPENSE`, `FINANCE_CLOSE`), updated `ROLE_PERMISSIONS` matrix, enums (`InvoiceStatus`, `PaymentStatus`, `PaymentMethod`, `PaymentProvider`, `RefundStatus`, `InvoiceItemType`, `ExpenseStatus`, `CashSessionStatus`, `CashTransactionType`, `FinancialAdjustmentType`), and TypeScript entity interfaces
- [x] `@matabai/validation`: Zod schemas for invoice creation, payments, refunds, expenses, cash register shifts, and manual reconciliation with strict integer minor units
- [x] Packages built cleanly (`pnpm run build:packages`)

### Financial Core Services & Adapters
- [x] `InvoiceService`: Sequential reference (`INV-YYYYMM-XXXX`), integer minor units standard (1 PKR = 100 paisa), immutable price snapshots, cancellation guard, Phase 8 notifications
- [x] `PaymentService`: Sequential reference (`PAY-YYYYMM-XXXX`), atomic `prisma.$transaction`, overpayment prevention, multi-tender payment allocations, automatic cash drawer integration, idempotency key deduplication
- [x] `RefundService`: Sequential reference (`REF-YYYYMM-XXXX`), two-stage review workflow, strict separation of duties (`reviewerId !== requestedById`), automatic invoice balance rollback, Phase 8 notifications
- [x] `ExpenseService`: Clinic expenditure voucher tracking (`EXP-YYYYMM-XXXX`), configurable categories, cash drawer outflow integration
- [x] `CashRegisterService`: Front-desk shift drawer sessions (`CRS-YYYYMM-XXXX`), opening float, expected closing math, physical counted cash discrepancy enforcement, audit reopening locks
- [x] `ReconciliationService`: Multi-source automated & manual bank reconciliation, duplicate bank reference detection, discrepancy resolution
- [x] `FinancialAnalyticsService`: Revenue, collections, expenses, net operating balance, aging buckets (0–30, 31–60, 61+), tender breakdown
- [x] `ReceiptService`: ESC/POS 80mm thermal receipt HTML layout, official A4 invoice HTML layout, and on-the-fly synthetic PDF streamer
- [x] `FinancialAuditService`: Immutable append-only audit ledger for all financial operations
- [x] `RaastPaymentAdapter`: State Bank of Pakistan (SBP) Raast P2M EMVCo PKQR generator, returns explicit `BLOCKED` with regulatory onboarding instructions when unconfigured
- [x] `CardPaymentAdapter`: Safepay/PayMob/Stripe aggregator client, timing-safe HMAC SHA-256 webhook signature verification, returns explicit `BLOCKED` when unconfigured
- [x] `BankTransferAdapter`: Clinic IBAN validation and bank wire instructions

### Controllers & Endpoints
- [x] `/api/v1/finance/invoices`: Paginated invoice list, create draft, get invoice, issue invoice, cancel invoice with reason, print A4 HTML, stream PDF
- [x] `/api/v1/finance/payments`: Collect payment with atomic allocations, list payments, get payment, get 80mm thermal receipt, payment gateway status
- [x] `/api/v1/finance/refunds`: Request refund, review refund (approve/reject), list refunds
- [x] `/api/v1/finance/expenses`: Create expense, update, review, list expenses, list/create expense categories
- [x] `/api/v1/finance/cash-register`: Get active shift, open shift, close shift with discrepancy explanation, reopen shift, list sessions
- [x] `/api/v1/finance/analytics`: High-level financial KPIs, revenue vs expense, tender distributions
- [x] `/api/v1/finance/reconciliation`: Run multi-source reconciliation, manual bank deposit matching
- [x] `/api/v1/patient/finance`: Patient portal endpoints: get invoices, get payments, download PDF invoices, view receipts
- [x] `/api/v1/webhooks/payments/raast` & `/card`: Webhook endpoints with signature verification and event logging

### Frontend Interfaces
- [x] Operations Dashboard (`/dashboard/finance`): 8 KPI cards, 7 functional tabs (Invoices, Payments, Refunds, Expenses, Cash Register, Reconciliation, Analytics), 10 interactive action modals, live gateway status badges
- [x] Patient Invoices Portal (`/patient/invoices`): Balance overview cards, invoice table with line item details modal, payment receipts table, one-click A4 PDF downloads, SBP/PTA compliant payment guidance modal
- [x] Navigation: Added Billing & Finance links to dashboard layout and patient portal layout

### Automated Tests & Monorepo Verification
- [x] 6 dedicated finance test suites (31 unit tests):
  - `finance-invoice.spec.ts` (6 tests)
  - `finance-payment.spec.ts` (5 tests)
  - `finance-refund.spec.ts` (4 tests)
  - `finance-cash-register.spec.ts` (6 tests)
  - `finance-reconciliation.spec.ts` (4 tests)
  - `finance-adapter.spec.ts` (6 tests)
- [x] Full backend test suite: **40/40 test suites passing, 249/249 unit tests passing (100%)**
- [x] Next.js production build: `pnpm --filter @matabai/web build` passed with 0 errors (all 34 static and dynamic routes generated)


---

## 📋 Phase 12 Execution Checklist (Complete & Verified)

### Database Schema & Security
- [x] 12 Prisma models created: `ClinicalEncounter`, `EncounterStatusHistory`, `ClinicalNote`, `PatientMedicalHistory`, `PatientObservation`, `EncounterDiagnosis`, `Prescription`, `PrescriptionItem`, `PrescriptionAmendment`, `EncounterFollowup`, `EncounterAmendment`, `ClinicalDocumentVersion`
- [x] Wired back-relations to `Organization`, `Clinic`, `Doctor`, `Patient`, `Appointment`, `QueueToken`, `LaboratoryOrder` (`encounterId`), and `Invoice` (`encounterId`)
- [x] Implemented multi-tenant Row Level Security (RLS) policies for all 12 tables in `infrastructure/database/rls-policies.sql`
- [x] Generated Prisma Client v6.19.3 (`pnpm run db:generate`)

### Shared Packages & Validation
- [x] `@matabai/shared`: Added permissions (`ENCOUNTER_READ`, `ENCOUNTER_WRITE`, `ENCOUNTER_MANAGE`, `ENCOUNTER_FINALIZE`, `ENCOUNTER_AMEND`, `PRESCRIPTION_READ`, `PRESCRIPTION_WRITE`, `PRESCRIPTION_MANAGE`), updated `ROLE_PERMISSIONS` matrix, enums (`EncounterStatus`, `EncounterSource`, `EncounterType`, `DiagnosisType`, `DiagnosisStatus`, `PrescriptionStatus`, `FollowupStatus`), and TypeScript entity interfaces
- [x] `@matabai/validation`: Zod schemas for encounters, clinical notes, patient medical background, observations (vitals), diagnoses, prescriptions, amendments, and follow-ups
- [x] Shared packages built cleanly (`pnpm run build:packages`)

### Clinical Core Services
- [x] `EncounterService`: Sequential reference (`ENC-YYYYMM-XXXX`), appointment duplicate active encounter guard, atomic appointment/queue token sync, status transitions, doctor reassignment with status history, doctor finalization with document snapshot (`ClinicalDocumentVersion`), and audited amendment ledger (`EncounterAmendment`)
- [x] `ClinicalNoteService`: Chief complaint, symptoms, visit purpose, examination findings, assessment, and treatment plan with finalization edit lock
- [x] `PatientMedicalHistoryService`: Longitudinal conditions, surgeries, allergies, family/social history, and current medications
- [x] `ObservationService`: Vitals recording, input range validation, strict conditional BMI calculation ($weight / (height/100)^2$)
- [x] `DiagnosisService`: Manual physician-entered primary/secondary diagnoses, coding systems (ICD-10/Custom), clinical status, and finalization lock
- [x] `PrescriptionService`: Sequential reference (`RX-YYYYMM-XXXX`), medication items, versioning, amendment ledger with snapshot retention, cancellation, and official printable prescription HTML generator
- [x] `FollowupService`: Doctor-recommended return visits, appointment linking, and query
- [x] `PatientClinicalHistoryService`: Complete longitudinal EMR-Lite chart aggregation and patient-facing sanitized consultation history

### API Controllers & Endpoints
- [x] `/api/v1/encounters`: Create encounter, list encounters with multi-dimensional filters, get encounter, update status, reassign doctor, cancel encounter, finalize encounter (locked), amend finalized encounter
- [x] `/api/v1/encounters/:id/notes`: Save clinical notes, get notes
- [x] `/api/v1/encounters/observations`: Record vitals, get observations for encounter
- [x] `/api/v1/encounters/:id/diagnoses`: Add diagnosis, list diagnoses, update diagnosis, delete diagnosis
- [x] `/api/v1/prescriptions`: Create prescription, list prescriptions, get prescription, amend prescription, cancel prescription, print prescription HTML
- [x] `/api/v1/encounters/:id/followups`: Create follow-up recommendation, update follow-up status, list follow-ups
- [x] `/api/v1/patients/:id/clinical-history`: Longitudinal EMR-Lite chart aggregation
- [x] `/api/v1/patients/:id/medical-history`: Get and save patient medical background
- [x] `/api/v1/patients/:id/observations`: Historical vitals for patient
- [x] `/api/v1/patient/clinical/encounters`: Patient portal self-view of consultations
- [x] `/api/v1/patient/clinical/prescriptions`: Patient portal self-view of active prescriptions

### Frontend Interfaces & Navigation
- [x] Encounters Registry (`/dashboard/encounters`): Status filter tabs, search, metrics overview, "Start New Consultation" modal with clinic/doctor/patient pickers
- [x] Clinical Consultation Workspace (`/dashboard/encounters/[id]`): 7-tab consultation workspace (Clinical Notes, Vitals & Live BMI, Diagnoses, Prescriptions with printable Rx layout, Phase 10 Lab Orders, Phase 11 Invoices, Document Versions & Audit Ledger), Finalize consultation modal, and Amendment modal
- [x] Prescriptions Registry (`/dashboard/prescriptions`): Prescription archive, status filters, printable modal preview
- [x] Follow-ups Board (`/dashboard/follow-ups`): Recommended follow-up tracking and status updates
- [x] Patient EMR-Lite Chart (`/dashboard/patients/[id]/clinical-history`): Longitudinal history, allergies alert banner, chronic conditions, visit timeline, vitals trends
- [x] Patient Consultation Portal (`/patient/encounters`): Patient-facing consultation summary cards, doctor details, diagnosis summaries, and medication instructions
- [x] Navigation: Added Encounters, Prescriptions, Follow-ups to dashboard layout, and Consultations to patient portal layout

### Automated Tests & Monorepo Verification
- [x] 5 dedicated clinical test suites (23 unit tests):
  - `encounter-lifecycle.spec.ts`: Sequential numbering, appointment duplicate prevention, atomic appointment/queue sync, status transitions, doctor reassignment
  - `clinical-notes-observations.spec.ts`: Notes save, finalization edit lock, vitals range checks, strict conditional BMI calculation
  - `diagnosis-prescription.spec.ts`: Primary/secondary diagnoses, sequential `RX-YYYYMM-XXXX`, item creation, amendment ledger with version increment, cancellation
  - `encounter-finalization-amendment.spec.ts`: Doctor confirmation check, mandatory chief complaint, immutable document snapshot, locked state, audited amendments
  - `followup-integrations.spec.ts`: Follow-up scheduling, longitudinal chart aggregation, patient-facing sanitized consultations
- [x] Backend test suite: **100% passing (23/23 tests in Phase 12)**
- [x] Next.js production build: `pnpm --filter @matabai/web build` passed with 0 errors (**all 38 routes generated**)
- [x] NestJS API build: `pnpm --filter @matabai/api build` passed with 0 errors


---

## Phase 13: Advanced Analytics, Business Intelligence & Executive Reporting — VERIFIED

### Database Schema & Security
- [x] 5 new operational analytics models in Prisma schema:
  - `SavedReportConfiguration`: Custom report presets with category, dimensions, metrics, filters, and grouping
  - `ScheduledReport`: Automated recurring report schedules (DAILY, WEEKLY, MONTHLY)
  - `ScheduledReportRun`: Execution history, duration, delivery tracking, and failure reasons
  - `AnalyticsExportLog`: Audit log of report downloads and exports (PDF, CSV, XLSX)
  - `AnalyticsAccessLog`: Access audit trail for sensitive executive dashboards
- [x] Complete Row-Level Security (RLS) policies in `infrastructure/database/rls-policies.sql`
- [x] Prisma Client v6.19.3 regenerated cleanly

### Shared Contracts & Validation
- [x] Permissions: `ANALYTICS_READ`, `ANALYTICS_MANAGE`, `REPORT_BUILD`, `REPORT_EXPORT`, `SCHEDULED_REPORT_MANAGE`
- [x] Role-Permission Matrix updated for all clinic roles (`SUPER_ADMIN`, `CLINIC_ADMIN`, `ACCOUNTANT`, `DOCTOR`, `RECEPTIONIST`, `LAB_STAFF`, `LAB_REVIEWER`, `LAB_MANAGER`)
- [x] Domain types and interfaces: `ExecutiveDashboardMetrics`, `AppointmentAnalytics`, `QueueAnalytics`, `PatientAnalytics`, `DoctorStaffAnalytics`, `LaboratoryAnalyticsData`, `FinancialAnalyticsSummary`, `CommunicationAnalytics`, `AIUsageAnalytics`, `SavedReportConfiguration`, `ScheduledReport`, `ScheduledReportRun`, `ReportQueryResult`
- [x] Zod validation schemas: `analyticsFilterSchema`, `saveReportConfigurationSchema`, `updateReportConfigurationSchema`, `runReportQuerySchema`, `exportReportSchema`, `createScheduledReportSchema`, `updateScheduledReportSchema`

### Backend Services & Architecture
- [x] `AnalyticsTimeHelper`: Dynamic date range resolution (`today`, `7d`, `30d`, `90d`, `this_month`, `last_month`, `this_year`, `custom`), equivalent previous comparison windows, and delta percentage/trend computation
- [x] `DashboardService`: Authoritative multi-domain executive KPI metrics (Appointments, Patients, Clinical encounters, Laboratory, Finance in minor units, WhatsApp, Voice calls, AI interactions) with period comparison
- [x] `AppointmentAnalyticsService`: Completion/cancellation/no-show rates, rescheduling, lead times, specialty and doctor demand, peak booking hours
- [x] `QueueAnalyticsService`: Average and median waiting times, service durations, explicit sample size reporting, doctor queue throughput, clinic queue efficiency
- [x] `PatientAnalyticsService`: Lifetime registrations, new registrations, returning cohort, active engagement, appointment-to-encounter conversion, visit frequency distribution (zero PII exposure)
- [x] `DoctorStaffAnalyticsService`: Physician workload metrics, consultation durations, follow-ups, and lab orders (non-discriminatory capacity planning)
- [x] `LaboratoryAnalyticsService`: Test orders, sample collection volume, rejection rate, recollection rate, average turnaround hours, reports released vs pending, and lab revenue in paisa
- [x] `FinancialAnalyticsService`: Invoiced amount, confirmed payment collections, outstanding receivables, refunds, operating expenses, net operating balance, cash register collections, tender distribution, and revenue streams
- [x] `CommunicationAnalyticsService`: WhatsApp delivery success rates, Voice IVR call volumes, answered rates, call durations, and languages
- [x] `ReportBuilderService`: Parameterized report query runner and saved report presets CRUD
- [x] `ReportExportService`: Formula injection defense (sanitizing `=`, `+`, `-`, `@`, `\t`, `\r` prefixes), UTF-8 BOM CSV, XML/XLSX, and PDF generators with audit logging
- [x] `ScheduledReportService`: Recurring report scheduler, automated/manual execution runner, delivery tracking, and next run calculation

### API Endpoints
- [x] `GET /api/v1/analytics/dashboard`: Multi-domain executive KPIs
- [x] `GET /api/v1/analytics/appointments`: Scheduling and cancellation rates
- [x] `GET /api/v1/analytics/queue`: Queue waiting and service times
- [x] `GET /api/v1/analytics/patients`: Cohort trends and visit frequency
- [x] `GET /api/v1/analytics/staff`: Doctor and clinical staff workloads
- [x] `GET /api/v1/analytics/laboratory`: Diagnostic orders and turnaround times
- [x] `GET /api/v1/analytics/finance`: Invoiced, collected, receivables, expenses
- [x] `GET /api/v1/analytics/communications`: WhatsApp delivery and Voice telephony
- [x] `GET /api/v1/analytics/ai-usage`: Multilingual AI turns, tool execution, tokens
- [x] `POST /api/v1/analytics/reports/query`: Safe parameterized query runner
- [x] `POST /api/v1/analytics/reports/export`: Formula-safe report file streaming
- [x] `GET|POST|PATCH|DELETE /api/v1/analytics/reports/configurations`: Preset configurations
- [x] `GET|POST|PATCH|DELETE /api/v1/analytics/reports/scheduled`: Automated delivery schedules
- [x] `POST /api/v1/analytics/reports/scheduled/:id/run`: Immediate schedule execution

### Frontend Dashboards & Navigation
- [x] Executive Dashboard (`/dashboard/analytics`): Multi-domain KPI cards with trend badges, period selector, clinic selector, quick export, and domain drill-down navigation
- [x] Appointments Analytics (`/dashboard/analytics/appointments`): Rates, demand by doctor, demand by specialty, peak booking hours heatmap
- [x] Queue & Wait Times (`/dashboard/analytics/queue`): Average & median wait times with sample size indicators, doctor throughput, clinic efficiency
- [x] Patient Cohorts (`/dashboard/analytics/patients`): Registration trends, returning cohort, visit frequency distribution (zero PII)
- [x] Staff Workload (`/dashboard/analytics/staff`): Comprehensive physician operational throughput table
- [x] Diagnostic Laboratory (`/dashboard/analytics/laboratory`): Order volumes, turnaround time, specimen rejection rate, test categories, revenue
- [x] Financial Reconciliation (`/dashboard/analytics/finance`): Invoiced, collected, receivables, expenses, net operating balance, tender breakdown
- [x] Communications (`/dashboard/analytics/communications`): WhatsApp delivery tracking, Voice telephony calls, language distribution
- [x] AI Receptionist Telemetry (`/dashboard/analytics/ai-usage`): Intent classification, tool reliability, booking conversion, token and cost telemetry
- [x] Custom Report Builder & Schedules (`/dashboard/analytics/reports`): Parameterized query runner, results table, formula-safe exports, saved configurations, recurring schedule automation
- [x] Sidebar Navigation: Added "Analytics & BI" and "Report Builder" links to dashboard layout; `/dashboard/reports` redirects to `/dashboard/analytics`

### Automated Tests & Verification
- [x] 5 dedicated analytics test suites (15 tests, 100% passing):
  - `analytics-kpi-dashboard.spec.ts`: Date range resolution, KPI deltas, period comparisons, audit access logging
  - `appointment-queue-analytics.spec.ts`: Rates, peak hours, exact average & median wait times, sample size indicators
  - `financial-laboratory-analytics.spec.ts`: Integer paisa reconciliation, receivables math, lab rejection rates, turnaround hours
  - `communication-ai-analytics.spec.ts`: WhatsApp delivery success rates, Voice IVR metrics, AI tool reliability, token costs
  - `report-builder-export.spec.ts`: Formula injection protection (`=`, `+`, `-`, `@`), UTF-8 BOM CSV, scheduled report execution
- [x] Full repository test suite: **50 / 50 test suites passed (100%), 287 / 287 tests passing**
- [x] NestJS API build: `pnpm --filter @matabai/api build` passed with exit code 0
- [x] Next.js web build: `pnpm --filter @matabai/web build` passed with exit code 0 (**all 48 routes compiled**)

---

## Phase 14: SaaS Subscription Management, Tenant Onboarding & Platform Administration — VERIFIED

### Database Schema & Security
- [x] 15 new SaaS subscription and platform models in Prisma schema:
  - `SubscriptionPlan`: Master plan definitions (code, name, tier, trial duration)
  - `SubscriptionPlanVersion`: Immutable versioned pricing in paisa (`monthlyPricePaisa`, `annualPricePaisa`)
  - `PlanEntitlement`: Per-version feature quotas and boolean switches
  - `TenantSubscription`: Primary tenant subscription state machine, dates, grace periods
  - `SubscriptionStatusHistory`: State transition audit trail with actor and reason
  - `SubscriptionInvoice`: SaaS platform invoices (`SUB-YYYYMM-XXXX`) in integer paisa
  - `SubscriptionInvoiceItem`: Itemized charges (`PLAN_FEE`, `ADDON`, `OVERAGE`, `DISCOUNT`, `TAX`, `PRORATION_CREDIT`)
  - `SubscriptionPayment`: SaaS platform collections (`SPAY-YYYYMM-XXXX`)
  - `SubscriptionPaymentEvent`: Payment lifecycle audit records
  - `TenantEntitlementOverride`: Granular Super-Admin custom limits and expiry dates
  - `UsageEvent`: Idempotent telemetry events (`whatsapp_msg`, `voice_min`, etc.)
  - `UsagePeriodSummary`: Rolling monthly telemetry rollups
  - `TrialRecord`: Anti-abuse free trial enforcement per organization
  - `PromotionalCredit`: Super-Admin issued promotional balances in paisa
  - `PlatformAdminAuditLog`: Immutable audit trail for all Super-Admin operations
- [x] Complete Row-Level Security (RLS) policies implemented for all 15 Phase 14 tables in `infrastructure/database/rls-policies.sql`
- [x] Regenerated Prisma Client v6.19.3 (`pnpm db:generate`)

### Shared Packages & Validation
- [x] `@matabai/shared`:
  - Enums: `SubscriptionStatus` (8 states), `BillingInterval` (MONTHLY, ANNUAL), `SaasInvoiceStatus` (5 states), `SaasPaymentStatus` (5 states), `SaasPaymentMethod` (BANK_TRANSFER, CARD, WALLET, PROMOTIONAL_CREDIT), `FeatureCode` (19 granular flags), `SaasInvoiceItemType`, `ClinicType`, `TrialStatus`
  - Permissions: `PLATFORM_MANAGE`, `SUBSCRIPTION_READ`, `SUBSCRIPTION_MANAGE`, `SAAS_BILLING_READ`, `SAAS_BILLING_PAY`, `USAGE_READ`
  - Role-Permission Matrix: Updated for all roles including `SUPER_ADMIN` with platform governance
  - Event types: Added 8 subscription events to `NotificationEventType` (`SUBSCRIPTION_WELCOME`, `TRIAL_STARTED`, `SUBSCRIPTION_ACTIVATED`, `SUBSCRIPTION_UPGRADED`, `SAAS_INVOICE_ISSUED`, `TRIAL_EXPIRING_SOON`, `PAYMENT_RECEIVED`, `SUBSCRIPTION_SUSPENDED`)
  - Domain interfaces: Full TypeScript definitions for all 15 models, summaries, and DTOs
- [x] `@matabai/validation`: Zod schemas for clinic registration, onboarding, plan management, overrides, manual bank transfer payments, gateway verifications, upgrade/downgrade requests, and usage records
- [x] Built shared packages cleanly with `pnpm run build:packages` (0 errors)

### Backend Services & Architecture (`apps/api/src/modules/saas/`)
- [x] `PlanService`: Plan definitions, versioning, default seeding of `STARTER`, `PROFESSIONAL`, and `LABORATORY`
- [x] `EntitlementService`: Centralized evaluation of plan features, limits, super-admin overrides, and grace periods
- [x] `UsageMeteringService`: Idempotent usage recording, rolling period rollups, quota threshold tracking, and dashboard telemetry
- [x] `SubscriptionLifecycleService`: 14-day trial startup, activation upon payment, upgrades with prorated credit, downgrades with capacity validation, cancellation, reactivation, and automated expiration worker
- [x] `SaasBillingService`: Sequential `SUB-YYYYMM-XXXX` invoice generation in integer paisa, discounts, and printable HTML receipt
- [x] `SaasPaymentService`: `SPAY-YYYYMM-XXXX` payments, manual bank transfer submission, Super-Admin verification & auto-activation, Safepay card gateway adapter
- [x] `TenantOnboardingService`: Transaction-safe clinic self-registration, user provisioning, trial activation, and onboarding checklist
- [x] `PlatformAdminService`: Platform KPI aggregation (MRR, ARR, active subscribers, churn rate), tenant suspension/reactivation/extension, and audit logging
- [x] `EntitlementGuard`: Backend guard enforcing feature permissions across API routes
- [x] Extended `NotificationSchedulerService` with `scheduleSubscriptionNotification` for Phase 8 automated alerts

### API Endpoints
- [x] Clinic Registration & Onboarding:
  - `POST /api/v1/onboarding/register`: Public clinic self-registration & trial provisioning
  - `GET /api/v1/onboarding/status`: Tenant onboarding checklist state
  - `POST /api/v1/onboarding/complete`: Guided onboarding finalization
- [x] Clinic Subscription Management:
  - `GET /api/v1/subscription`: Active subscription status and entitlements
  - `GET /api/v1/subscription/plans`: Public and tenant plan tier directory
  - `GET /api/v1/subscription/usage`: Metered telemetry and quota percentages
  - `POST /api/v1/subscription/upgrade`: Plan upgrade with prorated credit
  - `POST /api/v1/subscription/downgrade`: Plan downgrade with capacity check
  - `POST /api/v1/subscription/cancel`: Voluntary cancellation
  - `POST /api/v1/subscription/reactivate`: Subscription reactivation
  - `GET /api/v1/subscription/invoices`: Tenant SaaS invoices
  - `POST /api/v1/subscription/invoices/:id/pay`: Submit manual bank transfer or online payment
- [x] Super-Admin Platform Administration:
  - `GET /api/v1/platform/overview`: Platform MRR, ARR, tenant counts, churn metrics
  - `GET /api/v1/platform/tenants`: Directory of all platform clinics
  - `POST /api/v1/platform/tenants/:id/action`: Suspend, reactivate, or extend trial
  - `POST /api/v1/platform/tenants/:id/override`: Custom feature quota override
  - `POST /api/v1/platform/tenants/:id/promotional-credit`: Issue promotional balance
  - `GET /api/v1/platform/plans`: All plans and versioned pricing
  - `POST /api/v1/platform/plans`: Create new subscription plan
  - `PATCH /api/v1/platform/plans/:id`: Update plan and publish new version
  - `GET /api/v1/platform/payments`: Review queue of bank transfer submissions
  - `POST /api/v1/platform/payments/:id/verify`: Approve transfer, settle invoice, activate subscription
  - `POST /api/v1/platform/payments/:id/reject`: Reject invalid bank slip
  - `GET /api/v1/platform/invoices`: Global SaaS invoices directory
  - `GET /api/v1/platform/audit-logs`: Super-Admin governance audit trail

### Frontend Dashboards & Navigation
- [x] Public Self-Registration (`/register/clinic`): Multi-step registration wizard with plan selection, clinic details, and trial activation
- [x] Guided Setup Wizard (`/onboarding`): 3-step setup (provisioning confirmation, operating hours, staff invitations)
- [x] Clinic Subscription Overview (`/dashboard/subscription`): Active tier badge, period dates, cancel/reactivate actions, renewal countdown
- [x] Plan Comparison & Upgrade/Downgrade (`/dashboard/subscription/plans`): Monthly/Annual billing interval toggle, feature matrix, prorated upgrade confirmation, capacity-checked downgrade
- [x] Invoices & Payment Portal (`/dashboard/subscription/invoices`): SaaS invoices list, printable receipts, manual bank transfer deposit submission modal with slip details
- [x] Metered Usage Telemetry (`/dashboard/subscription/usage`): Real-time progress bars for WhatsApp messages, voice minutes, doctors, staff, and branches with health badges
- [x] Super-Admin Console:
  - Executive Overview (`/dashboard/platform`): MRR, ARR, active subscribers, unpaid receivables, quick action cards
  - Tenants Directory (`/dashboard/platform/tenants`): Search, status filtering, suspension, trial extension, quota override modal, promotional credit grant
  - Plan Manager (`/dashboard/platform/plans`): Dynamic plan creation and price editing
  - Bank Payment Approval Queue (`/dashboard/platform/payments`): Verification and rejection workflow with slip preview
  - Global SaaS Invoices (`/dashboard/platform/invoices`): Searchable platform billing records
  - Audit Trail (`/dashboard/platform/audit-logs`): Immutable governance audit log table
- [x] Navigation Layout: Added "Subscription" for clinic administrators and "Platform Admin" for super-admins in sidebar navigation

### Automated Tests & Monorepo Verification
- [x] 6 dedicated SaaS backend test suites (24 tests, 100% passing):
  - `tenant-onboarding.spec.ts`: Self-registration, duplicate prevention, and onboarding step transitions
  - `plan-entitlement.spec.ts`: Plan definitions, versioning, entitlement limits, and override logic
  - `subscription-lifecycle.spec.ts`: Trial startup, payment activation, upgrades, safe downgrades, and cancellations
  - `saas-billing-payment.spec.ts`: Invoice generation, paisa calculations, proration credits, bank transfer approval, and gateway checks
  - `usage-metering.spec.ts`: Usage event telemetry, rolling period rollups, and quota thresholds
  - `platform-admin.spec.ts`: Platform KPI aggregation, tenant suspension, trial extension, and audit logging
- [x] Full Monorepo Backend: **56 / 56 test suites passed (100%), 314 / 314 tests passing**
- [x] NestJS API build: `pnpm --filter @matabai/api build` passed with exit code 0
- [x] Next.js web build: `pnpm --filter @matabai/web build` passed with exit code 0 (**all 60 routes compiled**)

---

## 📋 Phase 15 Execution Checklist (Complete & Verified)

### Security Vulnerability Remediation
- [x] Scanned monorepo dependencies for known security advisories (`pnpm audit`).
- [x] Upgraded Next.js and ESLint Next plugin to `15.2.8` in `apps/web/package.json` to patch GHSA-9qr9-h5gf-34mp (Flight Protocol RCE) and GHSA-f82v-jwr5-mffw (Middleware auth bypass).
- [x] Resolved zero remaining critical/high vulnerabilities in production dependencies.

### Environment Management & Validation
- [x] `.env.example`: Comprehensive template covering all 15 phases with defaults and documentation.
- [x] `.env.staging.example`: Staging configuration template with Supabase pooler, Safepay sandbox, and test WhatsApp parameters.
- [x] `.env.production.example`: Production configuration template with `sslmode=require`, high-entropy secrets, and JSON logging.
- [x] `packages/validation/src/env.schema.ts`: Extended Zod schema with Phase 15 parameters (`STORAGE_REPORT_ENCRYPTION_KEY`, `RATE_LIMIT_*`, `LOG_FORMAT`, `METRICS_ENABLED`, `SHUTDOWN_TIMEOUT_MS`).
- [x] `scripts/verify-env.mjs`: Automated multi-environment validator with `--env=` flag support, production JWT length validation, and external gateway credential auditing.

### Backend Hardening & API Runtime (`apps/api`)
- [x] Added `GET /api/v1/health/live` liveness probe (<5ms response time for container orchestrators).
- [x] Added `GET /api/v1/health/ready` deep readiness probe evaluating PostgreSQL and encrypted storage status (returns 200 or 503).
- [x] Added `GET /api/v1/health/metrics` telemetry probe exposing heap, RSS, Node version, and process uptime.
- [x] Implemented in-memory sliding-window `RateLimitGuard` (`apps/api/src/common/guards/rate-limit.guard.ts`) with `X-RateLimit-*` and `Retry-After` headers and 10 req/min limits on auth/onboarding/verification.
- [x] Structured JSON logging in `LoggingInterceptor` (`LOG_FORMAT=json`) with automatic UUID v4 `X-Correlation-ID` and `X-Request-ID` propagation.
- [x] Hardened `AllExceptionsFilter` attaching `correlationId` to error responses and masking internal errors/stack traces in production.
- [x] Enabled NestJS shutdown hooks (`app.enableShutdownHooks()`), request payload caps (10MB), and SIGTERM/SIGINT signal handling for zero-downtime graceful drainage.
- [x] Resolved circular module dependency between `AppointmentModule` and `AIConversationModule` using `forwardRef`.
- [x] Registered `AuditModule` as `@Global()` and added missing `WhatsAppIntegrationService` provider.

### Frontend Security Hardening (`apps/web`)
- [x] Updated `apps/web/next.config.mjs` with production headers:
  - `Content-Security-Policy`: Restricts scripts, styles, fonts, frames, and connect origins.
  - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`.
  - `X-Frame-Options`: `DENY`.
  - `X-Content-Type-Options`: `nosniff`.
  - `Referrer-Policy`: `strict-origin-when-cross-origin`.
  - `Permissions-Policy`: `camera=(), microphone=(), geolocation=()`.
- [x] Enabled Gzip/Brotli compression (`compress: true`) and disabled `poweredByHeader`.
- [x] Compiled all 60 static and dynamic routes cleanly with zero build errors.

### Database Hardening & Disaster Recovery
- [x] `scripts/db-verify-constraints.mjs`: Audited all 100 Prisma models for tenant isolation, foreign keys, compound uniqueness, and RLS policies.
- [x] `scripts/db-backup.mjs`: Automated cross-platform backup tool generating SQL archives with SHA-256 cryptographic manifests and 30-day retention pruning.
- [x] `scripts/db-restore-test.mjs`: Non-destructive restore validator testing backup integrity against RPO (1 hr) and RTO (15 mins).

### CI/CD Deployment Automation (`.github/workflows/`)
- [x] `.github/workflows/ci.yml`: Monorepo CI matrix on Node 20 & 22 testing env validation, DB constraint audit, packages build, Prisma generate, typecheck, lint, unit tests, and production builds.
- [x] `.github/workflows/deploy-staging.yml`: Staging deployment workflow with automated backup, build, deployment, and staging smoke test.
- [x] `.github/workflows/deploy-production.yml`: Production release workflow featuring explicit authorization confirmation, pre-deployment backup, safe migration, rolling restart, and post-deployment smoke tests.

### Smoke Testing & Load Benchmarking Tools
- [x] `scripts/production-smoke-test.mjs`: Automated post-deployment smoke test suite across all 15 phases verifying health, liveness, readiness, metrics, plans, rate limiting headers, correlation IDs, and unconfigured third-party provider status (`BLOCKED`).
- [x] `scripts/load-test.mjs`: In-tree HTTP benchmark runner measuring throughput (req/sec), latency percentiles (min, avg, p50, p90, p95, p99, max), and status distributions across multiple scenarios (`health`, `plans`, `queue`, `mixed`).

### Operational Documentation (`docs/production/`)
- [x] `docs/production/PRODUCTION_ARCHITECTURE.md`: High-level system architecture, compute tiers, storage, and SLA.
- [x] `docs/production/DEPLOYMENT_GUIDE.md`: Step-by-step deployment guide for staging and production.
- [x] `docs/production/ENVIRONMENT_CONFIGURATION.md`: Complete matrix of environment variables, defaults, and requirements.
- [x] `docs/production/DATABASE_MIGRATIONS.md`: Safe Expand-and-Contract migration rules, pooler vs direct connection, and rollbacks.
- [x] `docs/production/BACKUP_AND_RECOVERY.md`: RPO/RTO specifications, automated backup schedule, and disaster recovery procedures.
- [x] `docs/production/SECURITY_HARDENING.md`: Zero-trust architecture, threat model, RBAC, RLS, AES-256-GCM, and CSP.
- [x] `docs/production/MONITORING_AND_ALERTING.md`: Liveness/readiness probes, metrics endpoints, correlation IDs, and alert thresholds.
- [x] `docs/production/INCIDENT_RESPONSE.md`: Severity definitions (P1-P4), MTTA/MTTR targets, runbooks for common failures, and blameless post-mortems.
- [x] `docs/production/ROLLBACK_PROCEDURE.md`: Standard operating procedure for application and database rollbacks.
- [x] `docs/production/LOAD_TESTING.md`: Benchmark methodology, scenario descriptions, baseline results, and capacity planning.
- [x] `docs/production/PRODUCTION_CHECKLIST.md`: Go-live readiness verification checklist.
