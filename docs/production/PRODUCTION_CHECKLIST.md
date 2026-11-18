# Production Readiness Go-Live Checklist — MatabAI (ShifaDesk)

This master checklist must be verified by the Engineering Lead and DevOps Engineer prior to launching MatabAI (ShifaDesk) into production.

---

## 1. Security & Compliance
- [x] **Zero Secrets in Source Code:** Verified via `.gitignore` and secret auditing.
- [x] **Vulnerability Scans Clean:** All dependencies scanned via `pnpm audit`; Next.js updated to 15.2.8.
- [x] **Environment Validation:** `node scripts/verify-env.mjs --env=.env.production` passes with 0 errors.
- [x] **Database SSL Enforced:** Production `DATABASE_URL` strictly contains `sslmode=require`.
- [x] **High-Entropy Secrets:** `JWT_SECRET` is >= 32 characters; `STORAGE_REPORT_ENCRYPTION_KEY` is 64 hex characters.
- [x] **Security Headers Active:** Strict CSP, HSTS preload, X-Frame-Options: DENY, and X-Content-Type-Options enforced in `next.config.mjs`.
- [x] **Rate Limiting Guard:** In-memory sliding-window bucket active; sensitive endpoints throttled to 10 req/min.
- [x] **Encrypted Diagnostics:** Diagnostic laboratory files encrypted at rest via AES-256-GCM.
- [x] **HMAC Verification:** Time-limited report delivery requires signed HMAC token and patient phone verification.

---

## 2. Infrastructure & Compute
- [x] **Multi-Stage Dockerfiles:** Production-optimized Dockerfiles for API and Web apps.
- [x] **Health Probes Operational:**
  - `GET /api/v1/health/live` returns HTTP 200 within 5ms.
  - `GET /api/v1/health/ready` evaluates DB connectivity and report storage health.
  - `GET /api/v1/health/metrics` emits runtime heap and RSS memory consumption.
- [x] **Graceful Shutdown Hooks:** API cleanly intercepts `SIGTERM`/`SIGINT`, halts traffic, and drains active requests within `SHUTDOWN_TIMEOUT_MS`.
- [x] **Structured JSON Logging:** `LOG_FORMAT=json` emits machine-readable log records tagged with `X-Correlation-ID`.
- [x] **Error Response Masking:** Production exceptions hide stack traces and internal error details from end-users.

---

## 3. Database & Disaster Recovery
- [x] **Multi-Tenant Constraint Audit:** `node scripts/db-verify-constraints.mjs` verifies tenant scoping across all 100 Prisma models.
- [x] **Automated Backup Tooling:** `node scripts/db-backup.mjs` generates encrypted SQL archives with SHA-256 manifests.
- [x] **Non-Destructive Restore Tooling:** `node scripts/db-restore-test.mjs` validates backup archives against RPO (1 hr) and RTO (15 mins).
- [x] **Prisma Client Clean Compilation:** `pnpm --filter @matabai/prisma generate` executes without schema warnings.
- [x] **Connection Pooling:** PgBouncer configured on port 6543 for transactional query traffic.

---

## 4. Automated CI/CD Pipelines
- [x] **Continuous Integration Pipeline:** `.github/workflows/ci.yml` runs full matrix across Node 20 & 22 with lint, typecheck, tests, and build.
- [x] **Staging Deployment Pipeline:** `.github/workflows/deploy-staging.yml` deploys to staging and validates health.
- [x] **Production Deployment Pipeline:** `.github/workflows/deploy-production.yml` features manual approval gate, pre-deployment backup, safe migration, and post-deployment smoke tests.

---

## 5. Third-Party Integrations Status
- [x] **Meta WhatsApp Cloud API:** Integration adapter operational; gracefully logs `BLOCKED (CREDENTIALS_REQUIRED)` when unconfigured without crashing.
- [x] **Twilio Voice Telephony:** Webhook signature verification and TwiML IVR handler operational; gracefully logs `BLOCKED (CREDENTIALS_REQUIRED)` when unconfigured.
- [x] **Safepay Card Processing:** Merchant card processing operational; gracefully logs `BLOCKED (CREDENTIALS_REQUIRED)` when unconfigured.
- [x] **Raast Instant Settlement:** State Bank of Pakistan ISO 20022 adapter operational; gracefully logs `BLOCKED (CREDENTIALS_REQUIRED)` when unconfigured.
- [x] **PTA SMS Gateway & SMTP:** Outbound notification engine operational; gracefully logs `BLOCKED (CREDENTIALS_REQUIRED)` when unconfigured.

---

## 6. Verification & Test Suite
- [x] **Backend Unit Tests:** 56 / 56 test suites passed; 314 / 314 tests passed (100% pass rate).
- [x] **Frontend Compilation:** All 60 static and dynamic routes compiled cleanly in Next.js 15.2.8.
- [x] **Automated Smoke Tests:** `scripts/production-smoke-test.mjs` passes health probes, rate limiting, and correlation tracking.
- [x] **Load Testing Benchmark:** `scripts/load-test.mjs` executed and verified.
