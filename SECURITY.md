# MatabAI Security Policy & Foundation

## 1. Core Principles

As a medical clinic operations platform handling Electronic Health Records (EHR) and Protected Health Information (PHI), MatabAI enforces strict defense-in-depth principles:

1. **Least Privilege**: Components, services, and tokens have only the permissions strictly required.
2. **Zero-Trust Multi-Tenancy**: Tenant isolation must be cryptographically or policy-enforced at the database and application tiers.
3. **Defense Against Credential Leaks**: API keys and service tokens must never enter source control.
4. **Uniform Input Validation**: All payloads must pass schema validation before entering business logic.

---

## 2. API Security Headers

The NestJS backend implements **Helmet** with the following protections:
- `Strict-Transport-Security`: Enforces HTTPS for all client traffic.
- `X-Content-Type-Options: nosniff`: Prevents MIME type sniffing.
- `X-Frame-Options: DENY`: Protects against clickjacking attacks.
- `X-XSS-Protection`: Prevents cross-site scripting in legacy browsers.

---

## 3. CORS Configuration

CORS policies restrict browser origins to configured clinic client domains:
- Local development defaults to `http://localhost:3000`.
- Production requires an explicit whitelist in the `CORS_ORIGIN` environment variable.
- Wildcards (`*`) with credential exchange are strictly forbidden.

---

## 4. Key Management & Token Boundary

| Secret | Scope | Accessibility |
| :--- | :--- | :--- |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend Only | High security. Grants admin bypass to Supabase. Never bundle into Next.js. |
| `SUPABASE_ANON_KEY` | Client & Backend | Public safe. Governed strictly by PostgreSQL Row Level Security (RLS). |
| `JWT_SECRET` | Backend Only | Minimum 32-character high entropy key for signing session tokens. |
| `DATABASE_URL` | Backend Only | Encrypted connection string with database credentials. |

---

## 5. Dependency Audit Instructions

All developers and automated CI pipelines must verify zero high-severity vulnerabilities before merging:

```bash
# Run vulnerability audit
pnpm audit

# In CI:
pnpm audit --audit-level high
```

---

## 6. Reporting Security Vulnerabilities

If you discover a security vulnerability within MatabAI, please disclose responsibly:
- Email: `security@matabai.com` or contact Muhammad Talha directly.
- Please do not open public GitHub issues for security vulnerabilities.
