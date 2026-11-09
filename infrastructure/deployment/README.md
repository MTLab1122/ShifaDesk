# Deployment Infrastructure Guide

This directory contains containerization templates and platform configurations for deploying MatabAI.

## Multi-Stage Container Builds

Both `Dockerfile.api` and `Dockerfile.web` implement multi-stage build patterns:
1. **Builder Stage**: Installs pinned dependencies, builds shared workspace packages, generates Prisma types, and compiles output.
2. **Runner Stage**: Uses minimal `node:20-alpine` images, runs as an unprivileged system user (`nestjs` / `nextjs`), and extracts only production artifacts.

## Deployment Targets

- **Backend API (`apps/api`)**: Railway, Render, Fly.io, or AWS ECS.
  - Set `DATABASE_URL` to transaction pooler.
  - Set `DIRECT_URL` to direct database port.
  - Expose port `4000`.
- **Frontend Web (`apps/web`)**: Vercel, Railway, or Netlify.
  - Set `NEXT_PUBLIC_API_URL` to the public backend domain.
  - Set `NEXT_PUBLIC_APP_NAME="MatabAI (ShifaDesk)"`.
