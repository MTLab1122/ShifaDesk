# ShifaDesk (MatabAI) v1.0.0 — Production Release

**Live Application:** [https://shifadesk-mtlab.vercel.app](https://shifadesk-mtlab.vercel.app)  
**Alternative Production Alias:** [https://shifadesk-ashen.vercel.app](https://shifadesk-ashen.vercel.app)  
**Founder:** Muhammad Talha  
**Status:** `PRODUCTION READY WITH DOCUMENTED LIMITATIONS`

---

## 🌟 Overview
ShifaDesk (MatabAI) is an enterprise-grade, multi-tenant healthcare operations, EMR-Lite, and diagnostic laboratory SaaS platform engineered specifically for modern clinics, hospitals, and outpatient facilities in Pakistan and global multilingual regions.

Built with a high-performance monorepo architecture leveraging Next.js 15 (React 19), NestJS 10, PostgreSQL 16 with Prisma ORM, and Redis 7.

---

## 🚀 Key Modules & Capabilities (Phases 0–15)
- **Multi-Tenant Clinic Isolation:** Full tenant hierarchy, clinic branching, and role-based access control (Super Admin, Clinic Admin, Doctor, Receptionist, Lab Director, Lab Technician, Accountant, Patient).
- **Patient & Appointment Engine:** Smart slot generator, double-booking prevention, multi-doctor scheduling, and booking calendar.
- **Digital Queue & Token Management:** Live queue display boards, token calling, SMS/WhatsApp alerts, and estimated wait times.
- **Meta WhatsApp Business API Integration:** 2-way automated chat booking, appointment reminders, and receptionist human-handover.
- **Multilingual AI Receptionist:** Context-aware triage supporting English, Urdu, and Pashto with strict medical safety guardrails.
- **Voice Telephony & IVR:** Inbound IVR call routing, speech gathering, and automated doctor transfer via Twilio voice adapter.
- **Diagnostic Laboratory Management:** Complete test catalog, packages, specimen accessioning, barcode tracking, and two-tier result approvals.
- **Secure Report Delivery:** AES-256-GCM encrypted PDF diagnostic reports delivered via one-time tokenized access links.
- **Financials & Payment Gateways:** Automated patient billing, multi-tender receipts, cash registers, daily closing, Safepay card processing, and Raast instant settlement.
- **Clinical Encounter & EMR-Lite:** SOAP consultation documentation, ICD-10 diagnosis codes, prescription management, and longitudinal history.
- **BI Analytics & Executive Dashboards:** Dynamic KPIs across clinical visits, revenue, lab turnaround times, queue bottlenecks, and automated CSV export.
- **SaaS Subscription & Tenant Management:** Multi-tier SaaS plans (Starter, Professional, Laboratory), metered usage tracking, automated recurring invoices, and super-admin controls.
- **DevOps, Observability & Hardening:** Liveness & readiness probes, rate limiting, security headers, correlation ID tracing, and Docker Compose orchestration.

---

## 🧪 Quality & Verification Summary
- **Backend API Tests (`@matabai/api`):** 56 / 56 test suites passed (**314 / 314 tests passed, 100% pass rate**).
- **Frontend Web Tests (`@matabai/web`):** 1 / 1 test suite passed (**4 / 4 tests passed, 100% pass rate**).
- **TypeScript Compilation:** Zero errors across all 5 workspace projects (`@matabai/config`, `@matabai/shared`, `@matabai/validation`, `@matabai/api`, `@matabai/web`).
- **Production Smoke Tests:** 13/13 operational checks verified.

---

## 🔗 Quick Links
- **Live Web App:** [https://shifadesk-mtlab.vercel.app](https://shifadesk-mtlab.vercel.app)
- **GitHub Repository:** [https://github.com/MTLab1122/ShifaDesk](https://github.com/MTLab1122/ShifaDesk)
- **Documentation:** Available in [`/docs`](https://github.com/MTLab1122/ShifaDesk/tree/main/docs)
