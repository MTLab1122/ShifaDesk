# ADR 0002: Database & ORM Selection

## Context
Healthcare applications require relational data integrity, strict multi-tenancy, declarative migrations, and high concurrency.

## Decision
We selected **PostgreSQL** hosted via **Supabase**, combined with **Prisma ORM**.
- Direct connection (port 5432) is used for migrations.
- Transaction connection pooling (port 6543 via PgBouncer/Supavisor) is used for runtime traffic.

## Status
Accepted and verified in Phase 0.
