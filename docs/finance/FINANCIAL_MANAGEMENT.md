# Financial Management, Billing, Invoicing & Payment Processing

## 1. Executive Summary

Phase 11 delivers a comprehensive, multi-tenant **Financial Management, Billing, Invoicing & Payment Processing Engine** for MatabAI (ShifaDesk). Fully integrated into the existing modular monolith architecture, this phase introduces outpatient consultation and diagnostic patient invoices (`INV-YYYYMM-XXXX`) with immutable price snapshots, multi-tender payment collections (`PAY-YYYYMM-XXXX`) supporting Cash, Bank Wire Transfer, State Bank of Pakistan (SBP) Raast P2M, and Card aggregators, controlled two-stage refund workflows (`REF-YYYYMM-XXXX`) with strict separation of duties, clinic operating expense tracking (`EXP-YYYYMM-XXXX`), daily cash register drawer sessions (`CRS-YYYYMM-XXXX`) with mandatory physical discrepancy justification and audit locks, multi-source automated/manual bank reconciliation, printable 80mm thermal receipts and A4 invoices, and direct integration with the Phase 8 Centralized Notification Orchestration Engine.

The system enforces strict financial and medical safety boundaries:
1. **Integer Minor Units Standard**: All currency values are stored, calculated, and processed strictly in integer minor units (1 PKR = 100 Paisa minor units, where `amountMinor = Math.round(amountPkr * 100)`). Floating-point arithmetic is 100% prohibited across all ledgers, eliminating rounding discrepancies.
2. **Backend Authoritative Pricing**: Client-submitted totals, discounts, and taxes are never trusted. All totals (`subtotalMinor - discountMinor + taxMinor = totalMinor`) and balances (`totalMinor - paidMinor = outstandingMinor`) are computed authoritatively on the backend.
3. **Zero Simulated Online Payments**: Payment gateway adapters implement real communication protocols, timing-safe webhook verification, and EMVCo PKQR generation. When merchant API credentials are missing, the adapters explicitly reject requests as `BLOCKED` with official State Bank of Pakistan (SBP) and Pakistan Telecommunication Authority (PTA) regulatory onboarding guidance.
4. **Separation of Duties**: Front-desk cashiers cannot approve their own refund requests. Approval or rejection requires a separate authorized financial manager or clinic administrator (`CLINIC_ADMIN`, `ACCOUNTANT`, or `SUPER_ADMIN`).
5. **No AI Financial Decisions**: Large Language Models and automated AI tools are strictly barred from approving financial discounts, adjusting ledgers, approving refunds, or generating medical billing diagnostic codes.

---

## 2. Architecture & Data Flow

```
                  [ Outpatient Consultation / Lab Order ]
                                     │
                                     ▼
                      ┌───────────────────────────────┐
                      │        Invoice Service        │
                      │  • Number: INV-YYYYMM-XXXX    │
                      │  • Immutable Price Snapshots  │
                      │  • Status: DRAFT / ISSUED     │
                      └──────────────┬────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
                 ▼                                       ▼
   ┌───────────────────────────┐           ┌───────────────────────────┐
   │     Physical Cash Desk    │           │    Electronic Gateways    │
   │  • Cash Register Session  │           │  • SBP Raast P2M (PKQR)   │
   │  • Float Tracking (PKR)   │           │  • Card Gateway (Safepay) │
   │  • 80mm Thermal Receipt   │           │  • Direct IBAN Wire       │
   └─────────────┬─────────────┘           └─────────────┬─────────────┘
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     │
                                     ▼
                      ┌───────────────────────────────┐
                      │        Payment Service        │
                      │  • Number: PAY-YYYYMM-XXXX    │
                      │  • Atomic $transaction        │
                      │  • Overpayment Prevention     │
                      │  • Multi-tender Allocations   │
                      └──────────────┬────────────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 │                   │                   │
                 ▼                   ▼                   ▼
   ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
   │   Reconciliation  │ │  Refund Approval  │ │   Notification    │
   │  • Duplicate Bank │ │  • Two-Stage Duty │ │     Engine        │
   │    Ref Detection  │ │  • Balance Refund │ │  • Phase 8 Events │
   │  • Discrepancies  │ │  • Audit Trail    │ │  • WA / SMS / App │
   └───────────────────┘ └───────────────────┘ └───────────────────┘
```

---

## 3. Database Entities & Schemas

Phase 11 introduces 12 Prisma models in `apps/api/prisma/schema.prisma` with multi-tenant row-level security (`RLS`) and tenant isolation:

