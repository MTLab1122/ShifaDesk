# Database Migrations & Schema Management — MatabAI (ShifaDesk)

This document outlines the database migration strategy, zero-downtime schema evolution procedures, constraint verification, and rollbacks for MatabAI (ShifaDesk) on PostgreSQL / Supabase.

---

## 1. Migration Philosophy & Rules

1. **Additive Changes First:** Never drop or rename active columns in the same release as code changes. All schema mutations must follow the **Expand and Contract** pattern:
   - **Phase 1 (Expand):** Add new optional columns/tables.
   - **Phase 2 (Dual-Write/Read):** Deploy application code that reads new format and writes to both.
   - **Phase 3 (Backfill):** Backfill legacy data into new structures.
   - **Phase 4 (Contract):** Mark old columns deprecated and remove in subsequent release.
2. **Direct Pooler Connection for DDL:**
   - PgBouncer on port `6543` does not support transaction-scoped advisory locks required by Prisma migration engine.
   - Always connect to direct port `5432` with `sslmode=require` when running `pnpm --filter @matabai/prisma db:deploy`.
3. **Mandatory Pre-Migration Checksum Backup:**
   - Every migration run must be preceded by `node scripts/db-backup.mjs`.

---

## 2. Automated Schema & Constraint Verification

MatabAI includes an automated multi-tenant constraint audit tool (`scripts/db-verify-constraints.mjs`).

Run before and after migrations:
```bash
node scripts/db-verify-constraints.mjs
```

### Verification Checks Performed:
- **Tenant Scoping:** Audits all 100 Prisma models to verify foreign key relationships to `Organization` or `Clinic`.
- **Unique Indexes:** Asserts compound uniqueness on tenant-scoped codes (e.g., `[clinicId, code]`, `[organizationId, slug]`).
- **Referential Integrity:** Enforces `onDelete: Cascade` or `onDelete: Restrict` where appropriate, preventing orphaned records.
- **Row-Level Security (RLS):** Checks table policy definitions on sensitive clinical tables.

---

## 3. Migration Workflow for Releases

### In Local Development:
```bash
# 1. Modify packages/prisma/schema.prisma
# 2. Create and test migration locally
pnpm --filter @matabai/prisma db:migrate
```

### In Staging / Production:
```bash
# 1. Pre-deployment backup
node scripts/db-backup.mjs

# 2. Deploy pending migrations
pnpm --filter @matabai/prisma db:deploy

# 3. Validate constraint and schema health
node scripts/db-verify-constraints.mjs
```

---

## 4. Failed Migration Recovery & Rollback

If a migration fails midway:
1. **Assess Transaction State:** PostgreSQL supports transactional DDL. Most failed migrations roll back automatically without schema corruption.
2. **Resolve Migration Record:**
   - Inspect the `_prisma_migrations` table:
     ```sql
     SELECT id, migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;
     ```
   - If a migration is marked failed:
     ```bash
     pnpm --filter @matabai/prisma prisma migrate resolve --rolled-back "20261118_migration_name"
     ```
3. **Restore from Snapshot:** If data was altered, follow `docs/production/BACKUP_AND_RECOVERY.md`.
