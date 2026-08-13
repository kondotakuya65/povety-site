# Prosperax

Mutual aid platform for Nigeria.  
Stack: **Next.js** (`apps/frontend`) + **FastAPI** (`apps/backend`) + PostgreSQL · deploy later on Linux VPS with **Nginx + PM2**.

## Repo layout

```text
apps/
  frontend/   # Next.js
  backend/    # FastAPI
docs/         # project-plan + implementation-steps
```

## Prerequisites

- Node.js 20+
- Python 3.11+ (3.14 OK for Phase 0)
- PostgreSQL (needed from Phase 1)

## Local development

### 1. Backend

```bash
cd apps/backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # or: cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Health check: http://127.0.0.1:8000/api/health

### 2. Frontend

```bash
cd apps/frontend
copy .env.example .env.local   # or: cp .env.example .env.local
npm install
npm run dev
```

App: http://localhost:3000  
Browser `/api/*` is rewritten to the backend (`BACKEND_URL`, default `http://127.0.0.1:8000`).

## Phase 0 exit

- [x] `apps/frontend` + `apps/backend` scaffold
- [x] `.env.example` files
- [x] `GET /api/health`
- [x] Frontend can reach backend health
- [x] Green Prosperax base theme + layout shell

Next: Phase 1 — database models (see `docs/implementation-steps.md`).
