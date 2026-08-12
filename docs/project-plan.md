# Prosperax — Project Plan (v4)

**Status:** Product + ops defaults filled · ready for PRD + wireframes + build  
**Document version:** 4.0  
**Last updated:** 2026-08-12  
**Brand / domain:** [Prosperax.org](https://prosperax.org)

| Item | Decision |
|---|---|
| Brand | **Prosperax** · prosperax.org |
| Positioning / tagline | Mutual aid · hopeful community |
| Target market | Nigeria · English only (v1) |
| Brand color | Green |
| Payment gateway | Paystack (merchant: private entity) |
| Fund holding | **Platform Paystack balance (operational escrow)** until approval / weekly payout |
| Product model | **A — Mutual aid / peer donations** ✅ |
| Design reference | [Rising Lion Money](https://risinglionmoney.com/) editorial story style ✅ |
| Stack | FastAPI + PostgreSQL · Next.js |

**Document purpose:** Single source of truth for Prosperax v1 — locked client decisions plus suggested defaults for remaining gaps so design and engineering can proceed. Items marked **Suggested default** can be changed by the client without changing the overall architecture.

---

## 1. Confirmed product direction

Prosperax is a Nigeria-first **mutual aid** platform:
- People publish personal **help requests** (full name + photo + story + goal in NGN).
- Anyone with the link can create a request (open access, not invite-only).
- Donors give to a **specific request** via Paystack.
- All payments are **held in the platform Paystack balance** before approval / payout (see §6.1).
- Platform fee: **0%**.
- Growth means more verified help, more donors, and more completed requests — **not** investment yield.

### Explicitly not in v1
- Crowdfunding-as-core model, shared pools, giving circles, NGO marketplace
- Public “success story” pages after funding (completed requests become **private**)
- Required category taxonomy
- Formal bank-licensed escrow product (operational hold via Paystack is enough for v1)

---

## 2. Locked product rules (from client Q&A)

### Access & requests
| Rule | Decision |
|---|---|
| Who can create a request | **Anyone with the link** (open create flow) |
| Max goal amount | **No maximum** |
| Multiple open requests per person | **No** — one open request at a time |
| Categories required in v1 | **No** |
| After fully funded | Request becomes **private** |
| Public identity on live requests | **Full name + photo** required |
| Language | **English only** |

### Money & operations
| Rule | Decision |
|---|---|
| Platform fee | **0%** |
| Where money sits before payout | **Paystack platform balance (operational escrow)** |
| Payout cadence | **Weekly** |
| If goal not reached by deadline | **Refund** donors |
| Donor refunds allowed | **Yes** |
| Paystack / legal owner | **Private entity** |

### Trust & admin
| Rule | Decision |
|---|---|
| Minimum verification | **NIN or phone number** |
| Admin reviewer at launch | **Client (self)** |
| Disallowed request types | **Yes** — see §8.1 suggested list |

### Brand & UX
| Rule | Decision |
|---|---|
| Name / domain | **Prosperax.org** |
| Message | **Mutual aid** |
| Design style | Rising Lion–inspired editorial layout ✅ |
| Tone | **Hopeful community** |
| Homepage must-include | **WhatsApp follow** |
| Seed requests at planning time | **No** — soft-launch plan in §8.6 |

---

## 3. Product vision

> **Prosperax** — hopeful mutual aid for Nigeria. Real people share verified needs; neighbors send help through Paystack; gifts are held safely until approval, paid out weekly, fees stay at zero, and trust stays visible.

**Core loop**
1. Requester opens the create link and submits one help request (name, photo, story, goal, NIN **or** phone).
2. Client admin reviews / approves (rejects disallowed content).
3. Request goes **live**; donors discover and give via Paystack.
4. Funds land in the **platform Paystack balance** (held until release).
5. Donations accumulate toward the goal on the live page.
6. **Weekly** payouts transfer eligible funds to approved recipients.
7. If the deadline passes without reaching the goal → **refund** donors from held balance.
8. When funded/closed → request becomes **private**.

**Primary users**
- **Requester** — needs help; only one open request
- **Donor** — gives to a specific live request
- **Admin (client)** — reviews, moderates, runs weekly payouts / refunds

---

## 4. Design direction (Prosperax × Rising Lion)

Reference: [risinglionmoney.com](https://risinglionmoney.com/)

Borrow editorial confidence; keep a hopeful mutual-aid identity in **green**. Do not copy markets/investing framing.

### Adaptations under locked rules
| Pattern | Prosperax application |
|---|---|
| Brand-led hero | **Prosperax** as hero signal + mutual-aid promise + CTAs |
| “Rising of the Day” | **Need of the Day** from *live* requests only |
| Story cards | Name + photo + short hook + raised/goal (NGN) |
| Pulse strip | Soft stats (given this week, open requests, people helped count) |
| Dual paths | **Send help** / **Request help** |
| WhatsApp | **Follow on WhatsApp** on home (must-have) |
| After funding | No public personal success archive — aggregate hopeful stats only |
| Trust copy | “Gifts held until approval · weekly payouts · Prosperax fee 0%” |

### Landing composition
1. **Hero** — Prosperax + mutual-aid line + `Send help` / `Request help`
2. **WhatsApp follow**
3. **Pulse strip** — calm live stats
4. **Need of the Day** — one live featured request
5. **How it works** — Request → Verify → Give (held safely) → Weekly payout
6. **Open requests** — browse live stories only
7. **Trust** — hold-before-payout, 0% fee, NIN/phone verification, refund rule
8. **Final CTA** — give or request + WhatsApp again

### Key screens
1. Home  
2. Browse live requests  
3. Request detail + donate  
4. Create request (link-accessible)  
5. Requester / donor dashboard  
6. Admin review + weekly payout / refund tools  
7. Trust/legal pages (About, How it works, Terms, Privacy, Refunds, Acceptable use)

**Suggested tagline options (client can pick one)**
- “Mutual aid for Nigeria.”
- “Send help. Hold trust. Grow together.”
- “Neighbor to neighbor — mutual aid, made clear.”

---

## 5. MVP scope

**Suggested build window:** ~10–12 weeks after scaffolding starts (soft launch at end of Phase 4).

### In scope
1. Prosperax marketing/home (Rising Lion–inspired, hopeful, WhatsApp follow)
2. Auth: **phone OTP primary** + email for receipts (see §8.4)
3. Create Help Request via open link  
   - Fields: full name, photo, story, goal (NGN, no max), deadline (default 30 days), NIN **or** phone  
   - Enforce **one open request per user**
4. Browse / view **live** requests only
5. Donate via Paystack into **platform balance hold**
6. Progress: raised vs goal, supporters
7. Statuses: `draft` → `pending_review` → `live` → `funded` / `closed_refunded` / `rejected`  
   - Closed successful requests → **private**
8. Admin: approve/reject, disallowed flags, **weekly payout batch**, **refund tools**
9. Deadline handling: unmet goal → refund flow
10. Receipts + basic history
11. Email notifications (donation, approved, payout, refund)
12. Policy pages (including Acceptable Use + Refunds)

### Out of scope for MVP
- Native apps, wallets, chat
- Public post-funding story archive
- Category system
- Recurring donations
- Multi-language / multi-country
- Formal legal escrow bank product
- Automated KYC beyond NIN-or-phone + manual review
- WhatsApp bot (follow link/channel only)

---

## 6. Architecture

```text
[ Next.js — Prosperax.org ]
        |
        | HTTPS / REST
        v
[ FastAPI ]
        |
        +--> PostgreSQL (users, help_requests, donations, payouts, refunds, audit)
        +--> Paystack
        |       - Checkout (collect)
        |       - Manual payouts / settle-to-balance (HOLD)
        |       - Transfers (weekly release to recipients)
        |       - Refunds (unmet goal / donor refund)
        +--> Object storage (photos)
        +--> Email provider
        +--> Admin tools
```

### Core entities
- `User` — requester/donor/admin; one-open-request constraint
- `HelpRequest` — story, goal_ngn, deadline_at, status, visibility, verification_type (`nin`|`phone`)
- `Donation` — amount, status, Paystack reference, payout_eligible_at
- `PayoutBatch` / `Payout` — weekly settlement
- `Refund` — unmet-goal or donor-requested
- `MediaAsset`, `AuditLog`

### 6.1 Fund holding / “escrow” (confirmed approach)

**Client question:** *Can an escrow account be connected so all payments go there before approval?*  
**Answer:** **Yes — for v1 we use operational escrow via Paystack**, not a separate bank escrow product.

| Concept | Prosperax v1 choice |
|---|---|
| Operational hold | ✅ All successful donations settle into the **private entity’s Paystack balance** and stay there until admin-approved weekly release |
| Formal legal escrow account | ❌ Not required for MVP; can be revisited with a bank/lawyer later |

**Required Paystack setup**
1. Registered **private entity** Paystack business account  
2. Enable **[Manual payouts / settle to balance](https://support.paystack.com/en/articles/2131074)** so collections are not auto-swept only to bank before we can transfer  
3. Use **[Transfers](https://support.paystack.com/en/articles/2132866)** for weekly recipient payouts  
4. Use Paystack **Refunds** for unmet goals / eligible donor refunds  

**Site behavior**
1. Donor pays on a live HelpRequest.  
2. Webhook confirms payment → donation recorded as `held`.  
3. Public progress updates; money remains in platform balance.  
4. Admin approval + weekly job moves eligible `held` donations → Transfer to requester.  
5. Unmet goal / eligible refund → refund from balance; request may close as `closed_refunded`.  

**Product copy suggestion:** “Your gift is held securely until the request is approved for payout.”  
Avoid promising “bank escrow” unless a formal escrow product is later contracted.

### Money flow (end-to-end)
1. Donor → Paystack Checkout → **platform balance (hold)**  
2. Backend webhook (idempotent) → mark donation successful / held  
3. Live progress updates  
4. Weekly payout batch → Paystack Transfer to recipient bank account  
5. Missed goal by deadline → refund donors  
6. Prosperax platform fee **0%**; show Paystack processing fees separately (§8.3)

---

## 7. Non-functional priorities

- Trust & safety under open create link  
- Correct hold → weekly payout → refund ledger  
- Privacy for non-live requests  
- Clear 0% Prosperax fee vs Paystack fees  
- Mobile performance · English-only  
- Admin UX for a **single operator**

---

## 8. Suggested defaults (formerly open points)

These fill planning gaps so work can start. Client may override any row.

### 8.1 Disallowed request types — **Suggested default**
Publish under Acceptable Use. Admin must reject if present:

1. Illegal activity under Nigerian law  
2. Weapons, ammunition, or violent crime support  
3. Drugs / controlled substances  
4. Gambling, betting, or lottery funding  
5. Hate, harassment, or discrimination  
6. Adult / sexual content or exploitation  
7. Political campaign financing or partisan propaganda  
8. Investment, “money doubles,” crypto-get-rich, or any yield promise  
9. Requests that impersonate others or use stolen photos/IDs  
10. Fundraising for another person/org **without clear authorization/proof**  
11. Clearly fraudulent, misleading, or duplicate spam requests  
12. Anything that would make Paystack or banking partners block the merchant  

### 8.2 Request deadline — **Suggested default: 30 days**
- Default `deadline_at` = approve/live time + **30 days**  
- Requester may choose 14 / 30 / 60 days at create time (optional UI); default 30  
- Soft UI warning if goal looks extremely high for timeline (no hard max amount)

### 8.3 Refund SLA — **Suggested default**
| Case | Rule |
|---|---|
| Goal not reached by deadline | Auto-queue refunds within **3 business days** after deadline |
| Donor-requested refund | Allowed if donation is still **held** (not yet included in a successful weekly payout), within **7 days** of payment |
| After payout to recipient | **No automatic refund**; exceptional cases handled manually by admin |
| Failed/duplicate charge | Full refund as soon as confirmed |

Refunds use Paystack refund APIs back to the original payment method when possible.

### 8.4 Fee display copy — **Suggested default**
On donate UI + FAQ:

> **Prosperax platform fee: 0%.**  
> Payment processing is handled by Paystack. Paystack’s standard processing fees may apply and are charged by Paystack, not by Prosperax as a platform fee.

### 8.5 Auth — **Suggested default**
- **Primary:** Phone number + OTP (fits NG usage + verification option)  
- **Also collect:** Email for receipts / payout notices  
- Verification field on request: **NIN or phone** (phone may already be the login phone)  
- Admin login: email + strong password (or same OTP), separate admin role

### 8.6 WhatsApp follow — **Suggested default**
- Homepage CTA: **Follow Prosperax on WhatsApp**  
- Destination: client WhatsApp **Channel or Community** URL (placeholder until provided)  
- Doc field to fill later: `WHATSAPP_FOLLOW_URL=…`  
- Until URL exists, soft launch can use a temporary wa.me link to the client’s number/community

### 8.7 Soft-launch plan — **Suggested default** (no seeds yet)
1. **Week −2:** Client invites 5–10 trusted requesters privately (church/community/friends).  
2. Create requests via the open link; admin approves only verified ones.  
3. **Week −1:** Small donor circle tests real Paystack test → then live small donations.  
4. Run one full **weekly payout** and one **refund test** before public marketing.  
5. **Public launch:** Open WhatsApp + social only after ≥3 live requests are on the site.  
6. Keep create-link sharing calm at first (avoid viral empty-feed problem).

### 8.8 Launch targets — **Suggested default**
| Item | Suggestion |
|---|---|
| Soft launch | ~10–12 weeks after build start |
| Public push | After soft-launch checklist (§8.6) passes |
| 90-day success metric | **10 completed weekly payout cycles**, **₦1–2M total verified donations**, **≥20 approved live requests over the period** |
| Budget | Client to confirm; engineering assumes MVP scope in §5 only |

### 8.9 Hosting — **Suggested default**
| Layer | Suggestion |
|---|---|
| Frontend (Next.js) | Vercel |
| API (FastAPI) | Render / Railway / Fly.io (pick one at scaffolding) |
| Database | Managed PostgreSQL (e.g. Neon or Supabase Postgres) |
| Files | S3-compatible (Cloudflare R2 or AWS S3) |
| Email | Resend or Postmark |
| Secrets | Environment vars + Paystack live keys only on production |

---

## 9. Decision log

### Locked by client
- Model A, Nigeria, English, green, Paystack, FastAPI/Postgres/Next.js  
- Brand Prosperax.org, mutual aid, hopeful tone, Rising Lion–style UX, WhatsApp follow  
- Open create link; no max goal; one open request; no categories  
- Live: full name + photo; completed → private  
- Verification: NIN or phone; admin = client  
- Fee 0%; weekly payouts; unmet goal → refund; donor refunds yes  
- Merchant = private entity  

### Adopted as suggested defaults (v4)
- Operational escrow via Paystack balance hold  
- Disallowed types list (§8.1)  
- 30-day default deadline  
- Refund SLA (§8.3)  
- Fee copy (§8.4)  
- Phone OTP + email receipts  
- Soft-launch plan (§8.6)  
- 90-day metrics + hosting defaults (§8.8–8.9)  

### Still needs client-provided values (non-blocking for PRD)
1. Final WhatsApp follow URL  
2. Exact private-entity legal name for Paystack + policies  
3. Final tagline pick  
4. Confirmed budget / hard launch calendar date  
5. Any edits to disallowed list or refund SLA  

---

## 10. Confirmed Q&A record

| # | Topic | Answer |
|---|---|---|
| 1 | Who can create | Anyone with the link |
| 2 | Max goal | No |
| 3 | Multiple open requests | No |
| 4 | Required categories | No |
| 5 | After funded visibility | Private |
| 6 | Platform fee | 0% |
| 7 | Payout timing | Weekly |
| 8 | Goal not reached | Refund |
| 9 | Donor refunds | Yes |
| 10 | Legal / Paystack owner | Private entity |
| 11 | Verification | NIN or phone number |
| 12 | Admin | Client (self) |
| 13 | Public identity | Full name + photo |
| 14 | Disallowed types | Yes → §8.1 suggested list |
| 15 | Brand / domain | Prosperax.org |
| 16 | Tagline direction | Mutual aid |
| 17 | Seed requests ready | No → soft launch §8.6 |
| 18 | English only | Yes |
| 19 | Rising Lion–style design | Yes |
| 20 | Tone | Hopeful community |
| 21 | Home must-have | WhatsApp follow |
| — | Escrow / hold before approval | Yes → Paystack balance hold §6.1 |

---

## 11. Next working session (~30–45 min)

Light confirmation only:

1. Accept or edit **§8 suggested defaults** (deadline, refunds, disallowed list)  
2. Provide **WhatsApp URL** + legal entity display name  
3. Pick a **tagline**  
4. Confirm Paystack manual-payout / settle-to-balance eligibility for the private entity  
5. Approve start of **PRD + wireframes + repo scaffolding**

---

## 12. Suggestions (operating principles)

1. Always describe money as **held until payout**, not “invested.”  
2. Mandatory admin review before `live` — open create is not auto-publish.  
3. Hard-enforce one open request in the API.  
4. Weekly payout + refunds are product features, not spreadsheet afterthoughts.  
5. Soft-launch before public traffic.  
6. North-star metric: **weekly successful payouts completed**.

---

## 13. Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| No seed requests | Empty feed | Soft launch §8.6 |
| Open create link | Abuse | Admin gate + §8.1 policy + NIN/phone |
| No max goal | Unrealistic asks | Soft warnings + admin reject |
| Hold/refund complexity | Ops errors | Ledger states: held → paid / refunded |
| Single admin | Bottleneck | Simple queue + email alerts + weekly checklist |
| Calling it “escrow” loosely | Legal confusion | Use “held in platform balance” in UI unless formal escrow exists |
| Paystack fee confusion | Trust | §8.4 copy |
| Manual payouts not enabled | Can’t hold for weekly release | Complete Paystack manual-payout setup before go-live |

---

## 14. Delivery phases

### Phase 0 — Discovery ✅
- Model, brand, money rules, escrow approach, suggested defaults documented  

### Phase 1 — Foundation
- Auth (phone OTP), HelpRequest CRUD, one-open-request, Paystack test donate + webhook, admin approve/reject  

### Phase 2 — Hold, payout, refund
- Settle-to-balance hold states, weekly Transfer batch, unmet-goal refunds, donor refund path, private visibility  

### Phase 3 — Prosperax story UX
- Home (Need of the Day, WhatsApp, trust/hold/0% fee), browse, share links  

### Phase 4 — Launch readiness
- Production Paystack, policies, monitoring, soft launch checklist  

### Phase 5 — Growth
- Discovery improvements, recurring giving, WhatsApp automation, localization later  

---

## 15. Immediate next steps

1. Client skims **§8** and notes any overrides.  
2. Produce **Prosperax PRD (1–2 pages)** from this v4 plan.  
3. Low-fi wireframes for the 7 key screens.  
4. Paystack go-live checklist (business account, manual payouts/balance, transfers, refunds, webhooks).  
5. Scaffold **Next.js + FastAPI + Postgres** on suggested hosting.

---

## 16. Current decision gate

> Prosperax v1 rules are complete enough to design and build.  
> **Operational escrow (Paystack balance hold → weekly Transfer after approval)** is the payment architecture.  
> Next gate: quick confirm of §8 defaults + WhatsApp URL, then PRD / wireframes / scaffolding.

---

*Planning draft for alignment — not a contract, quote, or legal opinion. “Escrow” here means operational fund holding in the Paystack merchant balance until approved payout or refund. Paystack processing fees are separate from Prosperax’s 0% platform fee.*
