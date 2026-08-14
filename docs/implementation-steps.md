# Prosperax — Implementation Steps

**Status:** Approved plan → execute in order  
**Source of truth:** `docs/project-plan.md`  
**Deploy target:** Linux VPS · Nginx + PM2 · Postgres on-box

Work top to bottom. Check off each step when done. Do not skip money/webhook steps.

---

## Phase 0 — Repo & local foundation

1. [x] Create monorepo layout:
   - `apps/frontend` — Next.js
   - `apps/backend` — FastAPI
   - `docs/` — plans (already present)
2. [x] Init Next.js (App Router, TypeScript) in `apps/frontend`
3. [x] Init FastAPI + pip + `uvicorn` in `apps/backend`
4. [x] Add root `README` with local run commands only
5. [x] Add `.env.example` for frontend + backend (no secrets committed)
6. [x] Local Postgres noted for Phase 1 (production stays bare VPS)
7. [x] API health route `GET /api/health`
8. [x] Frontend can call backend in local/dev (Next rewrite + health panel)
9. [x] Shared design tokens: green palette CSS variables, fonts, base layout shell

**Exit:** `frontend` and `backend` run locally; health OK.

---

## Phase 1 — Database & domain models

1. [x] ORM/migrations: SQLAlchemy 2 + Alembic
2. [x] Tables: `users`, `help_requests`, `donations` (fee snapshot columns), `payouts` / `payout_batches`, `refunds`, `app_settings`, `media_assets`, `audit_logs`
3. [x] Enums/constraints:
   - request statuses: `draft | pending_review | live | funded | closed_refunded | rejected`
   - donation statuses: `held | paid_out | refunded`
   - visibility: public only while `live` (CHECK)
   - **one open request per user** (partial unique index on `draft|pending_review|live`)
4. [x] Seed `app_settings` defaults (`platform_fee_percent=0`, deadlines, refund windows, min donation, WhatsApp URL, tagline, payout weekday)
5. [x] File upload path config → `UPLOAD_DIR` (local disk)
6. [x] Seed script: one admin user (`python -m app.scripts.seed`)

**Exit:** migrations apply cleanly; models match plan §5 + settings.

---

## Phase 2 — Auth (phone OTP + roles)

1. [x] SMS provider: `console` (dev) + Termii (production) via `SMS_PROVIDER`
2. [x] `POST /api/auth/otp/request` — send OTP to phone
3. [x] `POST /api/auth/otp/verify` — issue JWT
4. [x] Store/update `User` (phone, optional email, role)
5. [x] Bearer auth; `GET /api/admin/ping` is admin-only
6. [x] Frontend login / OTP screens (`/login`)
7. [x] Collect email on `/account` (`PATCH /api/auth/me`)
8. [x] Admin bootstrap via `ADMIN_PHONE` / `ADMIN_PHONES` + seed

**Exit:** requester/donor can log in; admin can access admin routes.

---

## Phase 2b — Admin settings API + UI

1. [x] `GET /api/settings/public` — fee %, min donation, WhatsApp URL, tagline, maintenance flag
2. [x] `GET /api/admin/settings` — full ops settings (admin only)
3. [x] `PATCH /api/admin/settings` — update keys with validation (e.g. fee 0–20)
4. [x] Audit log on every change
5. [x] Admin → Settings screen (`/admin/settings`)
6. [x] Home reads fee/tagline/WhatsApp/min donation from public settings

**Exit:** admin can set fee to 0 and change it; UI reflects current value; secrets stay in `.env`.

---

## Phase 3 — Help requests + admin review

1. [x] `POST /api/help-requests` — create (auth + multipart photo)
   - fields: full name, photo, story, goal_ngn, deadline (14/30/60), NIN **or** phone
2. [x] Enforce one open request (`draft|pending_review|live`)
3. [x] Photo upload to local disk; `MediaAsset` + `/media/...`
4. [x] Status starts `pending_review`
5. [x] Admin list pending; approve → `live` (+ `deadline_at`); reject → `rejected`
6. [x] Public list/detail: **only `live`** (owners/admins can view own non-public)
7. [x] Non-live stays **private** (visibility CHECK)
8. [x] User dashboard: my request + status (`/account`)
9. [x] Audit log for create / approve / reject

**Exit:** full create → review → live path works without payments.

---

## Phase 4 — Paystack donate (hold ledger)

1. [ ] Paystack test keys in api `.env`
2. [ ] `POST /donations/initialize` — Checkout for a `live` request (amount NGN)
   - read `platform_fee_percent` from settings
   - compute/store `gross_amount`, `platform_fee_amount`, `net_to_request`, `fee_percent_snapshot`
3. [ ] Web donate UI: show **current** platform fee + hold copy + Paystack fee note
4. [ ] `POST /webhooks/paystack` — verify signature; idempotent by reference
5. [ ] On success → `Donation.status = held`; raised total uses **net_to_request** (amount toward goal)
6. [ ] Show progress: raised vs goal, recent supporters
7. [ ] Donor history: my donations
8. [ ] Never trust frontend-only payment success
9. [ ] Weekly payout transfers **net** amounts; platform fee stays in Paystack balance (when fee > 0)

