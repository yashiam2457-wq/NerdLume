# Security Remediation & Engineering Log

System: NerdLume (NerdyBro) Core Platform  
Assessment Period: November 2026  
Status: Remediations Applied • 100% Retest Verified  

---

## 1. Remediation Summary Table

| ID | Title | Target File | Severity | Action Taken | Retest |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SEC-01 | Unrestricted Static File Serving Exposing .env & DB | `server.py` & `server.js` | CRITICAL | Restricted static dispatcher to safe file extensions (.html, .css, .js, .png, etc.) and blocked sensitive directories | PASSED |
| SEC-02 | Hardcoded Plaintext Passwords & Exposed Keys | `server.py` & `.env` | HIGH | Read demo passwords from environment, sanitized active API keys from `.env`, added `.env.example` | PASSED |
| SEC-03 | API Key Query Parameter Leakage in Error Logs | `server.py:_post_json` | HIGH | Added regex scrubber to sanitize sensitive query parameters into `key=[REDACTED]` | PASSED |
| SEC-04 | System Prompt Disclosure via Client Debug Flag | `server.py:print_prompt_debug` | MEDIUM | Restricted prompt debug logging to server-level flag only; stripped `debugPrompts` from API response | PASSED |
| SEC-05 | Client-Controlled Plan Assignment in Node Server | `server.js:handleAuthSignup` | HIGH | Forced new signups to `plan = 'free'` unconditionally | PASSED |
| SEC-06 | Rate Limit Bypass via X-Forwarded-For Spoofing | `server.py` & `server.js` | HIGH | Only trust `X-Forwarded-For` if direct socket client is in `TRUSTED_PROXIES` | PASSED |
| SEC-07 | Missing Account Lockout for Failed Logins | `server.py` & `server.js` | MEDIUM | Added 15-minute temporary lockout after 5 consecutive failed login attempts | PASSED |
| SEC-08 | URL Parameter Injection in Google Tokeninfo | `server.py:handle_google_auth` | LOW | Strict URL-encoding on `id_token` prior to query string construction | PASSED |
| SEC-09 | Missing Secure & HttpOnly Session Cookies | `server.py` & `server.js` | MEDIUM | Added `Set-Cookie: nb_token=...; Path=/; HttpOnly; SameSite=Lax` headers | PASSED |
| SEC-10 | Incomplete Security Headers & Permissive CSP | `server.py` & `server.js` | MEDIUM | Added Permissions-Policy, strict CSP, X-Frame-Options, X-Content-Type-Options | PASSED |
| SEC-11 | Missing Allowed Static Extension Whitelist | `server.py:serve_static` | HIGH | Implemented strict whitelist of web-safe file extensions | PASSED |
| SEC-12 | Missing Repository .gitignore | Root `.gitignore` | MEDIUM | Created `.gitignore` ignoring `.env`, `*.sqlite3`, `node_modules`, `__pycache__` | PASSED |
| SEC-13 | Indirect Prompt Injection in Reference Formatting | `server.py:_build_quick_mode_prompt` | HIGH | Encapsulated reference text inside `<untrusted_reference_document>` with instruction hierarchy rules | PASSED |
| SEC-14 | Memory Leak in Sliding Rate Limiter State | `server.py:_check_rate_limit` | LOW | Implemented automatic stale IP and timestamp pruning when dictionary exceeds 1000 records | PASSED |
| SEC-15 | Free Plan Quota Mismatch in Test Suite | `test_prompt_debug.py` | LOW | Synchronized test quota history filling with central `PLAN_CONFIG` | PASSED |
| SEC-16 | Strict Proxy Trust & Wildcard Forbiddance | `server.py` & `server.js` | HIGH | Enforced strict `TRUSTED_PROXIES` validation forbidding wildcards, sanitizing candidate IPs | PASSED |
| SEC-17 | Frontend Secret Isolation & Template Sanitization | `src/` & `.env.example` | HIGH | Verified 100% backend-only secret isolation; sanitized all `.env.example` templates | PASSED |

