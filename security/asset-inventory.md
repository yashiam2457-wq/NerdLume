# System Asset & Architecture Inventory

Target System: NerdLume (NerdyBro) Core Platform  
Assessment Date: November 2026  
Status: Baseline Established  

---

## 1. Technology Stack & Framework Inventory

### Frontend Layers
- Legacy / Static Web Client: Root-level vanilla HTML5, CSS3, and JavaScript (`index.html`, `login.html`, `signin.html`, `user.html`, `quiz.html`, `flashcard.html`, `mocktest.html`, `practice.html`, `auth.js`, `app.js`, `practice.js`, `tracker.js`, `data.js`).
- Next.js Web Application: Next.js 14.2 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide React (`src/app/`, `src/components/`, `src/lib/`).

### Backend Services
- Primary API & AI Agent Engine: Python 3.11 `ThreadingHTTPServer` (`backend/server.py`). Serves both REST API endpoints and static assets.
- Node.js API Scaffold: Node.js standard library HTTP server (`backend/server.js`). Legacy or alternative lightweight runtime.

### Persistence & Storage
- Relational Database: SQLite3 (`backend/data/nerdybro.sqlite3`).
- Legacy File State: JSON file store (`backend/data/state.json`).
- Document Storage: Local directory structure (`backend/data/generated/`, `backend/data/storage/`).

---

## 2. API Routes & Endpoint Inventory

| Method | Endpoint | Handler | Access Policy |
| :--- | :--- | :--- | :--- |
| GET | `/api/health` | `NerdyBroHandler._route` | Public |
| GET | `/api/plans` | `NerdyBroHandler._route` | Public |
| POST | `/api/auth/signup` | `handle_signup` | Public (Rate-limited) |
| POST | `/api/auth/login` | `handle_login` | Public (Rate-limited) |
| POST | `/api/auth/google` | `handle_google_auth` | Public (Rate-limited) |
| GET | `/api/auth/me` | `handle_me` | Authenticated |
| POST | `/api/auth/logout` | `handle_logout` | Authenticated |
| POST | `/api/auth/reset-password` | `handle_reset_password` | Public |
| GET / PATCH | `/api/profile` | `handle_profile` | Authenticated |
| POST | `/api/generate` | `handle_generate` | Authenticated & Quota Controlled |
| GET / DELETE | `/api/history` | `handle_history` / `handle_delete_history` | Authenticated (User-Isolated) |
| GET | `/api/history/{id}/download` | `handle_history_download` | Authenticated (User-Isolated) |
| GET | `/api/ai-accounts` | `handle_ai_accounts` | Authenticated (User-Isolated) |
| GET | `/*` | `serve_static` | Public Static Asset Dispatcher |

---

## 3. AI, LLM & Document Ingestion Inventory

### AI Providers & Models
- Google Gemini: `gemini-1.5-flash` / `gemini-flash-latest` (Document ingestion, file-to-markdown conversion, file summarization).
- Mistral AI: `mistral-large-latest` (Notes generation, analytical reasoning, technical assignments).
- Groq AI: `llama-3.3-70b-versatile` (Fast Q&A, quizzes, mock tests, flashcards).
- OpenAI: `gpt-4o-mini` (Fallback reasoning engine).

### Ingestion & Processing Pipeline
1. Upload ingestion: Base64-encoded files parsed via JSON payload (`files` array).
2. Format conversion: Document conversion via Gemini multimodal API to Markdown.
3. Content extraction: Document text sanitized and aggregated into `referenceFileText`.
4. Document export: Markdown converted to DOCX with formatting via `docx` or raw UTF-8 `.md`/`.txt`.

---

## 4. Security Configuration & Secret Management

- Environment variables stored in `.env` and `backend/.env`.
- Password hashing: Argon2id (when `argon2-cffi` is present) with PBKDF2-SHA256 (120,000 iterations) fallback.
- In-memory sliding rate-limiting window per IP.
- Static file serving rooted at repository directory.