**Exit:** test donation completes; webhook marks `held`; fee snapshot stored; progress uses net.

---

## Phase 5 — Weekly payouts + refunds

1. [ ] Recipient bank details on approved request (account name/number/bank code) for Transfers
2. [ ] Admin “Run weekly payout” (and/or cron):
   - select eligible `held` donations
   - Paystack Transfer
   - mark `paid_out`; write `Payout` / `PayoutBatch`
3. [ ] When raised ≥ goal → mark request `funded` → private after payout rules as planned
4. [ ] Deadline job: if `live` and past `deadline_at` and raised < goal → queue refunds → `closed_refunded`
5. [ ] Donor refund API: only if `held` and within 7 days
6. [ ] Paystack Refund API integration; idempotent refund records
7. [ ] Admin UI: payout history, refund queue, failures/retry

**Exit:** hold → weekly transfer and unmet-goal/donor refunds work in Paystack test mode.

---

## Phase 6 — Public UX (Prosperax UI)

1. [ ] Home (Rising Lion–inspired, mobile-first, green):
   - brand hero + Send help / Request help
   - WhatsApp follow (from settings `whatsapp_follow_url`)
   - pulse stats
   - Need of the Day
   - how it works (include hold → weekly payout)
   - live request list teaser
   - trust block (0% fee, hold, Paystack)
2. [ ] Browse live requests
3. [ ] Request detail + donate
4. [ ] Create request flow
5. [ ] User dashboard
6. [ ] Admin console (review, payouts, refunds, **settings**)
7. [ ] Policy pages: About, How it works, Terms, Privacy, Refunds, Acceptable use (use plan disallowed list)

**Exit:** all plan screens usable end-to-end on mobile + desktop.

---

## Phase 7 — Email notices

1. [ ] SMTP config from VPS/host panel
2. [ ] Send on: donation received, request approved, payout sent, refund processed
3. [ ] Simple HTML/text templates (English)

**Exit:** each money/status event emails the right user.

---

## Phase 8 — VPS deploy (Nginx + PM2)

1. [ ] Provision Linux VPS; point `prosperax.org` A-record
2. [ ] Install: Node, Python, PostgreSQL, Nginx, certbot, PM2, git
3. [ ] Create DB user/db; set `UPLOAD_DIR` permissions
4. [ ] Clone repo; production `.env` (Paystack, SMS, SMTP, secrets)
5. [ ] Run migrations
6. [ ] Build Next.js; configure PM2 ecosystem:
   - `prosperax-frontend` → `next start` (:3000)
   - `prosperax-backend` → uvicorn (:8000)
7. [ ] `pm2 startup` + `pm2 save`
8. [ ] Nginx:
   - `/` → `127.0.0.1:3000`
   - `/api/` → `127.0.0.1:8000`
   - `/media/` → uploads directory
   - TLS via Let’s Encrypt
9. [ ] Cron on VPS: weekly payout trigger + daily deadline/refund sweep (hit admin job endpoints or CLI)
10. [ ] Confirm Paystack webhook URL: `https://prosperax.org/api/webhooks/paystack`
11. [ ] Deploy runbook: `git pull` → migrate → build → `pm2 restart prosperax-frontend prosperax-backend`

**Exit:** site live on HTTPS; PM2 processes stable; webhook reachable.

---

## Phase 9 — Go-live checklist

1. [ ] Paystack live keys + manual payouts / settle-to-balance enabled
2. [ ] Transfers + refunds verified with small real amounts
3. [ ] Admin phone/login verified
4. [ ] `whatsapp_follow_url` set in Admin Settings
5. [ ] Legal entity name on policy pages
6. [ ] One full path test: create → approve → donate → weekly payout
7. [ ] One refund path test (held donation)
8. [ ] Backups: Postgres dump cron + uploads backup

**Exit:** production ready for real users.

---

## Suggested week map (flexible)

| Week | Focus |
|---|---|
| 1 | Phase 0–1 scaffolding + models + settings seed |
| 2 | Phase 2 auth + Phase 2b admin settings |
| 3 | Phase 3 help requests + admin review |
| 4 | Phase 4 Paystack donate/hold |
| 5 | Phase 5 payouts + refunds |
| 6 | Phase 6 UI polish |
| 7 | Phase 7–8 email + VPS deploy |
| 8 | Phase 9 go-live hardening |

---

## First concrete action (start now)

1. ~~Scaffold `apps/frontend` + `apps/backend`~~ (Phase 0)  
2. ~~Alembic + core tables + settings/admin seed~~ (Phase 1)  
3. ~~Phone OTP auth~~ (Phase 2)  
4. ~~Admin settings API + UI~~ (Phase 2b)  
5. ~~Help requests + admin review~~ (Phase 3)  
6. Phase 4: Paystack donate + hold ledger  

Say when to start Phase 0 in the repo and implementation can begin immediately.
