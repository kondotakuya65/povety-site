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

# Postgres: create DB once
# CREATE DATABASE prosperax;

alembic upgrade head
python -m app.scripts.seed
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

## Database (Phase 1)

Local Postgres is required. `.env` `DATABASE_URL` default:

`postgresql+psycopg://postgres:postgres@localhost:5432/prosperax`

```bash
cd apps/backend
alembic upgrade head          # schema
python -m app.scripts.seed    # admin user + app_settings (fee 0%)
```

Uploads directory: `UPLOAD_DIR` (default `apps/backend/uploads`).

## Auth (Phase 2)

Phone OTP login. In development, `SMS_PROVIDER=console` prints the code and the API returns `dev_otp` (shown on the login page).

- Login: http://localhost:3000/login  
- Account (email for receipts): `/account`  
- Admin ping: `/admin` (phones in `ADMIN_PHONE` / `ADMIN_PHONES`)

Production SMS: set `SMS_PROVIDER=termii` and `TERMII_API_KEY`.

## Settings (Phase 2b)

- Public: `GET /api/settings/public`
- Admin UI: http://localhost:3000/admin/settings
- Fee starts at `0`; change anytime without redeploy

Next: Phase 3 — help requests (`docs/implementation-steps.md`).
