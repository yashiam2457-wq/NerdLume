# NerdLume — Production Integration & Operations Manual

This guide provides definitive setup, configuration, verification, and deployment instructions for NerdLume's three production integrations:
1. **Integration A**: AI Generation API Key Management & Resilient Provider Network
2. **Integration B**: Razorpay Payment Gateway & Subscription Billing
3. **Integration C**: Transactional Email & Password Recovery Infrastructure

---

## 1. Quick Environment Variable Reference

Create or update your local `.env` file in `NerdyBro/` (and `NerdyBro/backend/`). Never commit this file.

```env
# ── Server & Runtime Environment ──────────────────────────────────────────────
PORT=5050
NERDYBRO_PORT=5050
NERDYBRO_CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5050

# Database & Storage
NERDYBRO_DB_FILE=./data/nerdybro.sqlite3
NERDYBRO_DATA_FILE=./data/state.json
NERDYBRO_FILES_DIR=./data/generated
NERDYBRO_SESSION_TTL_DAYS=30
NERDYBRO_API_PROVIDER=ai-network
NERDYBRO_DEBUG_PROMPT=false
PLAN_UPGRADE_ALLOWED=false

# ── Integration A: AI Generation Provider Keys ─────────────────────────────────
GEMINI_API_KEY=AIzaSy...
MISTRAL_API_KEY=...
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...

AI_MAX_RETRIES=2
AI_RETRY_DELAY=1.0
AI_REQUEST_TIMEOUT=60
NERDYBRO_REFINEMENT_PASSES=2

# ── Integration B: Razorpay Payment Gateway ────────────────────────────────────
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# ── Integration C: Transactional Email Infrastructure ──────────────────────────
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=noreply@nerdlume.in
SMTP_FROM_NAME=NerdLume

# Resend API Configuration (Alternative)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@nerdlume.in
```

---

## 2. Integration A — AI Provider Setup

NerdLume implements an autonomous multi-agent generation network. Each provider owns specialized academic domains:

