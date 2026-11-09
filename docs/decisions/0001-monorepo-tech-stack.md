# ADR 0001: Monorepo Architecture & Technology Stack

## Context
MatabAI requires parallel development of a modern web frontend, an enterprise-grade backend API, and shared validation/contracts across three parallel agents.

## Decision
We adopted a pnpm monorepo consisting of:
- Next.js 15 (App Router) for Web Frontend.
- NestJS 10 for Backend API.
- Shared packages for types, configuration, and Zod schemas.

## Status
Accepted and verified in Phase 0.
