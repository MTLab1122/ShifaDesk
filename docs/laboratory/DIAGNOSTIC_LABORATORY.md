# Diagnostic Laboratory Management & Secure Report Delivery

## 1. Executive Summary

Phase 10 implements a complete, enterprise-grade **Diagnostic Laboratory Management & Secure Report Delivery System** for MatabAI (ShifaDesk). Fully integrated into the existing modular monolith architecture, this phase delivers outpatient pathology and diagnostic test catalog management, physical specimen tracking (`SMP-YYYYMM-XXXX`) through an 8-stage lifecycle, laboratory order management (`LAB-YYYYMM-XXXX`) with immutable price snapshotting, two-stage result entry and evaluation with strict separation of duties, an immutable result amendment audit ledger, AES-256-GCM encrypted PDF report storage with `%PDF-` magic-byte inspection, and patient report delivery via unguessable 256-bit secure access tokens with patient identity verification.

The system enforces strict medical ethics and safety boundaries: **zero automated medical diagnosis, zero clinical interpretation of abnormal values, zero treatment recommendations**, and an uncompromising safety gate prohibiting the delivery or release of incomplete, unapproved, or rejected laboratory reports.

---

## 2. Architecture & Data Flow

```
                      [ Doctor / Outpatient Walk-in ]
                                     │
                                     ▼
                      ┌───────────────────────────────┐
                      │    Laboratory Order Service   │
                      │  • Order Number: LAB-YYYYMM-X │
                      │  • Immutable Price Snapshot   │
                      │  • Test / Package Selection   │
                      └──────────────┬────────────────┘
                                     │
                                     ▼
                      ┌───────────────────────────────┐
                      │    Specimen Tracking Service  │
                      │  • Sample ID: SMP-YYYYMM-XXXX │
                      │  • Phlebotomy Collection      │
                      │  • Rejection & Recollection   │
                      └──────────────┬────────────────┘
                                     │
                                     ▼
                      ┌───────────────────────────────┐
                      │    Two-Stage Result Review    │
                      │  • Technician Result Entry    │
                      │  • Separation of Duties Check │
                      │  • Pathologist / Lab Reviewer │
                      └──────────────┬────────────────┘
                                     │
                                     ▼
                      ┌───────────────────────────────┐
                      │    Encrypted Report Storage   │
                      │  • AES-256-GCM Encryption     │
                      │  • Magic Byte (%PDF-) Check   │
                      │  • SHA-256 Integrity Hash     │
                      └──────────────┬────────────────┘
                                     │
                                     ▼
                      ┌───────────────────────────────┐
                      │     Secure Patient Delivery   │
                      │  • 256-bit Unguessable Token  │
                      │  • SHA-256 Token Hash Only    │
                      │  • Phone / DOB Verification   │
                      │  • Phase 6 (WA) & Phase 8 (NT)│
                      └───────────────────────────────┘
```

---

## 3. Database Entities & Schemas

Phase 10 introduces 13 Prisma models in `apps/api/prisma/schema.prisma` with multi-tenant row-level security (`RLS`) and tenant isolation:

1. **`LaboratoryTestCategory`**: Logical categorization of laboratory investigations (e.g., Hematology, Biochemistry, Microbiology, Serology, Radiology).
2. **`LaboratoryTest`**: Standardized directory of laboratory tests with sample types, turnaround times, reference ranges, units, and base prices.
3. **`LaboratoryPackage`**: Curated panels and health checkup profiles bundling multiple tests at a bundled price.
4. **`LaboratoryPackageItem`**: Junction model associating tests to packages.
5. **`LaboratoryOrder`**: Outpatient orders with sequential identifier `LAB-YYYYMM-XXXX`, patient linkage, ordering doctor, and aggregated financial totals.
6. **`LaboratoryOrderItem`**: Individual tests within an order capturing immutable unit price snapshots at order time.
7. **`LaboratorySample`**: Physical diagnostic specimens (`SMP-YYYYMM-XXXX`) tracking collection timestamps, phlebotomist identity, container types, and rejection reasons.
8. **`LaboratoryResult`**: Test measurement values (numeric, qualitative, structured), units, reference intervals, flag (NORMAL, HIGH, LOW, CRITICAL), and status.
9. **`LaboratoryResultReview`**: Verification ledger enforcing separation of duties; records reviewer identity, decision (`APPROVED`, `REJECTED`, `RETEST_REQUESTED`), and comments.
10. **`LaboratoryReport`**: Generated or uploaded diagnostic PDF report records with AES-256-GCM encrypted file storage metadata, SHA-256 checksums, and pathologist sign-off.
11. **`LaboratoryReportAccessToken`**: Unguessable 256-bit delivery tokens (stored as SHA-256 hashes) with expiration timestamps, access limits, and instant one-click revocation.
12. **`LaboratoryReportAccessLog`**: Security access audit trail tracking IP addresses, user agents, verification outcomes, and download timestamps.
13. **`LaboratoryAuditLog`**: Tamper-evident ledger recording all laboratory mutations, amendments, approvals, and releases.