| Provider | Primary Specialization | Model | Dashboard / Key Generation |
| :--- | :--- | :--- | :--- |
| **Google AI Studio** | File/document parsing, syllabus analysis, multimodal input | `gemini-1.5-flash` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| **Mistral AI** | Deep reasoning, Cornell notes, code problems, numerical derivations | `mistral-small-latest` | [Mistral Console](https://console.mistral.ai/api-keys/) |
| **Groq AI** | High-speed structured exam questions, quizzes, mock tests, flashcards | `llama-3.3-70b-versatile` | [Groq Console](https://console.groq.com/keys) |
| **OpenAI** | Academic assistant fallback | `gpt-4o-mini` | [OpenAI Platform](https://platform.openai.com/api-keys) |

### Resilience & Security Architecture
- **Exponential Backoff**: Transient errors (HTTP 429, 500, 502, 503, 504, network timeouts) automatically retry with randomized jitter up to `AI_MAX_RETRIES` times.
- **Structured Error Taxonomy**: Errors are categorized without crashing into `INVALID_CREDENTIALS`, `EXPIRED_CREDENTIALS`, `RATE_LIMITED`, `INSUFFICIENT_QUOTA`, `PROVIDER_DOWNTIME`, `TIMEOUT`, and `MALFORMED_RESPONSE`.
- **Zero Credential Leakage**: All error logs and exception traces pass through regex redaction (`sanitize_ai_text`) removing API keys, secrets, and authorization headers.
- **Graceful Local Fallback**: When external AI providers are unconfigured or unreachable, the system automatically routes requests to deterministic academic study templates.

### Provider Diagnostic Health Check
To verify provider connectivity status without incurring generation charges:
```bash
# Basic status check
curl http://localhost:5050/api/ai/health

# Full live probe check
curl http://localhost:5050/api/ai/health?test=true
```

---

## 3. Integration B — Razorpay Payment Gateway & Subscriptions

### Step 1: Create API Keys
1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Navigate to **Settings** → **API Keys**.
3. Generate a key pair:
   - For testing: Select **Test Mode** (`rzp_test_...`).
   - For production: Select **Live Mode** (`rzp_live_...`).
4. Copy `Key Id` to `RAZORPAY_KEY_ID`.
5. Copy `Key Secret` to `RAZORPAY_KEY_SECRET`.

### Step 2: Configure Webhooks
1. In the Razorpay Dashboard, navigate to **Settings** → **Webhooks**.
2. Click **Add New Webhook**.
3. Set the **Webhook URL**:
   ```
   https://api.nerdlume.in/api/payment/webhook
   ```
   *(For local testing with ngrok: `https://<ngrok-id>.ngrok-free.app/api/payment/webhook`)*
4. Enter a strong secret string into **Secret** and set it as `RAZORPAY_WEBHOOK_SECRET` in your `.env`.
5. Under **Active Events**, select:
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.completed`
   - `subscription.halted`
6. Click **Create Webhook**.

### Pricing Structure & Security
Prices are hard-coded in the central server authority (`payment.SUBSCRIPTION_PLANS` and `server.PLAN_CONFIG`):
- **Free Scholar**: ₹0
- **Scholar Pro**: ₹149 / month • ₹1,199 / year (Save 33%)
- **Diamond Researcher**: ₹349 / month • ₹2,799 / year (Save 33%)

> **Security Rule**: The server enforces all amounts in paise. Any client-side price tampering is completely ignored. Payments require genuine Razorpay HMAC SHA-256 signature verification before any entitlement is upgraded.

---

## 4. Integration C — Transactional Email & Password Reset

### Supported Providers
- **SMTP** (`EMAIL_PROVIDER=smtp`): Works with Mailgun, SendGrid, Amazon SES, Postmark, or custom SMTP servers.
- **Resend** (`EMAIL_PROVIDER=resend`): Modern developer-first transactional email API.

### Setup Instructions

#### Option A: SMTP (Recommended for Production)
1. In your mail provider dashboard (e.g. Mailgun, SendGrid), verify your sender domain (`nerdlume.in`).
2. Add the required DNS records (DKIM, SPF, DMARC, MX).
3. Set in `.env`:
   ```env
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=postmaster@your-domain.mailgun.org
   SMTP_PASSWORD=your_smtp_password
   SMTP_FROM_EMAIL=noreply@nerdlume.in
   SMTP_FROM_NAME=NerdLume
   ```

#### Option B: Resend API
1. Create an account at [Resend](https://resend.com/).
2. Add and verify your domain in the Resend dashboard.
3. Generate an API Key under **API Keys**.
4. Set in `.env`:
   ```env
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_your_api_key
   RESEND_FROM_EMAIL=noreply@nerdlume.in
   ```

### Password Reset Security Measures
- **Hashed Nonces**: The server generates 32-byte URL-safe cryptographic tokens. Only the **SHA-256 hash** of the token is persisted to SQLite.
- **Zero Plaintext Tokens**: Tokens are never stored unhashed in the database and never logged.
- **15-Minute Expiration**: Reset tokens automatically expire 15 minutes after issuance.
- **Account Enumeration Protection**: The `/api/auth/reset-password` endpoint returns an identical generic confirmation regardless of whether the email exists.
- **Device Invalidation**: Successful password replacement immediately revokes all active session tokens across all devices for that user.
- **Rate Limiting**: Password reset requests are limited to a maximum of 5 requests per 15-minute window per IP/email.

---

## 5. Verification & Test Execution

### 1. Run Complete Automated Test Suite
From the repository root:
```bash
cd NerdyBro/backend
python -m unittest tests.test_api tests.test_security tests.test_prompt_debug tests.test_integrations
```

### 2. Verify Next.js Frontend Build
```bash
cd NerdyBro
npm run build
```

### 3. Verify Razorpay Signature Verification
Run the isolated payment test case:
```bash
cd NerdyBro/backend
python -m unittest tests.test_integrations.IntegrationTestCase.test_payment_signature_verification_hmac_sha256
```

### 4. Verify Webhook Idempotency & Replay Prevention
```bash
cd NerdyBro/backend
python -m unittest tests.test_integrations.IntegrationTestCase.test_webhook_signature_and_idempotency
```

---

## 6. Production Deployment Checklist

1. [ ] Set `NEXT_PUBLIC_APP_URL` to your production domain (`https://nerdlume.in`).
2. [ ] Set `NEXT_PUBLIC_API_URL` to your backend production URL (`https://api.nerdlume.in`).
3. [ ] Configure live Razorpay API keys (`rzp_live_...`) in server environment variables.
4. [ ] Configure Razorpay live webhook URL with HTTPS and match `RAZORPAY_WEBHOOK_SECRET`.
5. [ ] Verify domain SPF, DKIM, and DMARC DNS records for `SMTP_FROM_EMAIL` / `RESEND_FROM_EMAIL`.
6. [ ] Confirm SQLite database volume persistence or configure external database backup strategy.
7. [ ] Run `python -m unittest discover -s tests` to ensure all tests pass cleanly.
8. [ ] Execute `npm run build` on the Next.js frontend to verify clean asset compilation.
9. [ ] Run `curl https://api.nerdlume.in/api/ai/health` to confirm provider diagnostics.

