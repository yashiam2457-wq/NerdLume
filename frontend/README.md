# NerdLume — Modern Next.js 14 Web Architecture

NerdLume is a high-performance **Next.js 14 App Router** application built with **React 18**, **Motion (`framer-motion`)**, **Magic UI**, and **React Bits**.

The original `backend/` directory remains completely untouched as required.

---

## Architecture Overview

```
NerdyBro/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with dark theme, AuthProvider, Navbar, Footer
│   │   ├── page.tsx           # Modern Homepage with Hero, Orbiting Circles, Bento Grid, Pricing
│   │   ├── practice/page.tsx  # Practice & Retention Launchpad
│   │   ├── quiz/page.tsx      # Interactive Quiz Arena with Timer, Explanations & Confetti
│   │   ├── flashcards/page.tsx# 3D Flip Flashcards with Spaced Repetition (Leitner system)
│   │   ├── mocktest/page.tsx  # 45-Minute Timed University Examination Simulator
│   │   ├── dashboard/page.tsx # Scholar Profile, Quota Indicators & Saved History
│   │   ├── login/page.tsx     # Fast Auth Matrix with 1-click Demo Accounts
│   │   ├── signup/page.tsx    # Scholar Registration & Plan Picker
│   │   ├── admin/page.tsx     # Admin Telemetry & Dynamic Feature Locks Matrix
│   │   ├── contact/page.tsx   # Communication & Inquiries Dispatch
│   │   └── globals.css        # Cybernetic theme variables & animations
│   ├── components/
│   │   ├── magicui/           # BentoGrid, BentoCard, Marquee, Meteors, Particles,
│   │   │                      # ShimmerButton, BorderBeam, WordRotate, OrbitingCircles
│   │   ├── react-bits/        # SpotlightCard, Squares Grid, BlurText, ShinyText, DecryptedText
│   │   ├── navbar.tsx         # Responsive Navigation Bar with Live Plan Switcher
│   │   ├── footer.tsx         # Cybernetic Footer with System Telemetry
│   │   ├── generator-section.tsx # Main Multi-Mode Study Synthesis Console
│   │   ├── output-display.tsx # Formatted Markdown, Code Execution, ASCII Diagram Viewer
│   │   ├── plan-promo-bar.tsx # Dynamic Plan Status Banner
│   │   ├── quota-indicator.tsx# Real-Time Weekly Quota Meters
│   │   └── feature-lock-modal.tsx # Plan Upgrade Dialog for Premium Features
│   └── lib/
│       ├── api.ts             # Backend API client with offline intelligent fallback
│       ├── auth-context.tsx   # Global authentication, plan state, quotas & feature locks
│       ├── storage.ts         # LocalStorage persistence & Single Source of Truth
│       ├── sample-data.ts     # Initial Cornell notes, quizzes, flashcards, diagrams
│       ├── types.ts           # Unified TypeScript interfaces
│       └── utils.ts           # Class merger and formatting utilities
├── backend/                   # UNTOUCHED Python/Node API Server
├── package.json               # Next.js 14, React 18, Framer Motion, Tailwind CSS
├── tailwind.config.ts         # Custom cyber colors, keyframes, and animations
└── next.config.mjs            # Production optimization and backend proxy configuration
```

---

## Quick Start

### 1. Launch the Next.js Frontend
```bash
cd c:\Users\Loq\Documents\programs\NerdyBro
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. (Optional) Run the Existing Backend
```bash
cd c:\Users\Loq\Documents\programs\NerdyBro\backend
node server.js
# or
python server.py
```
*Note: The Next.js frontend has built-in offline intelligence — all features (Note generation, Quizzes, Flashcards, Mock exams, and History) operate seamlessly whether the backend is running or offline.*

---

## Demo Accounts (Instant 1-Click Access)

| Role | Email | Password | Tier |
| :--- | :--- | :--- | :--- |
| **Free Scholar** | `demo@nerdlume.in` | `Demo@1234` | Free (3 Notes, 2 Explain, 7 Quick/wk) |
| **Premium Scholar** | `premium@nerdlume.in` | `Premium@1` | Premium (7 Notes, 5 Explain, 14 Quick/wk, Video Notes, Feynman, SQ3R) |
| **Diamond Scholar** | `diamond@nerdlume.in` | `Diamond@1` | Diamond (Unlimited generations, Question Prediction) |

