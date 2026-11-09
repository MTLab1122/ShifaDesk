# Three-Agent Development Workflow & Ownership

MatabAI is built using a coordinated three-agent parallel engineering workflow. This document defines domains of responsibility, collaboration protocols, and conflict avoidance mechanisms.

---

## 1. Agent Domain Ownership

| Agent | Core Responsibilities | Primary Workspace Paths |
| :--- | :--- | :--- |
| **Agent 1 (Frontend)** | • Next.js 15 App Router architecture<br>• Tailwind CSS and Shadcn UI system<br>• TanStack Query caching & client state<br>• Responsive viewports and localized UI layout<br>• Frontend unit/component tests (Vitest) | `apps/web/`<br>`packages/config/src/tailwind.ts` |
| **Agent 2 (Backend & DB)** | • NestJS 10 modular boundaries<br>• Database schema (Prisma/PostgreSQL)<br>• Supabase connectivity & connection pooling<br>• Security headers, CORS, validation pipes<br>• Backend unit/e2e tests (Jest) | `apps/api/`<br>`infrastructure/database/` |
| **Agent 3 (Platform & QA)** | • Shared TypeScript contracts & DTOs<br>• Shared Zod validation schemas<br>• Monorepo tooling, pnpm & tsconfig<br>• CI/CD workflows & automation scripts<br>• Quality verification and architectural docs | `packages/shared/`<br>`packages/validation/`<br>`docs/`<br>`.github/` |

---

## 2. Git Branch Strategy for Parallel Execution

To avoid merge conflicts and race conditions:
1. **Branch Naming**:
   - Agent 1: `agent-1/feat-web-<topic>`
   - Agent 2: `agent-2/feat-api-<topic>`
   - Agent 3: `agent-3/feat-shared-<topic>`
2. **Shared File Protocol**:
   - `package.json`, `pnpm-workspace.yaml`, and `tsconfig.base.json` are governed exclusively by **Agent 3**.
   - Agents 1 & 2 must request contract or configuration changes through shared packages (`packages/shared`, `packages/validation`) rather than altering root files directly.
3. **Synchronization**:
   - Shared contracts must be merged to `develop` before dependent frontend/backend features are finalized.

---

## 3. Communication & Verification Loop

```text
[ Agent 3 ] Defines contracts in @matabai/shared & @matabai/validation
      │
      ├────────────────────────┬────────────────────────┐
      ▼                        ▼                        ▼
[ Agent 1 ]              [ Agent 2 ]              [ Agent 3 ]
Implements UI with       Implements API with      Runs CI validation &
shared contracts         shared contracts         e2e verification
      │                        │                        │
      └────────────────────────┼────────────────────────┘
                               ▼
                    [ Pull Request to develop ]
                               ▼
                    [ Automated CI Verification ]
```

---

## 4. Conflict Resolution Rules

1. **Schema Conflicts**: The Prisma schema in `apps/api/prisma/schema.prisma` is owned by Agent 2, reviewed by Agent 3.
2. **Contract Disagreements**: If a contract in `@matabai/shared` needs modification, Agent 3 creates a deprecation pathway or coordinated PR updating both consumers.
3. **Dependency Versioning**: All workspace dependencies must use synchronized versions specified in the root catalog/workspace.
