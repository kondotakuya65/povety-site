# Prosperax — Implementation Steps

**Status:** Approved plan → execute in order  
**Source of truth:** `docs/project-plan.md`  
**Deploy target:** Linux VPS · Nginx + PM2 · Postgres on-box

Work top to bottom. Check off each step when done. Do not skip money/webhook steps.

---

## Phase 0 — Repo & local foundation

1. [ ] Create monorepo layout:
   - `apps/web` — Next.js
   - `apps/api` — FastAPI
   - `docs/` — plans (already present)
2. [ ] Init Next.js (App Router, TypeScript) in `apps/web`
3. [ ] Init FastAPI + Poetry/pip + `uvicorn` in `apps/api`
4. [ ] Add root `README` with local run commands only
5. [ ] Add `.env.example` for web + api (no secrets committed)
6. [ ] Local Postgres (or Docker **only for local DB** if needed; production stays bare VPS)
7. [ ] API health route `GET /api/health`
8. [ ] Web can call API in local/dev
9. [ ] Shared design tokens: green palette CSS variables, fonts, base layout shell

**Exit:** `web` and `api` run locally; health OK.

---

## Phase 1 — Database & domain models

1. [ ] Choose ORM/migrations (recommend SQLAlchemy 2 + Alembic)
2. [ ] Implement tables:
   - `users`
   - `help_requests`
   - `donations`
   - `payouts` / `payout_batches`
   - `refunds`
   - `media_assets`
   - `audit_logs`
3. [ ] Enums/constraints:
   - request statuses: `draft | pending_review | live | funded | closed_refunded | rejected`
   - donation statuses: `held | paid_out | refunded`
   - visibility: public only while `live`
   - **one open request per user** (DB partial unique index or app+DB check)
4. [ ] File upload path config → local disk (e.g. `UPLOAD_DIR`)
5. [ ] Seed script: one admin user

**Exit:** migrations apply cleanly; models match plan §5.

---

## Phase 2 — Auth (phone OTP + roles)

1. [ ] SMS provider client (Nigeria OTP) + env keys
2. [ ] `POST /auth/otp/request` — send OTP to phone
3. [ ] `POST /auth/otp/verify` — issue session/JWT
4. [ ] Store/update `User` (phone, optional email, role)
5. [ ] Auth middleware on API; protect admin routes
6. [ ] Web: login / OTP screens
7. [ ] Collect email when needed (receipts)
8. [ ] Admin bootstrap (env `ADMIN_PHONES` or seed)

**Exit:** requester/donor can log in; admin can access admin routes.

---

## Phase 3 — Help requests + admin review

1. [ ] `POST /help-requests` — create (open link; auth required)
   - fields: full name, photo, story, goal_ngn, deadline (14/30/60, default 30), NIN **or** phone
2. [ ] Enforce one open request (`pending_review` or `live`)
3. [ ] Photo upload to local disk; save `MediaAsset`
4. [ ] Status starts `pending_review`
5. [ ] Admin list pending; approve → `live` (+ set `deadline_at`); reject → `rejected`
6. [ ] Public list/detail: **only `live`**
7. [ ] On `funded` / closed success → set visibility private
8. [ ] User dashboard: my request + status
9. [ ] Audit log for approve/reject

**Exit:** full create → review → live → private-on-close path works without payments.

---

## Phase 4 — Paystack donate (hold ledger)

1. [ ] Paystack test keys in api `.env`
2. [ ] `POST /donations/initialize` — Checkout for a `live` request (amount NGN)
3. [ ] Web donate UI on request detail (fee 0% + hold copy)
4. [ ] `POST /webhooks/paystack` — verify signature; idempotent by reference
5. [ ] On success → `Donation.status = held`; update raised total
6. [ ] Show progress: raised vs goal, recent supporters
7. [ ] Donor history: my donations
8. [ ] Never trust frontend-only payment success

**Exit:** test donation completes; webhook marks `held`; progress updates.

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
   - WhatsApp follow (`WHATSAPP_FOLLOW_URL`)
   - pulse stats
   - Need of the Day
   - how it works (include hold → weekly payout)
   - live request list teaser
   - trust block (0% fee, hold, Paystack)
2. [ ] Browse live requests
3. [ ] Request detail + donate
4. [ ] Create request flow
5. [ ] User dashboard
6. [ ] Admin console (review, payouts, refunds)
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
   - `prosperax-web` → `next start` (:3000)
   - `prosperax-api` → uvicorn (:8000)
7. [ ] `pm2 startup` + `pm2 save`
8. [ ] Nginx:
   - `/` → `127.0.0.1:3000`
   - `/api/` → `127.0.0.1:8000`
   - `/media/` → uploads directory
   - TLS via Let’s Encrypt
9. [ ] Cron on VPS: weekly payout trigger + daily deadline/refund sweep (hit admin job endpoints or CLI)
10. [ ] Confirm Paystack webhook URL: `https://prosperax.org/api/webhooks/paystack`
11. [ ] Deploy runbook: `git pull` → migrate → build → `pm2 restart prosperax-web prosperax-api`

**Exit:** site live on HTTPS; PM2 processes stable; webhook reachable.

---

## Phase 9 — Go-live checklist

1. [ ] Paystack live keys + manual payouts / settle-to-balance enabled
2. [ ] Transfers + refunds verified with small real amounts
3. [ ] Admin phone/login verified
4. [ ] `WHATSAPP_FOLLOW_URL` set
5. [ ] Legal entity name on policy pages
6. [ ] One full path test: create → approve → donate → weekly payout
7. [ ] One refund path test (held donation)
8. [ ] Backups: Postgres dump cron + uploads backup

**Exit:** production ready for real users.

---

## Suggested week map (flexible)

| Week | Focus |
|---|---|
| 1 | Phase 0–1 scaffolding + models |
| 2 | Phase 2 auth |
| 3 | Phase 3 help requests + admin review |
| 4 | Phase 4 Paystack donate/hold |
| 5 | Phase 5 payouts + refunds |
| 6 | Phase 6 UI polish |
| 7 | Phase 7–8 email + VPS deploy |
| 8 | Phase 9 go-live hardening |

---

## First concrete action (start now)

1. Scaffold `apps/web` (Next.js) and `apps/api` (FastAPI)  
2. Add `.env.example`, health endpoint, green base theme  
3. Add Alembic + initial migration for core tables  

Say when to start Phase 0 in the repo and implementation can begin immediately.
