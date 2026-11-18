# Production Rollback Procedure — MatabAI (ShifaDesk)

This document outlines the standard operating procedure for rolling back application deployments and database migrations on MatabAI (ShifaDesk).

---

## 1. Rollback Criteria & Decision Framework

A production rollback is mandatory if any of the following occur within 30 minutes of a deployment:
1. **Liveness or Readiness Failure:** Multiple API replicas fail `/ready` probes or crash-loop.
2. **Elevated Error Rates:** HTTP 5xx error rate exceeds 1% of total traffic.
3. **P95 Latency Degradation:** P95 latency triples compared to pre-deployment baseline.
4. **Data Corruption / RLS Leak:** Any security regression or unexpected multi-tenant data leak.
5. **Critical Feature Disruption:** Patient appointments cannot be booked, digital queue tokens cannot be issued, or clinical encounters cannot be saved.

---

## 2. Code & Deployment Rollback

### Step 1: Revert Container / Service to Previous Stable Version
- **GitHub Actions / Tag Release:**
  Trigger redeployment of the previous release tag (e.g., `v1.14.0` instead of `v1.15.0`).
- **Render / ECS / Railway:**
  Select the last known healthy deployment in the deployment history and click **Rollback to this deployment**.
  ```bash
  # Example AWS ECS rollback:
  aws ecs update-service --cluster matabai-prod --service matabai-api --task-definition matabai-api:PREVIOUS_REVISION
  ```

### Step 2: Ingress & CDN Cache Invalidation
Purge edge caches if static assets (Next.js CSS/JS chunks) were deployed:
```bash
# Cloudflare API cache purge:
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
     -H "Authorization: Bearer $CF_API_TOKEN" \
     -H "Content-Type: application/json" \
     --data '{"purge_everything":true}'
```

---

## 3. Database Migration Rollback

Because MatabAI enforces the **Expand and Contract** pattern (all migrations are backwards-compatible additions), rolling back application code does **not** usually require rolling back database migrations immediately.

However, if a schema migration itself caused severe locking, performance degradation, or data corruption:

### Step 1: Execute Reverse Migration (if available)
If a corresponding down-migration script exists:
```bash
# In CI or bastion host:
pnpm --filter @matabai/prisma prisma db execute --file ./packages/prisma/migrations/rollback.sql
```

### Step 2: Mark Prisma Migration as Rolled Back
```bash
pnpm --filter @matabai/prisma prisma migrate resolve --rolled-back "20261118_migration_name"
```

### Step 3: Emergency Point-In-Time Restore (Catastrophic Scenario)
If destructive changes occurred, restore from the mandatory pre-deployment backup:
```bash
# Inspect backup manifest
node scripts/db-restore-test.mjs

# Execute clean restore using pg_restore
pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" backups/db/backup_YYYYMMDD_HHMMSS.dump
```

---

## 4. Post-Rollback Verification

Immediately execute the automated production smoke test suite to verify system stability:

```bash
node scripts/production-smoke-test.mjs
```

Verify:
- [x] Liveness probe returns `200 OK`.
- [x] Readiness probe returns `200 OK`.
- [x] User authentication and login are operational.
- [x] Core clinical workflows function without errors.
- [x] Post status update in Slack `#ops-prod` confirming successful rollback.