---

## 2. Detailed Remediation Walkthrough

### Remediation SEC-01 & SEC-11: Static Asset Protection
- Component: `backend/server.py:serve_static` & `backend/server.js:serveStatic`
- Implementation: An `ALLOWED_STATIC_EXTENSIONS` whitelist (`.html`, `.css`, `.js`, `.mjs`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.ico`, `.woff`, `.woff2`, `.ttf`, `.webp`, `.txt`, `.docx`) was enforced. A `FORBIDDEN_STATIC_PARTS` filter explicitly denies requests targeting `.env`, `.git`, `.next`, `backend`, `node_modules`, `backup`, and forbidden files (`package.json`, `tsconfig.json`). Any attempt to access dotfiles or sensitive resources triggers an immediate HTTP 403 Forbidden.
- Regression Verification: Verified via `SecurityRemediationTestCase.test_serve_static_blocks_sensitive_files`.

### Remediation SEC-02 & SEC-12: Credentials & Version Control Defense
- Component: `backend/server.py:seed_users`, `.env`, `.gitignore`
- Implementation: Removed plaintext passwords from source code in `seed_users`, routing credential seeding through configurable environment variables (`NERDYBRO_ADMIN_PASSWORD`, etc.). Created root `.gitignore` to prevent secret commits, and replaced live API keys in `.env` and `backend/.env` with placeholders while preserving `.env.example`.

### Remediation SEC-03: Secret Masking in Error Logs
- Component: `backend/server.py:_post_json`
- Implementation: Wrapped HTTP error formatting with a sanitization regex:
  `safe_url = re.sub(r"([?&]key=)[^&]+", r"\1[REDACTED]", url)`
  This prevents raw API keys from surfacing in exception traces, error logs, or stdout.

### Remediation SEC-04: System Prompt Confidentiality
- Component: `backend/server.py:print_prompt_debug` & `handle_generate`
- Implementation: Removed client payload capability to enable debug output. Only server-side environment flag `DEBUG_PROMPT=true` can activate debug logging, and `debugPrompts` is stripped from public API responses in `handle_generate`.

### Remediation SEC-05: Plan Privilege Escalation
- Component: `backend/server.js:handleAuthSignup`
- Implementation: Enforced `const plan = 'free'` on registration, denying client manipulation of subscription tiers.

### Remediation SEC-06 & SEC-14: Rate Limiter Hardening & Memory Sanitation
- Component: `backend/server.py:client_ip` & `_check_rate_limit`
- Implementation: Added `TRUSTED_PROXIES` allowlist. Untrusted direct clients attempting to spoof `X-Forwarded-For` are ignored; their physical socket IP is enforced. Added periodic pruning to remove expired timestamps and delete empty IP buckets when tracking state exceeds 1,000 entries.

### Remediation SEC-07: Credential Stuffing & Account Lockout
- Component: `backend/server.py:handle_login`
- Implementation: Implemented an in-memory failed attempt counter with 15-minute sliding window. After 5 consecutive failed logins for an identifier, the endpoint returns HTTP 423 Locked. Successful login resets the counter.

### Remediation SEC-08: OAuth Parameter Sanitation
- Component: `backend/server.py:handle_google_auth`
- Implementation: URL-encoded `id_token` using `urllib.parse.quote(id_token, safe="")` before dispatching to Google's tokeninfo endpoint.

### Remediation SEC-09 & SEC-10: Security Headers & Session Cookies
- Component: `backend/server.py:end_headers`, `backend/server.js`
- Implementation: Added `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and strict `Content-Security-Policy`. Added `Set-Cookie: nb_token=...; Path=/; HttpOnly; SameSite=Lax` headers upon authentication.

### Remediation SEC-13: Indirect Prompt Injection Defense
- Component: `backend/server.py:_build_quick_mode_prompt`
- Implementation: Encapsulated user-supplied reference document formatting inside `<untrusted_reference_document>` XML tags accompanied by explicit instruction hierarchy directives prohibiting document instructions from overriding system rules.

