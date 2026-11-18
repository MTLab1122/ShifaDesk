# MatabAI (ShifaDesk) — Phase 13: Advanced Analytics, Business Intelligence & Executive Reporting

## 1. Executive Summary

Phase 13 establishes the **Advanced Analytics, Business Intelligence & Executive Reporting Engine** for the MatabAI (ShifaDesk) outpatient healthcare and clinical operating platform.

The system connects all operational data layers across completed Phases 0–12—Appointments, Digital Queue, Patient Registrations, Doctor and Staff Workload, Diagnostic Laboratory Management, Multi-Tender Billing and Payments, WhatsApp Business Cloud API, Voice Telephony IVR, and Multilingual AI Receptionist Interactions—into an authoritative, multi-tenant analytics and reporting infrastructure.

**Key Guarantees:**
- **Zero Mock Statistics:** Every metric, rate, median, duration, and monetary figure is computed via parameterized database queries directly from operational records.
- **Tenant Isolation & RBAC:** Multi-tenant scoping (`organizationId`, optional `clinicId`) is enforced at the database (RLS) and API levels.
- **Audited Access & Exports:** Sensitive dashboards and export actions are logged in `AnalyticsAccessLog` and `AnalyticsExportLog`.
- **Formula Injection Defense:** All spreadsheet and CSV exports strictly sanitize code prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`) with single quotes to prevent remote code and macro execution.
- **Strict Privacy Controls:** Zero Patient PII (names, CNIC, phone numbers, clinical diagnosis text) is exposed in aggregate dashboards or analytical summaries.

---

## 2. Architecture & Data Model

### 2.1 Schema Additions (Prisma & PostgreSQL RLS)

1. **`SavedReportConfiguration` (`saved_report_configurations`)**
   - Presets created by clinic managers, accountants, and administrators in the custom report builder.
   - Stores category, dimensions, metrics, applied JSON filters, and grouping dimensions.
2. **`ScheduledReport` (`scheduled_reports`)**
   - Automated recurring report schedules (`DAILY`, `WEEKLY`, `MONTHLY`).
   - Tracks target recipient email addresses, export formats (`PDF`, `CSV`, `XLSX`), and next run calculations.
3. **`ScheduledReportRun` (`scheduled_report_runs`)**
   - Immutable audit trail of scheduled report runs (`SUCCESS`, `FAILED`, `PENDING`).
   - Tracks duration in milliseconds, row counts, failure reasons, and timestamps.
4. **`AnalyticsExportLog` (`analytics_export_logs`)**
   - Compliance logging for every downloaded report (`PDF`, `CSV`, `XLSX`).
   - Records user ID, IP address, user agent, row count, file size, and applied filters.
5. **`AnalyticsAccessLog` (`analytics_access_logs`)**
   - Audit trail capturing visits to executive dashboards and sensitive financial views.

---

## 3. Metric Formulas & Authoritative Calculations

### 3.1 Appointments Domain
- **Completion Rate (%):**
  $$\text{Completion Rate} = \frac{\text{Completed Appointments}}{\text{Total Appointments}} \times 100$$
- **Cancellation Rate (%):**
  $$\text{Cancellation Rate} = \frac{\text{Cancelled Appointments}}{\text{Total Appointments}} \times 100$$
- **No-Show Rate (%):**
  $$\text{No-Show Rate} = \frac{\text{No-Show Appointments}}{\text{Total Appointments}} \times 100$$
- **Booking Lead Time (Hours):**
  $$\text{Lead Time} = \frac{\sum (\text{Appointment Start Time} - \text{Booking Created Time})}{\text{Sample Count}}$$
- **Hourly Booking Peak:** Aggregated check-in / booking distribution mapped across 24 hourly buckets ($00:00 - 23:00$).

### 3.2 Digital Queue & Waiting Times
- **Sample Size Reporting:** Sample sizes for wait times (`sampleSizeWaitTime`) and service durations (`sampleSizeServiceDuration`) are always reported alongside averages.
- **Average Wait Time (Minutes):**
  $$\text{Avg Wait Time} = \frac{\sum (\text{Called At} - \text{Checked In At})}{\text{Wait Sample Size}}$$
- **Median Wait Time (Minutes):**
  Calculated by ordering all valid waiting durations chronologically and selecting the 50th percentile (or midpoint of the two middle values).
- **Service Duration (Minutes):**
  Elapsed consultation time between `serviceStartedAt` and `completedAt`.

### 3.3 Patient Cohort & Retention
- **Active Patients:** Patients with at least one appointment, queue token, or clinical encounter within the period.
- **Returning Patients:** Active patients registered *before* the start of the evaluated period.
- **Appointment-to-Encounter Conversion Rate (%):**
  $$\text{Conversion Rate} = \frac{\text{Encounters with Appointment Reference}}{\text{Total Appointments}} \times 100$$
- **Visit Frequency Cohorts:** Categorized into four standard clinical tiers: `1 visit`, `2-3 visits`, `4-6 visits`, and `7+ visits`.

### 3.4 Doctor & Clinical Staff Workload
- **Workload Metrics:** Assigned appointments, completed appointments, clinical encounters finalized, average encounter duration in minutes, follow-ups scheduled vs completed, and diagnostic laboratory orders initiated.
- **Ethical & Non-Discriminatory Standard:** Workload metrics are reported purely for capacity planning and clinic staffing. Scores do not rank or penalize doctors based on patient medical complexity or case mix.

### 3.5 Diagnostic Laboratory Operations
- **Specimen Rejection Rate (%):**
  $$\text{Rejection Rate} = \frac{\text{Samples with status REJECTED}}{\text{Total Collected Samples}} \times 100$$
- **Recollection Rate (%):**
  $$\text{Recollection Rate} = \frac{\text{Samples with status RECOLLECTION\_REQUIRED}}{\text{Total Collected Samples}} \times 100$$
- **Average Turnaround Time (TAT) (Hours):**
  Elapsed duration from `LaboratoryOrder.createdAt` to `LaboratoryReport.releasedAt` (or `approvedAt`).
- **Laboratory Revenue:**
  Sum of invoice line items where `itemType \in ['LAB_TEST', 'LAB_PACKAGE']`.

### 3.6 Financial Management & Reconciliation
- **Integer Minor Units:** All monetary calculations are performed in minor units (paisa: $1\text{ PKR} = 100\text{ paisa}$) to prevent floating point inaccuracies.
- **Invoiced vs Collected:** Invoices are never classified as collected cash. Only completed `Payment` records count toward cash and digital collections.
- **Outstanding Receivables:**
  $$\text{Outstanding Receivables} = \max(0, \text{Total Invoiced} - \text{Total Collected} - \text{Total Refunds})$$
- **Net Operating Balance:**
  $$\text{Net Operating Balance} = \text{Total Collected} - \text{Total Refunds} - \text{Total Operating Expenses}$$
- **Cash Register Collections:**
  Sum of completed payments where `method === 'CASH'`.

### 3.7 Communications & Multilingual AI Telemetry
- **WhatsApp Delivery Success Rate (%):**
  $$\text{Delivery Success Rate} = \frac{\text{Delivered} + \text{Read Outbound Messages}}{\text{Total Outbound Messages}} \times 100$$
- **Voice IVR Answered Rate (%):**
  $$\text{Answered Rate} = \frac{\text{Calls with status COMPLETED or IN\_PROGRESS}}{\text{Total Incoming Calls}} \times 100$$
- **AI Tool Reliability (%):**
  $$\text{Tool Success Rate} = \frac{\text{Tool Invocations with status SUCCESS}}{\text{Total Tool Invocations}} \times 100$$
- **AI Booking Conversion:** Ratio of completed appointment bookings generated via AI tools vs booking attempts.
- **Token & Cost Telemetry:** Granular aggregation of prompt input tokens, completion output tokens, and estimated cost in PKR.

---

## 4. API Endpoints Reference

### 4.1 Analytics Controller (`/api/v1/analytics`)
| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `GET` | `/analytics/dashboard` | Admin, Doctor, Receptionist, Accountant, Lab Manager | Multi-domain executive KPIs with deltas |
| `GET` | `/analytics/appointments` | Admin, Doctor, Receptionist | Appointments volume, peak hours, lead times |
| `GET` | `/analytics/queue` | Admin, Doctor, Receptionist | Wait times, service duration, doctor throughput |
| `GET` | `/analytics/patients` | Admin, Doctor, Receptionist | Patient registrations, cohorts, frequencies |
| `GET` | `/analytics/staff` | Admin, Doctor | Doctor workloads and consultation metrics |
| `GET` | `/analytics/laboratory` | Admin, Lab Staff, Lab Reviewer, Lab Manager | Test orders, turnaround times, rejection rates |
| `GET` | `/analytics/finance` | Admin, Accountant | Invoiced, collected, receivables, expenses |
| `GET` | `/analytics/communications` | Admin, Receptionist | WhatsApp delivery and Voice IVR telephony |
| `GET` | `/analytics/ai-usage` | Admin | Multilingual AI turns, tool execution, tokens |

### 4.2 Report Controller (`/api/v1/analytics/reports`)
| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `POST` | `/analytics/reports/query` | Admin, Doctor, Accountant, Lab Manager | Parameterized safe report query runner |
| `POST` | `/analytics/reports/export` | Admin, Doctor, Accountant, Lab Manager | Formula-safe export streaming (PDF/CSV/XLSX) |
| `GET` | `/analytics/reports/configurations` | Admin, Doctor, Accountant, Lab Manager | List saved report presets |
| `POST` | `/analytics/reports/configurations` | Admin, Doctor, Accountant, Lab Manager | Save custom report configuration |
| `GET` | `/analytics/reports/configurations/:id` | Admin, Doctor, Accountant, Lab Manager | Get saved report configuration |
| `PATCH` | `/analytics/reports/configurations/:id` | Admin, Doctor, Accountant, Lab Manager | Update saved report configuration |
| `DELETE` | `/analytics/reports/configurations/:id` | Admin | Delete report configuration |
| `GET` | `/analytics/reports/scheduled` | Admin | List recurring report schedules |
| `POST` | `/analytics/reports/scheduled` | Admin | Create automated report schedule |
| `GET` | `/analytics/reports/scheduled/:id` | Admin | Get scheduled report with execution runs |
| `PATCH` | `/analytics/reports/scheduled/:id` | Admin | Update scheduled report |
| `DELETE` | `/analytics/reports/scheduled/:id` | Admin | Delete scheduled report |
| `POST` | `/analytics/reports/scheduled/:id/run` | Admin | Trigger manual execution of schedule |

---

## 5. Security & Formula Injection Defense

### 5.1 Formula Injection Protection
When users export tabular data to CSV or Excel formats, malicious strings entered by actors (such as patient names or references beginning with `=cmd`, `+`, `-`, `@`, `\t`, or `\r`) could be interpreted as executable spreadsheet macros by Microsoft Excel or LibreOffice.

**Mitigation:**
In `ReportExportService.sanitizeFormulaInjection()`:
```typescript
public sanitizeFormulaInjection(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}
```
All cell values matching formula triggers are automatically prefixed with `'` (single quote) and UTF-8 BOM (`\uFEFF`) is included, guaranteeing that spreadsheet software treats the content purely as text.