1. **`Invoice`**: Patient billing statements (`INV-YYYYMM-XXXX`) capturing appointment or laboratory order linkage, currency (`PKR`), subtotal, discounts, tax rates, total, amount paid, outstanding balance, status (`DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `CANCELLED`), due dates, and cancellation notes.
2. **`InvoiceItem`**: Itemized invoice line items capturing service categories (`CONSULTATION`, `LAB_TEST`, `LAB_PACKAGE`, `PROCEDURE`, `MEDICATION`, `SERVICE`, `CUSTOM`), description snapshots, quantity, unit price minor units, discount minor units, and line item total minor units.
3. **`Payment`**: Multi-tender collection receipts (`PAY-YYYYMM-XXXX`) recording method (`CASH`, `BANK_TRANSFER`, `CARD`, `RAAST`, `OTHER`), provider (`CASH`, `MANUAL_BANK`, `RAAST_SBP`, `PAYMOB`, `SAFEPAY`, `STRIPE`), transaction references, amount minor units, collector identity, and idempotency key.
4. **`PaymentAllocation`**: Ledger junction mapping atomic payment amounts to specific invoices, supporting split and multi-invoice settlement.
5. **`Refund`**: Controlled refund records (`REF-YYYYMM-XXXX`) tracking requested amount minor units, justification reason, separation-of-duties review status (`PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `PROCESSED`), reviewer identity, and audit rejection explanations.
6. **`FinancialAdjustment`**: Non-payment invoice adjustments (`DISCOUNT`, `WRITE_OFF`, `WAIVER`, `CORRECTION`, `TAX_ADJUSTMENT`) with mandatory audit reasoning and authorized manager sign-off.
7. **`ExpenseCategory`**: Configurable clinic expenditure classifications (Rent, Utilities, Staff Salaries & Payroll, Medical Supplies & Reagents, Equipment Maintenance, IT & Software).
8. **`Expense`**: Operating expenditure vouchers (`EXP-YYYYMM-XXXX`) capturing payee, amount minor units, payment method, invoice/receipt reference attachments, approval status, and cash register integration for cash disbursements.
9. **`CashRegisterSession`**: Front-desk physical drawer sessions (`CRS-YYYYMM-XXXX`) tracking opening float, expected closing cash (Opening + Cash Collections - Cash Refunds - Cash Expenses), counted closing cash, physical discrepancy minor units, mandatory discrepancy explanation, status (`OPEN`, `CLOSED`, `REOPENED`), and audit locks.
10. **`CashRegisterTransaction`**: Granular cash drawer movements (`OPENING_FLOAT`, `PAYMENT_CASH_IN`, `REFUND_CASH_OUT`, `EXPENSE_CASH_OUT`, `CASH_DROP`, `CLOSING_BALANCE`) maintaining unbroken cash drawer auditability.
11. **`PaymentWebhookEvent`**: Raw gateway webhook payload ledger storing provider, event type, delivery timestamps, processing status (`RECEIVED`, `PROCESSED`, `FAILED`, `IGNORED`), and duplicate signature protection.
12. **`FinancialAuditLog`**: Immutable append-only audit trail capturing every financial mutation, before/after JSON states, actor IP address, and role.

---

## 4. Invoicing & Billing Lifecycle

### Sequential Numbering
- Invoices: `INV-YYYYMM-XXXX` (e.g., `INV-202611-0001`)
- Payments: `PAY-YYYYMM-XXXX` (e.g., `PAY-202611-0001`)
- Refunds: `REF-YYYYMM-XXXX` (e.g., `REF-202611-0001`)
- Expenses: `EXP-YYYYMM-XXXX` (e.g., `EXP-202611-0001`)
- Cash Sessions: `CRS-YYYYMM-XXXX` (e.g., `CRS-202611-0001`)

### State Machine & Validation
```
[ DRAFT ] ───(Issue)───> [ ISSUED ] ───(Partial Payment)───> [ PARTIALLY_PAID ]
    │                        │                                      │
    │ (Cancel)               │ (Full Payment)                       │ (Final Payment)
    ▼                        ▼                                      ▼
[ CANCELLED ]             [ PAID ] <────────────────────────────────┘
```
- **Draft Creation**: Staff can draft invoices with multiple line items, adding consultation fees or diagnostic test items.
- **Price Snapshotting**: Test prices and consultation charges are copied as immutable snapshots at invoice generation time, shielding past bills from future catalog price changes.
- **Issuing Guard**: Payments can only be collected against `ISSUED` or `PARTIALLY_PAID` invoices. Collecting against `DRAFT` or `CANCELLED` invoices triggers an immediate `BadRequestException`.
- **Cancellation Protection**: Invoices with recorded payments cannot be cancelled unless all payments are first approved and refunded. Mandatory cancellation justification is stored in `cancellationReason`.

