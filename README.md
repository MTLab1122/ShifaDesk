# MatabAI (ShifaDesk)

> **Enterprise Multilingual AI Clinic Operations, EMR-Lite & Diagnostic Laboratory SaaS Platform**  
> Founder: **Muhammad Talha**  
> 🌐 **Live Web Application:** [https://shifadesk-mtlab.vercel.app](https://shifadesk-mtlab.vercel.app) *(Production Alias: [https://shifadesk-ashen.vercel.app](https://shifadesk-ashen.vercel.app))*  
> 📦 **Release:** [![v1.0.0](https://img.shields.io/badge/Release-v1.0.0-blue.svg)](https://github.com/MTLab1122/ShifaDesk/releases/tag/v1.0.0) [![Live Demo](https://img.shields.io/badge/Demo-Live_on_Vercel-success.svg)](https://shifadesk-mtlab.vercel.app) [![Status](https://img.shields.io/badge/Status-Production_Ready-brightgreen.svg)](#)  
> 🏗️ Monorepo Architecture: **Next.js 15 (App Router, React 19) + NestJS 10 (API) + PostgreSQL 16 + Redis 7**

---

## 🏥 Overview

MatabAI (ShifaDesk) is an enterprise healthcare SaaS engineered for outpatient clinics, polyclinics, and multi-specialty healthcare networks. It integrates clinical workflow automation, AI conversational medical transcription, smart walk-in queueing, multilingual patient communications (Urdu, English, Arabic, regional dialects), and WhatsApp-driven scheduling into a unified, multi-tenant platform.

---

## 🏗️ Repository Architecture

MatabAI is structured as a high-performance **pnpm monorepo**:

```text
matabai/
├── apps/
│   ├── web/                 # Next.js 15 App Router Frontend (React 19, Tailwind, Shadcn, TanStack Query)
│   └── api/                 # NestJS 10 Backend (TypeScript Strict, Modular boundaries, Swagger)
│
├── packages/
│   ├── shared/              # Shared TypeScript contracts, response wrappers, error codes, and enums
│   ├── config/              # Shared Tailwind presets, ESLint configurations, and base constants
│   └── validation/          # Shared Zod schemas (environment, pagination, clinical formatting)
│
├── docs/
│   ├── architecture/        # System blueprints, component diagrams, and runtime design
│   ├── api/                 # REST conventions, error handling contracts, and versioning
│   ├── database/            # Supabase multi-tenancy, connection pooling, and migrations
│   ├── security/            # HIPAA/GDPR alignment, encryption standards, and secret management
│   ├── development/         # Developer environment setup, Git conventions, and branching
│   └── decisions/           # Architecture Decision Records (ADRs)
│
├── infrastructure/
│   ├── database/            # Local Docker PostgreSQL compose, baseline SQL extensions
│   └── deployment/          # Multi-stage production Dockerfiles for Web and API
│
├── scripts/                 # Automation scripts (verify-env.mjs, check-health.mjs)
├── .github/
│   ├── workflows/           # CI GitHub Actions pipeline
│   ├── ISSUE_TEMPLATE/      # Bug reports and feature proposals
│   └── pull_request_template.md
│
├── .env.example             # Master environment variable template
├── tsconfig.base.json       # Monorepo TypeScript strict base configuration
├── pnpm-workspace.yaml      # Monorepo package declaration
└── README.md                # Project documentation root
```

---

## ⚡ Prerequisites

- **Node.js**: `v20.0.0` or higher (verified on `v26.13.0`)
- **pnpm**: `v9.0.0` or higher (verified on `12.16.1`)
- **Git**: `2.30+`
- **PostgreSQL / Supabase**: Supabase cloud instance or local PostgreSQL 16+ via Docker

---

## 🚀 Quick Start Guide

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/MTLab1122/ShifaDesk.git
cd ShifaDesk
pnpm install
```

### 2. Configure Environment Variables

```bash
# Copy the master environment template
cp .env.example .env

# Copy app-specific environment files
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local

# Verify environment variables
node scripts/verify-env.mjs
```

### 3. Initialize Database (Prisma)

```bash
# Generate Prisma Client
pnpm run db:generate

# (Optional) Launch local PostgreSQL container
docker compose -f infrastructure/database/docker-compose.yml up -d
```

### 4. Run Development Servers

```bash
# Run both Backend API and Frontend Web concurrently
pnpm dev

# Or run individually:
pnpm dev:api    # Starts NestJS on http://localhost:4000
pnpm dev:web    # Starts Next.js on http://localhost:3000
```

- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- **Health Check**: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)
- **Swagger Documentation**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

---

## 🛠️ Monorepo Commands

| Command | Action |
| :--- | :--- |
| `pnpm dev` | Starts all applications in parallel watch mode |
| `pnpm build` | Builds shared packages, API and Web applications |
| `pnpm build:packages` | Compiles TypeScript declarations for packages |
| `pnpm typecheck` | Executes strict TypeScript checks across all workspaces |
| `pnpm lint` | Runs ESLint across all apps and packages |
| `pnpm lint:fix` | Automatically fixes auto-fixable lint issues |
| `pnpm test` | Runs unit and integration test suites |
| `pnpm format` | Formats all files using Prettier |
| `pnpm format:check` | Verifies code conforms to Prettier formatting rules |
| `pnpm db:generate` | Generates Prisma client types from schema |

---

## 🔒 Security & Healthcare Compliance

- **Zero Secret Commits**: Git rules block hardcoded credentials.
- **Role Isolation**: Strict Separation between public anon tokens and private service role keys.
- **Safe Responses**: Production API filters prevent internal stack trace leaks.
- Refer to [SECURITY.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/SECURITY.md) for full compliance protocols.

---

## 👥 Three-Agent Team Collaboration

MatabAI development is coordinated across three dedicated execution roles:
- **Agent 1 (Frontend Lead)**: Next.js App Router, UI components, Tailwind/Shadcn, client state, and frontend tests.
- **Agent 2 (Backend & DB Lead)**: NestJS architecture, Supabase/Prisma migrations, API controllers, and integration tests.
- **Agent 3 (Platform & QA Lead)**: Shared contracts, CI pipeline, architecture docs, performance benchmarks, and release verification.

See [AGENT_WORKFLOW.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/AGENT_WORKFLOW.md) for collaboration guidelines.

---

## 📄 Documentation Index

- [ARCHITECTURE.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/ARCHITECTURE.md) — System Architecture & Module Boundaries
- [DATABASE.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/DATABASE.md) — PostgreSQL / Supabase Strategy & Migrations
- [API.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/API.md) — REST API Conventions & Error Contracts
- [PRODUCTION_READINESS.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/docs/production/PRODUCTION_CHECKLIST.md) — Production Readiness, DevOps & Go-Live Checklist
- [PRODUCTION_ARCHITECTURE.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/docs/production/PRODUCTION_ARCHITECTURE.md) — Production Infrastructure Topology, Compute Tiers & High Availability
- [DEPLOYMENT_GUIDE.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/docs/production/DEPLOYMENT_GUIDE.md) — Multi-Environment Deployment Guide & Release Workflows
- [SECURITY_HARDENING.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/docs/production/SECURITY_HARDENING.md) — Zero-Trust Security Architecture, Encryption & Threat Model
- [BACKUP_AND_RECOVERY.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/docs/production/BACKUP_AND_RECOVERY.md) — Backup Automation, RPO/RTO Targets & Disaster Recovery
- [MONITORING_AND_ALERTING.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/docs/production/MONITORING_AND_ALERTING.md) — Observability, Health Probes & Alerting Thresholds
- [INCIDENT_RESPONSE.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/docs/production/INCIDENT_RESPONSE.md) — Incident Response Runbooks, Severity Matrix & Post-Mortem Guidelines
- [ROLLBACK_PROCEDURE.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/docs/production/ROLLBACK_PROCEDURE.md) — Code & Database Rollback Standard Operating Procedures
- [LOAD_TESTING.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/docs/production/LOAD_TESTING.md) — Performance Benchmark Runner & Capacity Planning
- [SAAS_SUBSCRIPTION_PLATFORM.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/docs/saas/SAAS_SUBSCRIPTION_PLATFORM.md) — SaaS Subscription Management, Tenant Onboarding & Platform Administration
- [CLINICAL_EMR_LITE.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/docs/clinical/CLINICAL_EMR_LITE.md) — Clinical Encounters, Longitudinal EMR-Lite & Prescriptions
- [ADVANCED_ANALYTICS_BI.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/docs/analytics/ADVANCED_ANALYTICS_BI.md) — Business Intelligence, Executive Dashboards & Scheduled Reporting
- [FINANCIAL_MANAGEMENT.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/docs/finance/FINANCIAL_MANAGEMENT.md) — Billing, Invoicing, Multi-Tender Payments & Cash Drawers
- [DIAGNOSTIC_LABORATORY.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/docs/laboratory/DIAGNOSTIC_LABORATORY.md) — Pathology Specimen & Report Delivery
- [SECURITY.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/SECURITY.md) — Security & Compliance Standards
- [CONTRIBUTING.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/CONTRIBUTING.md) — Engineering Standards & Git Conventions
- [AGENT_WORKFLOW.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/AGENT_WORKFLOW.md) — Parallel Development Strategy
- [PHASE_TRACKER.md](file:///c:/Users/muham/OneDrive/Desktop/MatabAI%20(ShifaDesk)/PHASE_TRACKER.md) — Project Roadmap & Verification Milestones
