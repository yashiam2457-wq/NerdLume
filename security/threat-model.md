# Threat Model & Attack Surface Analysis

Target System: NerdLume (NerdyBro) Study Platform  
Methodology: STRIDE + OWASP Top 10:2021 + OWASP Top 10 for LLM Applications (2025)  

---

## 1. Trust Boundaries & Data Flow Diagram

```
[ External Untrusted Client ]
       │
       ▼  (HTTP / JSON / Base64 Files)
┌────────────────────────────────────────────────────────┐
│ Trust Boundary: Network Edge                           │
│ - Rate Limiting & IP Extraction                        │
│ - CORS Origin Validation & Security Headers            │
└────────────────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ Application Boundary: NerdyBro API Server              │
│ - Authentication (Session / Bearer / Token)            │
│ - Input Sanitization & Prompt Filtering Layer          │
│ - Authorization & Plan Quota Enforcement               │
└────────────────────────────────────────────────────────┘
       │                                  │
       ▼ (Direct File Access)             ▼ (AI Requests)
┌───────────────────────┐        ┌───────────────────────────────┐
│ Local File System     │        │ External AI Model Providers   │
│ - SQLite Database     │        │ - Gemini (File Conversion)    │
│ - Generated Artifacts │        │ - Mistral (Notes / Logic)     │
│ - Static Assets       │        │ - Groq (Quiz / Flashcards)    │
└───────────────────────┘        └───────────────────────────────┘
```

---

## 2. STRIDE Threat Categorization

### Spoofing
- T-SP-01: Client IP spoofing via attacker-supplied `X-Forwarded-For` header allowing total rate-limit bypass.
- T-SP-02: User impersonation through session token theft or unverified OAuth `id_token` query injections.

### Tampering
- T-TA-01: Direct parameter manipulation on `plan` during registration or profile updates to achieve unauthorized plan tiers.
- T-TA-02: Manipulation of reference document text to inject instructions that alter LLM outputs.

### Repudiation
- T-RE-01: Insufficient audit logging for authentication failures, password resets, and administrative events.

### Information Disclosure
- T-ID-01: Arbitrary server file retrieval (`.env`, `data/nerdybro.sqlite3`, `backend/server.py`) through unconstrained static file serving.
- T-ID-02: Hardcoded demo user credentials and live API keys in repository source code and commit history.
- T-ID-03: System prompt and model instruction disclosure via client-controllable `debug` parameters.
- T-ID-04: API key exposure in HTTP error traces and server log streams.

### Denial of Service
- T-DOS-01: Memory exhaustion due to unbound `_rate_counters` tracking without garbage collection.
- T-DOS-02: Unbounded request payload sizes or CPU-intensive document processing.

### Elevation of Privilege
- T-EP-01: Insecure direct object reference (IDOR) on historical generation records or download endpoints.
- T-EP-02: Unauthorized access to premium AI generation modes bypassing server-side plan validation.

---

## 3. OWASP Top 10 & LLM Threat Matrix

| Threat Code | Vulnerability Description | Category | Target Component |
| :--- | :--- | :--- | :--- |
| SEC-01 | Arbitrary Static File Disclosure (.env & DB) | A01:2021 Broken Access Control / A05:2021 Security Misconfig | `serve_static` (server.py & server.js) |
| SEC-02 | Hardcoded Credentials & Committed API Keys | A07:2021 Identification & Auth Failures | `server.py` demo records & `.env` |
| SEC-03 | API Key Leakage in Error Traces & Logs | A09:2021 Security Logging Failures | `_post_json` error handling |
| SEC-04 | System Prompt Disclosure via Client Debug Flag | OWASP LLM07: System Prompt Leakage | `print_prompt_debug` & `handle_generate` |
| SEC-05 | Client-Controlled Plan Assignment in Node Server | A01:2021 Broken Access Control | `backend/server.js` |
| SEC-06 | Rate Limit Bypass via X-Forwarded-For Spoofing | A04:2021 Insecure Design | `client_ip()` in `server.py` & `server.js` |
| SEC-07 | Missing Account Lockout for Failed Logins | A07:2021 Identification & Auth Failures | `handle_login` |
| SEC-08 | URL Parameter Injection in Google Tokeninfo | A03:2021 Injection / SSRF | `handle_google_auth` |
| SEC-09 | Missing HttpOnly Session Cookie Enforcement | A07:2021 Identification & Auth Failures | `handle_login` & `handle_signup` |
| SEC-10 | Incomplete Security Headers & Permissive CSP | A05:2021 Security Misconfiguration | `end_headers` & `server.js` |
| SEC-11 | Missing Allowed Static Extensions Whitelist | A01:2021 Broken Access Control | `serve_static` |
| SEC-12 | Untracked Secrets in VCS (Missing .gitignore) | A05:2021 Security Misconfiguration | Repository Root |
| SEC-13 | Indirect Prompt Injection via Document Formatting | OWASP LLM01: Prompt Injection | `_build_quick_mode_prompt` |
| SEC-14 | Unbounded Memory Growth in Rate Limiter State | A04:2021 Insecure Design | `_rate_counters` |
| SEC-15 | Free Plan Quota Discrepancy in Test Suite | Quality & Regression Verification | `test_prompt_debug.py` |