---

## 5. Multi-Tender Payment Collections & Cash Drawer Integrity

### Overpayment Prevention & Atomic Transactions
All payment collections execute inside an isolated `prisma.$transaction`:
1. The invoice is locked and current `outstandingMinor` is inspected.
2. If `paymentAmountMinor > outstandingMinor`, transaction is rolled back with `BadRequestException("Payment exceeds invoice outstanding balance")`.
3. Payment record and `PaymentAllocation` are written simultaneously.
4. Invoice `paidMinor` is incremented and `outstandingMinor` is decremented. Status transitions to `PAID` (if `outstanding === 0`) or `PARTIALLY_PAID`.
5. If method is `CASH`, the active clinic `CashRegisterSession` is automatically identified and credited with a `PAYMENT_CASH_IN` transaction. If no cash session is open, cashier is prompted to open their shift register.

### Daily Shift Closing & Discrepancy Lock
- When closing a shift (`CRS-YYYYMM-XXXX`), the system computes:
  $$\text{Expected Closing Balance} = \text{Opening Float} + \sum \text{Cash In} - \sum \text{Cash Out}$$
- The cashier enters the physical counted cash (`actualClosingMinor`).
- The system calculates:
  $$\text{Discrepancy} = \text{Actual Closing} - \text{Expected Closing}$$
- If discrepancy $\neq 0$, a **mandatory textual explanation** (`notes`) is enforced.
- Reopening a closed shift is restricted to `CLINIC_ADMIN` and `SUPER_ADMIN` and permanently recorded in the financial audit log with `reopenReason`.

---

## 6. Payment Gateway Integration & Regulatory Compliance

### SBP Raast P2M EMVCo PKQR Adapter
- Integrates with the State Bank of Pakistan (SBP) Instant Payment System (Raast).
- Generates dynamic EMVCo-compliant QR codes (Pakistan QR standard - PKQR) encoding merchant Raast ID, IBAN, bill reference (`INV-YYYYMM-XXXX`), and amount.
- **Regulatory Gate**: If `RAAST_MERCHANT_ID` or `RAAST_API_KEY` are unconfigured, the adapter returns `configured: false` and explicitly rejects live transaction initiation:
  > *"Raast SBP payment adapter is running in UNCONFIGURED mode. Live instant settlement is BLOCKED until official SBP member participant bank credentials are provided."*

### Card Aggregator Adapter (Safepay / PayMob / Stripe)
- Initiates hosted checkout sessions with HMAC SHA-256 webhook signatures.
- Verifies webhook signatures using constant-time timing-safe comparison (`crypto.timingSafeEqual`) to prevent timing attack vulnerabilities.
- Rejects unconfigured merchant keys with explicit onboarding steps under State Bank of Pakistan Payment Systems Operator (PSO) / Payment Service Provider (PSP) regulations.

### Manual Bank Wire Transfer
- Displays verified clinic IBAN and title of account.
- Accepts patient bank transaction reference number and deposit slip snapshot.
- Requires dual verification during reconciliation before releasing outstanding invoice balance.

---

## 7. Refunds & Separation of Duties

To comply with internal financial controls and prevent employee theft:
1. **Initiation**: Receptionists or cashiers submit refund requests specifying payment ID, invoice ID, amount, and reason. Status begins as `PENDING_APPROVAL`.
2. **Duty Check**: The initiator cannot approve their own refund. The approving actor's profile ID is verified:
   $$\text{reviewerId} \neq \text{requestedById}$$
3. **Approval**: An authorized financial manager (`ACCOUNTANT`, `CLINIC_ADMIN`, `SUPER_ADMIN`) approves or rejects the request.
4. **Execution**: Upon approval, an atomic transaction:
   - Rolls back the invoice `paidMinor` and restores `outstandingMinor`.
   - Transitions invoice back to `PARTIALLY_PAID` or `ISSUED`.
   - If paid in cash, creates a `REFUND_CASH_OUT` transaction in the active cash drawer.
   - Triggers `PAYMENT_REFUNDED` notification to the patient.

---

## 8. Reconciliation & Financial Reporting

### Multi-Source Reconciliation Engine
- Matches internal payment records against external bank statements, Raast settlement logs, and card aggregator transaction dumps.
- **Duplicate Reference Detection**: Detects and flags duplicate bank reference numbers across different payments to prevent double-crediting fraudulent wire slips.
- **Manual Match Authorization**: Authorized accountants can link unassigned bank deposits to pending invoices with an immutable audit entry.

