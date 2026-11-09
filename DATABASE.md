# MatabAI Database Strategy

## 1. Foundation Overview

MatabAI utilizes PostgreSQL via **Supabase** as its foundational persistence engine, paired with **Prisma ORM** for type-safe queries, connection management, and declarative migrations.

---

## 2. Multi-Tenancy Architecture

MatabAI is a multi-tenant healthcare application where each clinic or hospital network operates as an isolated tenant.

### Isolation Strategy: Discriminator Column with Row-Level Security (RLS)
- Every table holding clinic or patient data contains a `tenant_id` column (UUID).
- Foreign keys ensure referential integrity strictly within the same tenant.
- PostgreSQL Row-Level Security (RLS) policies enforce that queries from application connections (or Supabase direct client) cannot access records belonging to other tenants.
- Indexed `tenant_id` columns prevent table scans and enforce tenant query performance.

---

## 3. Connection Management & Pooling

Healthcare clinic workloads have high burst traffic during morning clinic hours. To handle concurrent connections reliably without exhausting database connection limits:

```text
┌───────────────────────────────────────┐
│        NestJS API Instances           │
└──────────────────┬────────────────────┘
                   │
                   ▼ (Port 6543)
┌───────────────────────────────────────┐
│  Supavisor / PgBouncer Pooler         │
│  - Mode: Transaction                  │
│  - URL: DATABASE_URL                  │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│     PostgreSQL Engine (Supabase)      │
└──────────────────▲────────────────────┘
                   │
                   │ (Port 5432 - Session)
                   │ URL: DIRECT_URL
┌──────────────────┴────────────────────┐
│      Prisma Migration Engine          │
└───────────────────────────────────────┘
```

1. **Transaction Pooler (`DATABASE_URL`)**:
   - URL: `postgresql://postgres:[PASSWORD]@[REF].pooler.supabase.com:6543/postgres?pgbouncer=true`
   - Purpose: Runtime CRUD operations executed by NestJS `PrismaService`.
2. **Direct Connection (`DIRECT_URL`)**:
   - URL: `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`
   - Purpose: Migration execution via `prisma migrate dev` or `prisma migrate deploy`.

---

## 4. Migration Strategy

- **Development**:
  ```bash
  # 1. Update schema.prisma
  # 2. Run local or dev migration
  pnpm --filter @matabai/api prisma migrate dev --name <description_of_change>
  ```
- **CI/CD & Production**:
  ```bash
  # Migrations applied during deployment pipeline before app container starts
  pnpm --filter @matabai/api prisma migrate deploy
  ```

---

## 5. Phase 0 Schema Baseline

In Phase 0, speculative business tables are intentionally omitted to maintain documentation integrity and prevent premature schema locking.

The baseline table is `SystemHealthCheck`, used for runtime connectivity verification:

```prisma
model SystemHealthCheck {
  id        String   @id @default(uuid())
  checkKey  String   @unique @map("check_key")
  status    String   @default("ok")
  checkedAt DateTime @default(now()) @updatedAt @map("checked_at")

  @@map("system_health_checks")
}
```

---

## 6. Security & Credential Rules

1. `SUPABASE_SERVICE_ROLE_KEY` is restricted exclusively to the backend runtime.
2. Web clients are restricted to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Database credentials must never be committed to source control.
4. Database connections in staging and production must mandate TLS (`sslmode=require`).