---

## 4. Specimen Lifecycle & State Machine

Every physical sample follows an audited, deterministic state transition model:

```
[ PENDING ] ───(Collect)───> [ COLLECTED ] ───(Receive at Lab)───> [ RECEIVED ]
                                                                       │
                                      ┌────────────────────────────────┤
                                      ▼                                ▼
                                [ PROCESSING ]                  [ REJECTED ]
                                      │                                │
                                      ▼                                ▼
                                [ COMPLETED ]             [ RECOLLECTION_REQUIRED ]
```

- **Rejection Protection**: Samples can be rejected during receipt or processing (e.g., hemolyzed, insufficient volume, clotted, incorrect container). When rejected, a mandatory clinical justification reason is required and the status transitions to `REJECTED` or `RECOLLECTION_REQUIRED`.
- **Order Synchronization**: The parent order automatically advances its operational status as specimens and results progress through the pipeline (`SAMPLE_COLLECTED`, `PROCESSING`, `RESULTS_PENDING`, `UNDER_REVIEW`, `REPORT_READY`, `DELIVERED`).

---

## 5. Result Verification & Separation of Duties

To comply with international laboratory standards (ISO 15189 / CAP):
1. **Entry vs. Review Distinction**: Technicians enter raw results (`DRAFT` / `PRELIMINARY`).
2. **Strict Separation of Duties**: The technician who entered or amended a result **cannot approve their own result**. Approvals must be executed by a distinct authorized reviewer (`LAB_REVIEWER`, `LAB_MANAGER`, or `CLINIC_ADMIN`).
3. **Amendment Audit Ledger**: Any modification to a recorded result creates an amendment entry in `LaboratoryAuditLog` requiring a mandatory justification note, preserving historical integrity.
4. **Safety Gating**: Laboratory reports cannot be published or released to patients unless all associated tests are in `APPROVED` or `FINAL` status. Incomplete or rejected orders are strictly blocked from release.

---

## 6. Secure Report Storage & Delivery Engine

### Encryption at Rest (AES-256-GCM)
- Every generated or uploaded diagnostic PDF report is encrypted at rest using AES-256-GCM with a unique 12-byte initialization vector (IV) and a 16-byte authentication tag.
- Storage service verifies the `%PDF-` magic bytes (`0x25 0x50 0x44 0x46 0x2D`) prior to encryption, preventing arbitrary file execution or masquerading.
- Cryptographic SHA-256 checksum is calculated and stored to guarantee tamper-detection.

