# Environment Configuration Reference — MatabAI (ShifaDesk)

This document provides a comprehensive specification of every environment variable utilized across the MatabAI platform (Phases 0 through 15), including data types, default values, sensitivity levels, and staging vs. production requirements.

---

## 1. Master Environment Variable Matrix

| Variable | Type | Required | Environment | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | `string` | **Yes** | All | Deployment mode (`development`, `staging`, `production`, `test`). |
| `PORT` | `number` | **Yes** | All | API listener port (default: `4000`). |
| `DATABASE_URL` | `string` | **Yes** | All | Supabase/PostgreSQL connection string with pooling. In production, must include `sslmode=require`. |
| `JWT_SECRET` | `string` | **Yes** | All | Secret key for signing Auth tokens. Min 32 chars in staging/production. |
| `JWT_EXPIRES_IN` | `string` | **Yes** | All | Auth token lifetime (e.g., `15m`, `1d`, `7d`). |
| `WEB_URL` | `string` | **Yes** | All | Public canonical URL for the Web application frontend. |
| `API_URL` | `string` | **Yes** | All | Public canonical URL for the API backend. |
| `STORAGE_REPORT_ENCRYPTION_KEY` | `string` | **Yes** | All | 64-character hexadecimal key (32 bytes) for AES-256-GCM diagnostic report encryption at rest. |
| `REPORT_STORAGE_PATH` | `string` | **Yes** | All | Base directory or bucket path for encrypted reports (e.g., `./storage/reports`). |
| `RATE_LIMIT_TTL_SECONDS` | `number` | No | All | Sliding window duration in seconds (default: `60`). |
| `RATE_LIMIT_MAX_REQUESTS` | `number` | No | All | Max requests allowed per window per IP/client (default: `120`). |
| `LOG_FORMAT` | `string` | No | Staging/Prod | Log output formatting (`pretty` for dev, `json` for staging/prod). |
| `METRICS_ENABLED` | `boolean` | No | Staging/Prod | Enables runtime metrics endpoint at `/api/v1/health/metrics` (`true`). |
| `SHUTDOWN_TIMEOUT_MS` | `number` | No | Staging/Prod | Graceful connection drainage timeout in milliseconds (default: `15000`). |

---

## 2. External Provider Gateways & Credentials

External integrations require specific partner credentials. If credentials are missing, the system boots normally, logs a clear warning, and marks the gateway as `BLOCKED (CREDENTIALS_REQUIRED)`. **Zero fake or simulated deliveries occur.**

### 2.1 Meta WhatsApp Cloud API (Phases 6–7)
| Variable | Required | Staging / Prod Value |
| :--- | :--- | :--- |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional | WhatsApp Business Account phone number ID from Meta Developer Console. |
| `WHATSAPP_ACCESS_TOKEN` | Optional | System user permanent access token with `whatsapp_business_messaging`. |
| `WHATSAPP_VERIFY_TOKEN` | Optional | Secret verification webhook token configured in Meta App settings. |
| `WHATSAPP_APP_SECRET` | Optional | Meta App secret for validating `X-Hub-Signature-256` payload signatures. |

### 2.2 AI Receptionist & LLM Integration (Phases 7, 9)
| Variable | Required | Staging / Prod Value |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Optional | Google AI Studio or Vertex AI API key for Gemini 1.5 Pro / Flash. |

### 2.3 AI Voice Receptionist & Telephony IVR (Phase 9)
| Variable | Required | Staging / Prod Value |
| :--- | :--- | :--- |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio account SID. |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio authentication token for webhook signature validation. |
| `TWILIO_PHONE_NUMBER` | Optional | E.164 Twilio incoming phone number for voice calls. |

### 2.4 Payment Gateways (Phases 11, 14)
| Variable | Required | Staging / Prod Value |
| :--- | :--- | :--- |
| `SAFEPAY_API_KEY` | Optional | Safepay merchant API key for online PKR card processing. |
| `SAFEPAY_SECRET_KEY` | Optional | Safepay shared secret key for webhook HMAC verification. |
| `SAFEPAY_ENVIRONMENT` | Optional | `sandbox` for staging; `production` for live. |
| `RAAST_PARTICIPANT_ID` | Optional | SBP Raast participant bank member identifier. |
| `RAAST_API_SECRET` | Optional | SBP Raast cryptographic private key / secret. |

### 2.5 Email & SMS Notification Providers (Phase 8)
| Variable | Required | Staging / Prod Value |
| :--- | :--- | :--- |
| `SMTP_HOST` | Optional | Outbound SMTP host (e.g., `smtp.sendgrid.net`, `smtp.mailgun.org`). |
| `SMTP_PORT` | Optional | Outbound SMTP port (`587` or `465`). |
| `SMTP_USER` | Optional | SMTP authentication username. |
| `SMTP_PASSWORD` | Optional | SMTP authentication secret password. |
| `SMS_GATEWAY_API_KEY` | Optional | Telco SMS gateway API token (e.g., Telenor, Zong, Twilio SMS). |

---

## 3. Secret Management & Compliance Rules

1. **Zero Secrets in Code:** Never commit `.env`, `.env.staging`, or `.env.production` to git. All secret values are strictly injected at deployment time.
2. **Key Rotation Protocol:**
   - `JWT_SECRET`: Rotate quarterly or immediately if compromised. Invalidates all active sessions.
   - `STORAGE_REPORT_ENCRYPTION_KEY`: Dual-key re-encryption tool required if rotating storage key.
   - Webhook Secrets: Rotate independently in provider console and platform configuration simultaneously.