### Financial Analytics KPIs
- **Gross Invoiced Revenue**: Total minor units billed in date range.
- **Net Collections**: Total realized collections across tenders.
- **Operating Expenses**: Total categorized clinic outflows.
- **Net Operating Balance**: Collections minus operating expenses.
- **Aging & Outstanding**: Unpaid invoices grouped by aging brackets (0–30 days, 31–60 days, 61+ days).
- **Payment Method Distribution**: Breakdown of cash vs. Raast vs. card vs. bank wire volume.

---

## 9. Notification Engine Integration (Phase 8)

Phase 11 connects directly to the Phase 8 Centralized Notification Orchestration Engine via `NotificationSchedulerService.scheduleFinancialNotification`:

| Event Type | Trigger | Channels | Payload Details |
| :--- | :--- | :--- | :--- |
| `INVOICE_ISSUED` | Invoice transitioned to `ISSUED` | WhatsApp, SMS, In-App | Invoice reference, total amount PKR, due date, breakdown |
| `PAYMENT_RECEIVED` | Successful payment collected | WhatsApp, SMS, In-App | Payment reference, amount paid PKR, remaining balance, receipt link |
| `PAYMENT_REFUNDED` | Refund approved & processed | WhatsApp, SMS, In-App | Refund reference, amount refunded PKR, restored balance |
| `OUTSTANDING_BALANCE_REMINDER` | Automated reminder cron | WhatsApp, SMS | Days overdue, outstanding balance PKR, payment guidance |

---

## 10. Printable Documents & Receipts

### 80mm Thermal Receipt Layout (`ReceiptService.generate80mmThermalHtml`)
- Designed for standard ESC/POS 80mm front-desk thermal receipt printers (280px printable width, monospace font, dashed cut lines, tax registration header, sequential `PAY-YYYYMM-XXXX` and `INV-YYYYMM-XXXX` barcodes/references).

### Official A4 Invoice Layout (`ReceiptService.generateA4InvoiceHtml`)
- Executive healthcare facility letterhead, clinic contact details, patient demographic info, itemized services table with unit prices and quantities, subtotal, discounts, taxes, net total, and payment history.

### Synthetic PDF Stream
- Generates official PDF documents on-the-fly with standard `%PDF-1.4` headers, stream catalogs, and text blocks for one-click downloading from both staff dashboard and patient portal.

---

## 11. Role-Based Access Control (RBAC)

The system introduces the `ACCOUNTANT` role and six granular permissions:

| Role | `FINANCE_READ` | `FINANCE_WRITE` | `FINANCE_MANAGE` | `FINANCE_REFUND` | `FINANCE_EXPENSE` | `FINANCE_CLOSE` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `SUPER_ADMIN` | Yes | Yes | Yes | Yes | Yes | Yes |
| `CLINIC_ADMIN` | Yes | Yes | Yes | Yes | Yes | Yes |
| `ACCOUNTANT` | Yes | Yes | Yes | Yes | Yes | Yes |
| `RECEPTIONIST` | Yes | Yes | No | No (Request Only) | No | Shift Close Only |
| `DOCTOR` | Read Own | No | No | No | No | No |
| `PATIENT` | Read Own | No | No | No | No | No |

---

## 12. Verification & Automated Test Suite

All 40 backend test suites and 249 unit tests passing with 100% success rate:
- `finance-invoice.spec.ts` — Sequential numbering (`INV-YYYYMM-XXXX`), integer arithmetic, cancellation validation, price snapshotting.
- `finance-payment.spec.ts` — Overpayment prevention, multi-tender collection, idempotency key deduplication, atomic transaction rollbacks.
- `finance-refund.spec.ts` — Separation of duties enforcement, self-approval prevention, balance restoration, refund limits.
- `finance-cash-register.spec.ts` — Shift opening float, expected closing math, counted cash discrepancy requirement, audit reopening locks.
- `finance-reconciliation.spec.ts` — Multi-source matching, duplicate reference detection, discrepancy resolution.
- `finance-adapter.spec.ts` — SBP Raast PKQR generation, Safepay HMAC signature validation, unconfigured carrier `BLOCKED` responses.

Frontend production build (`pnpm --filter @matabai/web build`) verified with zero TypeScript, lint, or compilation errors:
- `/dashboard/finance` — 8 KPI cards, 7 functional tabs, 10 interactive modals.
- `/patient/invoices` — Patient billing ledger, outstanding summary, itemized line-item modal, A4 PDF download, receipt viewer, and SBP/PTA compliant payment guidance.
