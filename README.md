# Prosperax

Mutual aid platform for Nigeria.  
Stack: **Next.js** (`apps/frontend`) + **FastAPI** (`apps/backend`) + PostgreSQL · deploy later on Linux VPS with **Nginx + PM2**.

## Repo layout

```text
apps/
  frontend/   # Next.js
  backend/    # FastAPI
docs/         # project-plan + implementation-steps + deploy-guide
```

## Docs

- [`docs/project-plan.md`](docs/project-plan.md) — product rules + architecture
- [`docs/implementation-steps.md`](docs/implementation-steps.md) — phased checklist
- [`docs/deploy-guide.md`](docs/deploy-guide.md) — VPS / Nginx / PM2 production deploy

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

## Help requests (Phase 3)

- Create: `/requests/new` (login required)
- Browse live: `/requests`
- Detail: `/requests/[id]`
- Admin review: `/admin` (approve / reject pending)
- Photos served at `/media/...`

## Donations (Phase 4)

Local mock (default): `PAYSTACK_MOCK=true` — checkout redirects to `/donate/callback` and confirms without real Paystack.

Real Paystack later:
```
PAYSTACK_MOCK=false
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
```

- Donate on live request detail
- Callback confirm: `/donate/callback`
- Webhook: `POST /api/webhooks/paystack`
- Account shows donation history

## Payouts & refunds (Phase 5)

- Requesters provide bank code, account number, and account name before approval.
- Only fully funded requests are eligible for the weekly payout run.
- Admin operations: http://localhost:3000/admin/money
- Donors can request a refund from `/account` while the gift is still held and inside the configured window.
- Expired unmet requests refund held donations after the configured business-day delay.

Manual/cron commands:

```bash
cd apps/backend
python -m app.scripts.money_jobs payouts   # weekly
python -m app.scripts.money_jobs refunds   # daily
```

Example VPS cron:

```cron
0 9 * * 1 cd /var/www/prosperax/apps/backend && .venv/bin/python -m app.scripts.money_jobs payouts
0 2 * * * cd /var/www/prosperax/apps/backend && .venv/bin/python -m app.scripts.money_jobs refunds
```

Next: Phase 7 — email notices (`docs/implementation-steps.md`).

## Public UX (Phase 6)

- Home: brand hero slider, pulse stats (`GET /api/stats/public`), Need of the Day, how it works, live teaser, trust
- Footer + policies: `/about`, `/how-it-works`, `/terms`, `/privacy`, `/refunds`, `/acceptable-use`
- Polished browse, detail, create (rich text + photo crop), account

## Admin console

Separate left-sidebar area at `/admin` (no public header/footer):

- Overview · Requests · Users · Donations · Payouts & refunds · Settings
- APIs: `/api/admin/overview`, `/users`, `/donations`, plus existing review/money/settings endpoints
- Admin role still comes from `ADMIN_PHONE` / `ADMIN_PHONES` in `.env`

## Email notices (Phase 7)

Transactional email is SMTP-ready (Brevo / SendGrid / SES / any cheap SMTP later). Local default is console logging.

```env
MAIL_PROVIDER=console   # or smtp
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_USE_TLS=true
MAIL_FROM=Prosperax <noreply@prosperax.org>
```

Emails fire after: donation held, request approved, payout success, refund success.  
SMS OTP stays on Termii (`SMS_PROVIDER=termii`).

## Deploy (Phase 8)

Production walkthrough for Hostinger DNS (`prosperax.online`) + Ubuntu 24 VPS:

→ **[`docs/deploy-guide.md`](docs/deploy-guide.md)**

Next after deploy: Phase 9 — go-live checklist (`docs/implementation-steps.md`).