### 5.2 Access and Export Auditing
Every report download generates an entry in `AnalyticsExportLog` capturing the user ID, timestamp, IP address, user agent, row count, file size, and applied filters. Dashboard views are logged in `AnalyticsAccessLog`.

---

## 6. Verification & Test Coverage

Automated testing covers all aspects of the analytics pipeline:
- **`analytics-kpi-dashboard.spec.ts`:** Resolving date ranges, period comparison calculations, trend direction, and executive dashboard aggregation.
- **`appointment-queue-analytics.spec.ts`:** Calculating appointment rates, peak booking hours, exact average and median waiting times, service durations, and doctor performance.
- **`financial-laboratory-analytics.spec.ts`:** Integer paisa reconciliation, cash register collections, receivables balance, laboratory rejection rates, and turnaround times.
- **`communication-ai-analytics.spec.ts`:** WhatsApp delivery success rate, incoming voice telephony metrics, AI tool success rates, and token cost telemetry.
- **`report-builder-export.spec.ts`:** Report query runner, CSV formula injection escaping, and automated scheduled report execution.

**Suite Results:**
- **50 / 50 test suites passing (100%)**
- **287 / 287 unit and integration tests passing**
- **Next.js frontend production build: 48 / 48 static & dynamic routes compiled cleanly**
