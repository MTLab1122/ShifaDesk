# Production Deployment Guide — MatabAI (ShifaDesk)

This guide documents the complete end-to-end deployment procedure for MatabAI (ShifaDesk) across staging and production environments.

---

## 1. Prerequisites & Target Topology

### 1.1 Infrastructure Requirements
- **Node.js:** v20.x or v22.x LTS (strictly pinned in `.nvmrc` and `package.json`).
- **Package Manager:** `pnpm` v9.x or v10.x.
- **Database:** Supabase PostgreSQL 15+ (Transaction Connection Pooling with PgBouncer).
- **Process Manager / Compute:** AWS ECS Fargate, Render Web Service, Railway, or Google Cloud Run.
- **Reverse Proxy / Edge:** Cloudflare with TLS 1.3, DDoS mitigation, and Web Application Firewall (WAF).
- **Storage:** AWS S3 (or S3-compatible private object storage) for encrypted diagnostic reports.

---

## 2. Environment Verification Protocol

Before initiating any build or deployment, execute the environment validator:

```bash
# Validate staging environment file
node scripts/verify-env.mjs --env=.env.staging

# Validate production environment file
node scripts/verify-env.mjs --env=.env.production
```

The validator verifies:
1. All required environment variables are present and non-empty.
2. `NODE_ENV` matches the target deployment mode (`staging` or `production`).
3. `DATABASE_URL` contains `sslmode=require` in production mode.
4. `JWT_SECRET` is at least 32 characters in production.
5. All third-party credentials (WhatsApp, Twilio, Safepay, Raast, SMTP, SMS) are inspected. Unconfigured integrations are identified with warning messages without aborting execution.

---

## 3. Database Migration Execution

Database migrations must run sequentially **prior** to rolling out new application code replicas.

### 3.1 Pre-Migration Backup (Mandatory)
```bash
# Execute snapshot backup with SHA-256 integrity verification
node scripts/db-backup.mjs
```

### 3.2 Running Migrations
Use the **direct** PostgreSQL connection string (bypassing PgBouncer pooler on port 5432):

```bash
# In CI/CD or production host:
pnpm --filter @matabai/prisma db:deploy
```

Verify database constraints and multi-tenant schema isolation:
```bash
node scripts/db-verify-constraints.mjs
```

---

## 4. Multi-Service Build Steps

### 4.1 Build Shared Packages
```bash
pnpm build:packages
```

### 4.2 Generate Prisma Client
```bash
pnpm --filter @matabai/prisma generate
```

### 4.3 Compile API Backend
```bash
pnpm --filter @matabai/api build
```
Artifacts are generated in `apps/api/dist/`.

### 4.4 Build Web Frontend
```bash
pnpm --filter @matabai/web build
```
Production output is located in `apps/web/.next/`.

---

## 5. Deployment Options

### Option A: Automated GitHub Actions CI/CD (Recommended)
1. Push release tag `v*.*.*` or merge into `main` branch.
2. The `.github/workflows/deploy-production.yml` workflow triggers automatically.
3. Production environment requires authorized human sign-off in the GitHub UI.
4. The workflow performs:
   - Environment secret validation.
   - Pre-deployment database backup.
   - Database migration deployment.
   - Application build & push to registry.
   - Zero-downtime rolling restart.
   - Post-deployment smoke test (`scripts/production-smoke-test.mjs`).

### Option B: Docker Container Deployment
Use multi-stage production Dockerfiles:

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9.15.4
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN pnpm install --frozen-lockfile
RUN pnpm build:packages
RUN pnpm --filter @matabai/prisma generate
RUN pnpm --filter @matabai/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@9.15.4
COPY --from=builder /app ./
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
```

---

## 6. Post-Deployment Verification

Immediately following deployment, run the automated smoke testing suite against the live cluster:

```bash
API_URL=https://api.yourdomain.com node scripts/production-smoke-test.mjs
```

The smoke test validates:
- [x] Liveness probe (`GET /api/v1/health/live`) returns HTTP 200 within 50ms.
- [x] Readiness probe (`GET /api/v1/health/ready`) verifies DB connection and report storage.
- [x] Runtime metrics (`GET /api/v1/health/metrics`) confirm memory and process health.
- [x] SaaS Subscription Plans (`GET /api/v1/saas/plans`) return active plans without authentication.
- [x] Rate limiting headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) are present.
- [x] Correlation ID propagation (`X-Correlation-ID`) functions across all responses.
- [x] Unconfigured third-party adapters report `BLOCKED (CREDENTIALS_REQUIRED)` cleanly.
