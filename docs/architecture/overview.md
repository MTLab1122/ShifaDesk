# Architecture Overview

## Monorepo Topology
MatabAI is built as a unified TypeScript monorepo using `pnpm` workspaces. This structure enables rapid sharing of contracts, validation schemas, and configuration across the frontend and backend without requiring npm registry publication.

### Separation of Concerns
- **Domain Layer (`packages/shared`)**: Pure data structures, enums, response formats.
- **Validation Layer (`packages/validation`)**: Zod schemas used to validate runtime input at both client boundaries and API ingress.
- **Client Application (`apps/web`)**: Next.js 15 App Router providing the staff dashboard, doctor portal, and administrative console.
- **Server Application (`apps/api`)**: NestJS 10 REST API providing secure endpoints, multi-tenant isolation, and third-party integrations (WhatsApp, Supabase, LLM).
