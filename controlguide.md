# NerdyBro — Master Control & Configuration Guide

This guide provides exact file paths and line numbers to manage, edit, or customize account plan quota limits, generation option restrictions, authentication settings, and demo credentials.

---

## 1. Weekly Generation Quotas (Account Limits)

Generation quotas control how many generations users can perform each week per mode (**Note Making**, **Explain Mode**, **Quick Mode**).

### A. Frontend Single Source of Truth
* **File Path**: [auth.js](file:///c:/Users/Loq/Documents/programs/NerdyBro/auth.js#L16-L21)
* **Line Numbers**: `16 – 21`

```javascript
window.PLAN_QUOTAS = {
  guest:          { notes: 1, explain: 1, quick: 1 },
  free:           { notes: 3, explain: 2, quick: 7 },
  'free-premium': { notes: 7, explain: 5, quick: 14 },
  diamond:        { notes: Infinity, explain: Infinity, quick: Infinity }
};
```

### B. Frontend Display & Counter Sync
* **User Dashboard Counter**: [user.html](file:///c:/Users/Loq/Documents/programs/NerdyBro/user.html#L2021-L2027) (Lines `2021 – 2027`)
* **Generator Paywall Check**: [app.js](file:///c:/Users/Loq/Documents/programs/NerdyBro/app.js#L1853-L1862) (Lines `1853 – 1862`)

### C. Backend Quota Configuration & Enforcement
* **File Path**: [server.py](file:///c:/Users/Loq/Documents/programs/NerdyBro/backend/server.py#L69-L82)
* **Line Numbers**: `69 – 82`

```python
PLAN_CONFIG: dict[str, dict] = {
    "free": {
        "label": "Free",
        "weekly_limits": {"Note Making": 3, "Explain": 2, "Quick": 7},
    },
    "free-premium": {
        "label": "Premium",
        "weekly_limits": {"Note Making": 7, "Explain": 5, "Quick": 14},
    },
    "diamond": {
        "label": "Diamond",
        "weekly_limits": {},  # empty = unlimited
    },
}
```
* **Quota Enforcement Logic**: [server.py](file:///c:/Users/Loq/Documents/programs/NerdyBro/backend/server.py#L2517-L2521) (Lines `2517 – 2521`)

---

## 2. Generation Option Blocking & Feature Locks

Option blocking allows restricting specific note styles, learning techniques, or practice modes (e.g. **Video Notes**, **Feynman Technique**, **Mock Tests**, **Flash Cards**) by plan level.

### A. Frontend Feature Locks Config
* **File Path**: [auth.js](file:///c:/Users/Loq/Documents/programs/NerdyBro/auth.js#L941-L952)
* **Line Numbers**: `941 – 952`

```javascript
window.FEATURE_LOCKS = [
  // 1. Goal Cards
  { id: 'goal-explain', type: 'goal-card', required: 'free-premium', label: 'Explain Mode' },

  // 2. Techniques & Note Options
  { match: 'Video Notes', type: 'option-text', required: 'free-premium', label: 'Video Notes Generation' },
  { match: 'Feynman Technique', type: 'option-text', required: 'free-premium', label: 'Feynman Technique' },
  { match: 'SQ3R Method', type: 'option-text', required: 'free-premium', label: 'SQ3R Method' },

  // 3. Practice Types
  { match: 'Mock Test', type: 'option-text', required: 'free-premium', label: 'Mock Test Papers' },
  { match: 'Flash Cards', type: 'option-text', required: 'free-premium', label: 'Flash Cards' }
];
```

### B. Dynamic Runtime Control API (JavaScript Console / Scripts)
* **File Path**: [auth.js](file:///c:/Users/Loq/Documents/programs/NerdyBro/auth.js#L954-L978)
* **Line Numbers**: `954 – 978`

* **Block Any Option**:
  ```javascript
  window.blockGenerationOption('Cornell Method', 'free-premium', 'Cornell Method');
  ```
* **Unblock Any Option**:
  ```javascript
  window.unblockGenerationOption('Cornell Method');
  ```

### C. Backend Server-Side Option Enforcement (Security Guard)
* **File Path**: [server.py](file:///c:/Users/Loq/Documents/programs/NerdyBro/backend/server.py#L2522-L2535)
* **Line Numbers**: `2522 – 2535`

```python
# Option-level feature blocking check (server-side security)
user_plan = user.get("plan", "free")
if user_plan == "free":
    blocked_features = []
    if mode == "video-notes" or body.get("technique") == "Video Notes":
        blocked_features.append("Video Notes Generation")
    if body.get("technique") in ["Feynman Technique", "SQ3R Method"]:
        blocked_features.append(body.get("technique"))
    if body.get("practiceType") in ["Mock Test Paper", "Flash Cards"]:
        blocked_features.append(body.get("practiceType"))

    if blocked_features:
        err_msg = f"The following selected option requires a Premium or Diamond plan: {', '.join(blocked_features)}"
        return self.json_response(403, {"ok": False, "error": err_msg}, req_id)
```

---

## 3. Google OAuth & Sign-In Settings

* **Server Environment Variable**: [.env.example](file:///c:/Users/Loq/Documents/programs/NerdyBro/backend/.env.example#L13-L21) (Line `21`)
* **Backend Google Config**: [server.py](file:///c:/Users/Loq/Documents/programs/NerdyBro/backend/server.py#L48) (Line `48`) & [server.py](file:///c:/Users/Loq/Documents/programs/NerdyBro/backend/server.py#L2343-L2432) (Lines `2343 – 2432`)
* **Sign-Up Page Google Client ID**: [signin.html](file:///c:/Users/Loq/Documents/programs/NerdyBro/signin.html#L63) (Line `63`)
* **Log-In Page Google Client ID**: [login.html](file:///c:/Users/Loq/Documents/programs/NerdyBro/login.html#L209) (Line `209`)

---

## 4. Demo Users & Testing Accounts

* **Auth Engine**: [auth.js](file:///c:/Users/Loq/Documents/programs/NerdyBro/auth.js#L7-L13) (Lines `7 – 13`)
* **Sign In Form Fallback**: [signin.html](file:///c:/Users/Loq/Documents/programs/NerdyBro/signin.html#L191-L197) (Lines `191 – 197`)
* **Log In Form Fallback**: [login.html](file:///c:/Users/Loq/Documents/programs/NerdyBro/login.html#L113-L119) (Lines `113 – 119`)

| Account Email | Username | Password | Default Plan |
|---------------|----------|----------|--------------|
| `demo@nerdybro.in` | `demo_user` | `Demo@1234` | Free |
| `premium@nerdybro.in` | `premium_bro` | `Premium@1` | Premium |
| `diamond@nerdybro.in` | `diamond_nerd` | `Diamond@1` | Diamond |

---

## Quick Reference Summary

| Feature Control | Frontend Config | Backend Config |
|-----------------|-----------------|----------------|
| **Weekly Generation Quotas** | [auth.js:L16-L21](file:///c:/Users/Loq/Documents/programs/NerdyBro/auth.js#L16-L21) | [server.py:L69-L82](file:///c:/Users/Loq/Documents/programs/NerdyBro/backend/server.py#L69-L82) |
| **Generation Option Locks** | [auth.js:L941-L952](file:///c:/Users/Loq/Documents/programs/NerdyBro/auth.js#L941-L952) | [server.py:L2522-L2535](file:///c:/Users/Loq/Documents/programs/NerdyBro/backend/server.py#L2522-L2535) |
| **Google Sign-In Client ID** | [signin.html:L63](file:///c:/Users/Loq/Documents/programs/NerdyBro/signin.html#L63) & [login.html:L209](file:///c:/Users/Loq/Documents/programs/NerdyBro/login.html#L209) | [server.py:L48](file:///c:/Users/Loq/Documents/programs/NerdyBro/backend/server.py#L48) |
