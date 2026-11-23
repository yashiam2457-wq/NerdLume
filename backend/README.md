# NerdLume backend

This folder contains the local API scaffold for NerdLume.

## Run

```bash
node backend/server.js
```

Or use Python:

```bash
python backend/server.py
```

## Core endpoints

- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/reset-password`
- `PATCH /api/profile`
- `POST /api/generate`
- `GET /api/history`

## Notes

- Data is persisted to `backend/data/state.json`.
- The generation endpoint returns deterministic local templates for now.
- When the real AI API arrives, the same route contract can be wired to that provider without changing the frontend contract.
