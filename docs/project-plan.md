# Poverty Development Platform — Project Plan (v2)

**Status:** Decisions locked for model + design direction · ready for next client workshop  
**Document version:** 2.0  
**Last updated:** 2026-08-12  

| Item | Decision |
|---|---|
| Target market | Nigeria |
| Brand color | Green |
| Payment gateway | Paystack |
| Product model | **A — Mutual aid / peer donations** ✅ Confirmed |
| Design reference | [Rising Lion Money](https://risinglionmoney.com/) (editorial story style, adapted for giving) |
| Stack | FastAPI + PostgreSQL (backend), Next.js (frontend) |

**Document purpose:** Capture what is already agreed, refine the Model A product shape, define a Rising-Lion-inspired UX direction, and list the remaining decisions for the next discussion.

---

## 1. Confirmed direction

### Product model: A — Mutual aid / peer donations
- People in need publish **personal help requests** (story + goal + proof).
- Other people **donate directly to that person/request** via Paystack.
- Activity “grows” through **more verified requests, more donors, more completed helps, and public impact stories** — not investment yield.

### What we are *not* building in v1
- Crowdfunding campaign marketplace as the primary model (Model B)
- Shared community pool / investment-style “money grows”
- Giving circles with rotating payouts
- NGO project marketplace as the core experience

Those can be discussed later as expansion options.

---

## 2. Product vision (updated)

> A Nigeria-first mutual aid platform where real people share verified needs, others send help through Paystack, and every successful gift becomes a visible story of progress.

**Core loop**
1. Someone creates a help request.
2. Admin reviews / verifies.
3. Donors discover the story and give.
4. Funds are recorded and paid out to the recipient.
5. The platform shows progress and impact — so trust and participation grow.

**Primary users (v1 assumption — confirm next meeting)**
- **Requester:** person who needs help
- **Donor:** person who wants to give to a specific story
- **Admin:** reviews requests, manages payouts, handles abuse

---

## 3. Design direction — inspired by Rising Lion Money

Reference: [risinglionmoney.com](https://risinglionmoney.com/)

We are **not cloning** that site. We are borrowing its **editorial confidence**: strong brand voice, story-first layout, continent/local pride, and shareable narrative blocks — then adapting them to mutual aid.

### What to borrow
| Rising Lion pattern | How we adapt it |
|---|---|
| Bold brand-led hero (“African money, on the move”) | Brand + one giving promise + one primary CTA |
| Story franchises (“Rising of the Day”) | Recurring blocks like **Need of the Day**, **Helped this week**, **Impact update** |
| Short, shareable story cards | Help-request cards: face/story hook + location + amount needed/raised |
| Live ticker / pulse strip | Soft social proof: total given today, people helped, active requests (NGN) |
| Quote / voice moments | Short beneficiary or donor quotes (trust, not hype) |
| Clear dual paths (reader / partner) | Dual CTAs: **Send help** / **Request help** |
| Mobile + WhatsApp-native distribution mindset | Easy share links; later WhatsApp updates (post-MVP ok) |

### What *not* to copy
- Markets / stock tickers / investing framing
- Newsletter-media IA as the whole product
- Sponsor-ad slots as a first-release priority
- Any look that implies financial returns

### Visual principles (green, Nigeria-first)
- **Brand first** in the opening viewport — name must read as the hero signal
- **Green** as the trust/growth system color (not generic purple fintech)
- **Editorial typography** — expressive display + readable body (avoid Inter/Roboto/Arial defaults)
- **Atmosphere** — subtle texture/gradient + real Nigerian people/context imagery (not flat gray/white only)
- **Full-bleed story hero** on landing; no card collage in the first viewport
- **One job per section**
- **Motion with purpose** (2–3): e.g. ticker fade, story card entrance, progress bar fill
- Mobile-first; fast on common Nigerian connections

### Landing page composition (draft)
1. **Hero:** brand + one headline + one supporting line + CTA group (`Send help` / `Request help`)
2. **Pulse strip:** live giving stats (kept calm, not casino-like)
3. **Need of the Day:** one featured human story (Rising-of-the-Day equivalent)
4. **How it works:** 3 steps (Request → Verify → Give)
5. **Open requests:** story list (not dense dashboard)
6. **Impact stories:** recently helped
7. **Trust:** verification + Paystack + policies
8. **Final CTA:** join as donor or requester

### Key product screens (for next design pass)
1. Home / editorial landing  
2. Browse requests  
3. Request detail + donate  
4. Create request  
5. Donor / requester dashboard  
6. Admin review queue  
7. Static trust pages (About, How it works, Terms, Privacy)

---

## 4. MVP scope (Model A)

**Rough timeline:** 8–12 weeks after remaining product decisions are locked.

### In scope
1. Editorial-style public landing (Rising Lion–inspired)
2. Auth (email and/or phone — decide next)
3. Create **Help Request** (story, category, goal in NGN, photos/docs)
4. Browse / filter open requests
5. Donate to a specific request via **Paystack**
6. Raised vs goal + recent supporters
7. Request statuses: draft → pending review → live → funded/closed
8. Verification states: unverified / pending / verified
9. Admin panel: approve/reject, flag abuse, mark payout sent
10. Donation receipts + basic history
11. Email (or SMS later) for donation received / request approved

### Out of scope for MVP
- Native mobile apps
- In-platform wallet / balance spending
- Chat between donor and requester
- Investment / interest products
- Recurring donations (nice follow-up)
- Multi-country expansion
- Heavy automated KYC
- Full WhatsApp bot (optional later; share links first)

---

## 5. Architecture (unchanged stack, Model A naming)

```text
[ Next.js Web App — editorial UX ]
        |
        | HTTPS / REST
        v
[ FastAPI Backend ]
        |
        +--> PostgreSQL (users, help_requests, donations, payouts, audit)
        +--> Paystack (checkout + webhooks + transfers)
        +--> Object storage (request images / ID docs)
        +--> Email provider
        +--> Admin API / UI
```

### Core entities
- `User` (roles: requester, donor, admin — a user may be both requester and donor)
- `HelpRequest` (story, goal_ngn, category, status, verification)
- `Donation` (amount, donor, request, Paystack reference, status)
- `Payout` (recipient account details, amount, status)
- `MediaAsset`
- `AuditLog`

### Money flow (recommended default for next discussion)
1. Donor pays via Paystack checkout to a **specific HelpRequest**.
2. Platform confirms via **webhook** (idempotent).
3. Request progress updates.
4. Admin approves payout to verified recipient.
5. Payout via Paystack Transfer (or manual bank payout in earliest launch).

**Still open:** instant vs periodic payout; platform fee; goal-not-reached behavior.

---

## 6. Non-functional priorities

- Trust & safety (fake requests are the #1 brand risk)
- Payment correctness (webhooks, reconciliation)
- Transparency (fees, payout status, story updates)
- Mobile performance
- Security (auth, admin roles, document privacy)
- Clear policies (terms, refunds, acceptable use)

---

## 7. Tech decisions

| Area | Choice | Notes |
|---|---|---|
| Backend | FastAPI | Webhooks + strict validation |
| DB | PostgreSQL | Money/state integrity |
| Frontend | Next.js | SEO for request stories |
| Payments | Paystack | Nigeria methods |
| Files | S3-compatible | Photos + verification docs |
| Hosting | TBD in tech kickoff | Keep simple for MVP |

---

## 8. Decisions already made vs still open

### Locked
- Model **A** (peer mutual aid)
- Nigeria focus
- Green brand direction
- Paystack
- FastAPI + Postgres + Next.js
- Design reference: Rising Lion Money editorial style

### Open for next discussion
See sections 9–10.

---

## 9. Questions for next client discussion

### A. Product rules (Model A specifics)
1. Can anyone create a help request, or only invited/verified users?
2. Is there a **maximum goal amount** per request?
3. Can a person have multiple open requests at once?
4. Required categories for v1? (e.g. medical, school fees, food, rent, business restart)
5. After a request is fully funded, can it stay public as an impact story?

### B. Money & operations
6. Platform fee? (0% at launch vs small % — must be shown clearly)
7. Payout timing: on each donation, daily/weekly batch, or only when goal is reached?
8. If goal is not reached by deadline: payout partial, extend, or refund?
9. Refund policy for donors?
10. Who owns the Paystack merchant account / legal entity?

### C. Trust & verification
11. Minimum verification before going live (phone? NIN? photo ID? utility bill? guarantor?)
12. Who is the daily admin reviewer at launch?
13. Public identity: full name + photo required, or partial anonymity allowed?
14. Disallowed request types?

### D. Brand & content
15. Final product/brand name + domain?
16. Tagline options (Rising-Lion energy, but about mutual aid — not markets)?
17. Do we have 5–10 real seed requests for launch?
18. English only for v1?

### E. Design confirmation
19. Confirm we should closely follow Rising Lion’s **editorial story layout**, while keeping our own green mutual-aid identity.
20. Preference on tone: more hopeful community, more serious journalism, or mix?
21. Any must-have sections on home (stats, quotes, WhatsApp follow, etc.)?

### F. Delivery
22. Target launch date / soft-launch community?
23. Budget range and who supplies legal copy + photography?
24. Success metric for 90 days (e.g. X completed helps, ₦Y donated, Z returning donors)?

---

## 10. Agenda for next meeting (~60–90 min)

1. **Recap locked decisions** (Model A + Rising Lion–inspired design)
2. **Approve MVP feature list** (section 4) — cut or add
3. **Money rules** (fee, payout timing, partial funding, refunds)
4. **Verification playbook** (what is required before “Live”)
5. **Brand kit basics** (name, tagline, green palette direction, tone)
6. **Home page wireframe review** (hero → Need of the Day → requests → impact)
7. **Launch seeding plan** (who provides first real stories)
8. **Agree next artifacts:** short PRD + low-fi wireframes + Paystack account checklist

---

## 11. Suggestions for this phase

1. Keep v1 language as **help / give / request** — avoid crowdfunding or investment wording.
2. Make **Need of the Day** the emotional center of the homepage (like Rising of the Day).
3. Start with **manual admin verification**; automate later.
4. Prefer **collect now, payout on approval** over instant peer wallet transfer.
5. Seed **real Nigerian stories** before ads/traffic.
6. Show **verification badges + payout status** publicly to borrow Rising Lion’s trust-through-clarity feel.
7. Add shareable request links early (WhatsApp sharing matters in NG).
8. North-star metric proposal: **verified donations completed per week**.

---

## 12. Risks (updated for Model A)

| Risk | Why it matters | Mitigation |
|---|---|---|
| Fake personal hardship stories | Destroys trust fast | ID checks + manual review + public reporting |
| Design feels like a news site, not a giving product | Users don’t know how to donate | Strong CTAs + donate path above the fold on request pages |
| Empty request feed at launch | No reason to return | Seed 5–10 verified requests |
| Payout delays / disputes | Donor & requester frustration | Clear SLA + status labels |
| Overbuilding editorial features | Slows payments MVP | Ship story UI only where it helps giving |

---

## 13. Delivery phases (adjusted)

### Phase 0 — Discovery (current)
- ✅ Model A locked  
- ✅ Design reference chosen  
- ⬜ Money rules + verification + brand name

### Phase 1 — Foundation
- Auth, HelpRequest CRUD, Paystack test donate, admin approve/reject

### Phase 2 — Trust & story UX
- Verification states, receipts, Need of the Day / impact blocks, share links

### Phase 3 — Launch readiness
- Production Paystack, policies, seeded requests, monitoring

### Phase 4 — Growth
- Recurring giving, better discovery, WhatsApp updates, payout automation, localization

---

## 14. Immediate next steps

1. Walk this v2 plan with the client using the agenda in section 10.
2. Answer section 9 questions (especially money + verification).
3. Lock brand name / tagline.
4. Produce:
   - 1-page PRD
   - Low-fi wireframes for the 7 key screens
   - Paystack go-live checklist
5. Only then scaffold Next.js + FastAPI + Postgres.

---

## 15. Decision we want from the next meeting

> Confirm MVP money rules and verification rules so we can design Help Request + Donate flows without rework: **fee %, payout timing, partial-goal handling, and minimum ID requirements**.

Once those are set, engineering and UI design can start in parallel.

---

*Planning draft for alignment — not a contract, quote, or legal opinion.*
