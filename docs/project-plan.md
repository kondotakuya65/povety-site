# Prosperax — Development Plan

**Version:** 5.0 · 2026-08-12  
**Domain:** prosperax.org  
**Stack:** Next.js + FastAPI + PostgreSQL · **Linux VPS · Nginx + PM2**  
**Payments:** Paystack (private entity) · platform fee 0%  
**Design ref:** [Rising Lion Money](https://risinglionmoney.com/) · green · hopeful mutual aid · English

---

## 1. Product (build against these rules)

Mutual aid platform for Nigeria: people publish help requests; donors give to a specific request via Paystack; funds are **held in the Paystack platform balance** until weekly payout after approval.

| Rule | Value |
|---|---|
| Create access | Anyone with the link |
| Max goal | None |
| Open requests per user | **One** |
| Categories | None |
| After funded/closed | **Private** (not public) |
| Live identity | Full name + photo |
| Verification | NIN **or** phone |
| Admin | Client |
| Platform fee | **0% initial** · admin setting (changeable later) |
| Fund hold | Paystack balance until payout/refund |
| Payout | **Weekly** |
| Goal not met by deadline | **Refund** |
| Donor refund | Yes (while still held) |
| Language | English |
| Home extras | WhatsApp follow CTA |

**Default deadline:** 30 days from going live (optional 14 / 30 / 60 at create).

**Fee UI copy (dynamic from settings):**  
*Prosperax platform fee: {platform_fee_percent}%. Payment processing is handled by Paystack; Paystack’s standard processing fees may apply.*

**Hold UI copy:**  
*Your gift is held securely until the request is approved for payout.*

---

## 1.1 Admin settings (recommended)

Use a DB-backed **`app_settings`** store (key/value + type), editable in Admin → Settings.  
Default **platform fee = 0%**; change later without redeploy.

**Fee behavior (when fee > 0)**
- Apply as % of donation; store on each `Donation`: `gross_amount`, `platform_fee_amount`, `net_to_request` (snapshot at pay time).
- **Deduct from amount to requester** (donor pays stated gift; fee taken from held funds at payout). Show fee clearly before checkout.
- Existing held donations keep their **snapshotted** fee; changing the setting only affects **new** donations.

**Put in Admin Settings (ops knobs)**

| Key | Default | Purpose |
|---|---|---|
| `platform_fee_percent` | `0` | Prosperax fee % |
| `default_deadline_days` | `30` | Default request length |
| `donor_refund_days` | `7` | Donor refund window while held |
| `unmet_goal_refund_business_days` | `3` | Auto-refund delay after deadline |
| `min_donation_ngn` | `500` | Minimum donate amount |
| `whatsapp_follow_url` | `` | Home WhatsApp CTA |
| `site_tagline` | `Mutual aid for Nigeria.` | Home/brand line |
| `payout_weekday` | `1` | Weekly payout day (0=Mon…6=Sun) |
| `maintenance_mode` | `false` | Optional soft lock for donate/create |

**Keep in `.env` only (secrets / infra — not admin UI)**  
Paystack keys, SMS keys, SMTP password, JWT secret, DB URL, `UPLOAD_DIR`, bootstrap `ADMIN_PHONES`.

**Rules**
- Admin-only write; public read for safe keys needed by UI (fee %, WhatsApp URL, tagline, min donation).
- Every settings change → `audit_logs`.
- Validate ranges (e.g. fee 0–20%) in API.

---

## 2. Users & core loop

- **Requester** — create/manage one open help request  
- **Donor** — donate to a live request  
- **Admin** — review, payout weekly, refunds  

1. Submit request (name, photo, story, goal NGN, deadline, NIN or phone) → `pending_review`  
2. Admin approve → `live` (or reject)  
3. Donors pay via Paystack → webhook → donation `held` in platform balance  
4. Weekly job/admin run → Transfer eligible held funds to recipient  
5. Deadline missed / goal unmet → refund held donations → `closed_refunded`  
6. Funded/closed success → visibility **private**

**Statuses:** `draft` → `pending_review` → `live` → `funded` | `closed_refunded` | `rejected`

---

## 3. Features to build

1. Home (Rising Lion–style): hero, WhatsApp follow, pulse stats, Need of the Day, how it works, live requests, trust (hold / 0% / Paystack)  
2. Auth: phone OTP + email for receipts; admin role  
3. Create help request (open link); enforce one open request  
4. Browse / detail live requests only  
5. Donate (Paystack Checkout) + progress (raised vs goal, supporters)  
6. Admin: approve/reject, weekly payout batch, refund tools, **Settings**  
7. Deadline unmet-goal refunds + donor refunds while `held`  
8. Receipts / basic history + email notices (donation, approved, payout, refund)  
9. Policy pages: About, How it works, Terms, Privacy, Refunds, Acceptable use  

**Screens:** Home · Browse · Request detail + donate · Create request · User dashboard · Admin (review / payouts / refunds / **settings**) · Policy pages  

**Refund rules**
| Case | Behavior |
|---|---|
| Goal not reached by deadline | Queue refunds within 3 business days |
| Donor request | If still `held` and within 7 days of payment |
| Already paid out | No automatic refund (manual exception only) |
| Failed/duplicate charge | Refund when confirmed |

**Disallowed (admin reject):** illegal activity; weapons; drugs; gambling; hate; adult/exploitation; political campaign financing; investment/yield schemes; impersonation/stolen media; fundraising for others without proof; fraud/spam; anything that risks Paystack/bank blocks.

---

## 4. Architecture (self-hosted VPS)

```text
                    Internet
                       |
              [ Nginx + TLS (443) ]
                    /      \
         Next.js :3000    FastAPI/uvicorn :8000
           (PM2)              (PM2)
                    \      /
                 [ PostgreSQL ]
                       |
         local disk (uploads) · cron (weekly payout / deadline refunds)
                       |
                    Paystack API
```

**Hosting decision:** Single **Linux VPS** (e.g. Hostinger / GoDaddy VPS) — no Vercel, Render, Supabase, AWS, etc. for MVP.  
**Process & edge:** **PM2** (app processes) + **Nginx** (reverse proxy + TLS).

| Component | On VPS |
|---|---|
| Frontend | `apps/frontend` — Next.js (`next start`) via **PM2** |
| Backend | `apps/backend` — FastAPI/uvicorn via **PM2** |
| Reverse proxy | **Nginx** → `/` → `:3000`, `/api` → `:8000`, `/media` → uploads |
| TLS | Let's Encrypt (certbot) on Nginx |
| DB | PostgreSQL on the same VPS |
| Files | Local disk (e.g. `/var/prosperax/uploads`) |
| Jobs | cron (or a small PM2 cron-style script): weekly payouts, deadline refunds |
| Email | SMTP from VPS/host panel |
| Secrets | `.env` on server (not in git) |
| Domain | prosperax.org → VPS A-record |

**Deploy pattern**
1. Install Node, Python, PostgreSQL, Nginx, PM2 on the VPS.  
2. Build Next.js (`npm run build`); run API with uvicorn.  
3. PM2 ecosystem (example processes): `prosperax-frontend`, `prosperax-backend` — `pm2 startup` + `pm2 save`.  
4. Nginx terminates SSL and proxies to the PM2-managed ports.  
5. Deploy updates: `git pull` → build → `pm2 restart prosperax-frontend prosperax-backend`.

**Paystack (external — required)**  
Checkout · Manual payouts / settle-to-balance (hold) · Transfers (weekly) · Refunds · Webhooks → `https://prosperax.org/api/...`

**SMS OTP:** use a Nigeria-capable SMS API from the backend (only external service besides Paystack/email SMTP as needed for auth).
---

## 5. Data model (core)

- `User` — phone, email, role; at most one open `HelpRequest`  
- `HelpRequest` — story, goal_ngn, deadline_at, status, visibility, verification_type (`nin`|`phone`), photo  
- `Donation` — gross_amount, platform_fee_amount, net_to_request, fee_percent_snapshot, status (`held`|`paid_out`|`refunded`), paystack_reference  
- `Payout` / `PayoutBatch` — weekly settlement records  
- `Refund` — unmet-goal or donor-requested  
- `AppSetting` — key, value, value_type, updated_at, updated_by  
- `MediaAsset`, `AuditLog`

---

## 6. Money flow

1. Donor → Paystack Checkout → **platform Paystack balance (hold)**  
2. Webhook (idempotent) → `Donation.status = held`  
3. Live progress updates  
4. Weekly payout → Paystack Transfer to recipient  
5. Unmet goal / eligible donor refund → Paystack Refund  

This is **operational escrow** (platform balance hold), not a separate bank escrow product.

**Paystack account checklist:** private entity business · manual payouts / settle-to-balance · Transfers · Refunds · production webhook URL on VPS.

---

## 7. Design notes (implement)

- Brand-first hero; green; hopeful community tone  
- Editorial story layout (Rising Lion–inspired); mobile-first  
- Dual CTAs: Send help / Request help  
- Live requests only in public lists; aggregate stats OK (no public post-funding personal archive)  
- WhatsApp follow URL: admin setting `whatsapp_follow_url`  

---

## 8. Build order

Detailed checklist: [`docs/implementation-steps.md`](./implementation-steps.md)

1. Repo scaffold (`apps/frontend` + `apps/backend`) + DB models  
2. Auth (phone OTP) + roles  
3. HelpRequest CRUD + admin approve/reject + one-open-request  
4. Paystack Checkout + webhooks + held ledger  
5. Weekly Transfer payout + refund jobs  
6. Public UX + WhatsApp CTA + policy pages  
7. Email notices  
8. VPS deploy (Nginx + PM2) + production Paystack go-live  

---

## 9. Client inputs still needed

- `whatsapp_follow_url` (admin setting; can seed empty)  
- Legal entity display name (policies / Paystack)  
- Final tagline (optional; also an admin setting)  

---

*Dev plan only. Paystack processing fees ≠ Prosperax platform fee (0%).*
