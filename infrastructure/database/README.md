# Database Infrastructure & Supabase Strategy

This directory contains the database initialization templates, Docker compose service for local development, and configuration rules for PostgreSQL and Supabase.

## Supabase Connection Architecture

MatabAI is designed for enterprise healthcare multi-tenancy on PostgreSQL / Supabase.

### 1. Connection Strings

- **Transaction Pooler (`DATABASE_URL`)**:
  - Port: `6543`
  - Mode: Transaction Mode (PgBouncer / Supavisor)
  - Used by: Runtime backend API instances for high-concurrency stateless query execution.
  
- **Direct Connection (`DIRECT_URL`)**:
  - Port: `5432`
  - Mode: Session / Direct PostgreSQL
  - Used by: Prisma migrations (`prisma migrate dev`, `prisma db push`) and schema sync.

### 2. Local PostgreSQL Setup

If running without a cloud Supabase project:
```bash
docker compose -f infrastructure/database/docker-compose.yml up -d
```

### 3. Migration Workflow

1. Modify `apps/api/prisma/schema.prisma`
2. Generate Prisma Client:
   ```bash
   pnpm db:generate
   ```
3. Run migration in development:
   ```bash
   pnpm --filter @matabai/api db:migrate --name <migration_name>
   ```
4. Deploy migrations to staging/production:
   ```bash
   pnpm --filter @matabai/api prisma migrate deploy
   ```
