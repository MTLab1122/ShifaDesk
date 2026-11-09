# Contributing to MatabAI (ShifaDesk)

Thank you for contributing to MatabAI. This guide outlines development practices, commit rules, and pull request requirements.

---

## 1. Monorepo Principles

- **No Suppressed Errors**: TypeScript `strict` mode is enabled monorepo-wide. Do not use `@ts-ignore` or `any` without documented architectural reasons.
- **No Disabled Linter Rules**: Do not disable ESLint rules to pass CI.
- **Shared Package Hygiene**: Never import internal files directly from other packages (e.g. `../../packages/shared/src/index.ts`). Use the package alias `@matabai/shared`.

---

## 2. Branching Model

We follow a structured branching model:
- `main`: Production-ready release branch.
- `develop`: Integration branch for tested features.
- Feature branches: `feat/<agent-or-author>/<short-description>`
- Bugfix branches: `fix/<short-description>`
- Foundation/Chore: `chore/<description>`

---

## 3. Commit Message Conventions

We enforce [Conventional Commits](https://www.conventionalcommits.org/):

Format: `<type>(<scope>): <short description>`

### Types:
- `feat`: A new user-facing or platform feature.
- `fix`: A bug fix.
- `docs`: Documentation-only updates.
- `style`: Changes that do not affect the meaning of code (formatting, white-space).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Maintenance tasks, dependency updates, tooling.

### Examples:
- `feat(api): initialize modular boundaries and health endpoint`
- `feat(web): configure next.js 15 app router and shadcn foundation`
- `chore(repo): configure pnpm workspace and typescript base`

---

## 4. Verification Before Submitting PR

Before pushing code or opening a PR, ensure all checks pass locally:

```bash
# 1. Typecheck
pnpm run typecheck

# 2. Lint
pnpm run lint

# 3. Unit and integration tests
pnpm run test

# 4. Monorepo build
pnpm run build

# 5. Format check
pnpm run format:check
```