### Zero-Knowledge Tokenized Delivery
- Secure report download links contain a cryptographically secure 256-bit random token generated via `crypto.randomBytes(32).toString('hex')`.
- The raw token is **never stored in the database**; only its SHA-256 digest (`tokenHash`) is retained.
- When accessed via `/reports/access/[token]`, the system enforces:
  1. Token hash lookup and expiration validation (`expiresAt > NOW()`).
  2. One-click revocation status check (`revoked === false`).
  3. Patient identity verification challenge (matching patient's registered phone number or birth year).
  4. Automatic rate limiting and access attempt logging with IP and User-Agent capture.
- Seamlessly delivered to patients via WhatsApp Cloud API (Phase 6) and Notification Orchestrator (Phase 8).

---

## 7. Medical Safety & Boundaries

| Category | Policy |
| :--- | :--- |
| **Medical Advice** | 100% prohibited. The system never suggests diagnoses, differential diagnoses, or drug treatments. |
| **Abnormal Values** | Flags (`HIGH`, `LOW`, `CRITICAL`) are displayed with reference intervals purely for administrative and technical reporting; clinical interpretation is reserved for licensed physicians. |
| **Unapproved Release** | Strictly gated. Attempting to generate or deliver reports for unverified results triggers an explicit `BadRequestException`. |
| **Access Revocation** | Clinic administrators and lab managers can revoke public access tokens immediately with a single click in case of misdirected orders. |

---

## 8. API Endpoints

### Catalog Management
- `GET /api/v1/laboratory/categories` — List test categories.
- `POST /api/v1/laboratory/categories` — Create category (`LAB_MANAGE`).
- `GET /api/v1/laboratory/tests` — List diagnostic tests with category filtering.
- `POST /api/v1/laboratory/tests` — Create test (`LAB_MANAGE`).
- `PATCH /api/v1/laboratory/tests/:id` — Update test (`LAB_MANAGE`).
- `GET /api/v1/laboratory/packages` — List diagnostic packages.
- `POST /api/v1/laboratory/packages` — Create package (`LAB_MANAGE`).

### Orders & Specimen Processing
- `GET /api/v1/laboratory/orders` — Paginated orders with status and patient filtering.
- `POST /api/v1/laboratory/orders` — Create outpatient lab order (`LAB-YYYYMM-XXXX`).
- `GET /api/v1/laboratory/orders/:id` — Complete order details with samples and items.
- `POST /api/v1/laboratory/orders/:id/cancel` — Cancel order with reason (`LAB_MANAGE`).
- `GET /api/v1/laboratory/samples` — List specimens with status and barcode search.
- `PATCH /api/v1/laboratory/samples/:id/status` — Transition specimen lifecycle.

### Results & Verification
- `POST /api/v1/laboratory/order-items/:id/result` — Enter test result (`LAB_WRITE`).
- `PATCH /api/v1/laboratory/results/:id/amend` — Amend result with reason (`LAB_WRITE`).
- `POST /api/v1/laboratory/results/:id/review` — Review & approve result (`LAB_REVIEW`).

### Reports & Delivery
- `GET /api/v1/laboratory/reports` — List archived laboratory reports.
- `POST /api/v1/laboratory/reports/generate/:orderId` — Generate standardized synthetic PDF.
- `POST /api/v1/laboratory/reports/upload/:orderId` — Upload external PDF with magic byte validation.
- `POST /api/v1/laboratory/reports/:id/approve` — Pathologist formal approval (`LAB_APPROVE`).
- `POST /api/v1/laboratory/reports/:id/release` — Release report for delivery (`LAB_RELEASE`).
- `POST /api/v1/laboratory/reports/:id/access-token` — Generate secure delivery token link.
- `POST /api/v1/laboratory/reports/:id/revoke-access` — Instant token revocation.
- `GET /api/v1/laboratory/reports/:id/download` — Stream decrypted PDF (`REPORT_READ`).
- `GET /api/v1/laboratory/analytics` — Laboratory KPIs and volume breakdown.

### Patient & Public Portal
- `GET /api/v1/patient/laboratory/orders` — Patient's own lab orders.
- `GET /api/v1/patient/laboratory/reports` — Patient's released lab reports.
- `POST /api/v1/public/reports/access/:token/verify` — Public token verification challenge.
- `GET /api/v1/public/reports/access/:token/stream` — Public secure decrypted report streaming.

---

## 9. Verification & Test Coverage

All 34 test suites and 218 tests passing with 100% success rate:
- `laboratory-catalog.spec.ts` — Unique test codes, price constraints, package item associations.
- `laboratory-order.spec.ts` — Order numbering (`LAB-YYYYMM-XXXX`), immutable price snapshots, cancellation guards.
- `laboratory-sample.spec.ts` — Specimen lifecycle (`SMP-YYYYMM-XXXX`), mandatory rejection reasons, order sync.
- `laboratory-result-approval.spec.ts` — Separation of duties enforcement, self-approval prevention, amendment logging.
- `laboratory-report-delivery.spec.ts` — AES-256-GCM encryption, 256-bit token generation, patient phone verification, unapproved report release prevention.
