# Poverty Development Platform — Project Plan (Draft for Client Discussion)

**Status:** Draft for alignment  
**Target market:** Nigeria  
**Preferred brand color:** Green  
**Payment gateway:** Paystack  
**Proposed stack:** FastAPI + PostgreSQL (backend), Next.js (frontend)  
**Document purpose:** Turn a high-level idea into a clear product direction, architecture outline, open questions, and discussion agenda before development starts.

---

## 1. What we heard (client idea)

People use a web platform related to **poverty / community development**. Users can **send money to one another**, and activity **grows** over time (more users, more contributions, more impact).

This is still intentionally vague. Before building, we need to agree on **what the product actually is**, **who it is for**, and **what “grows” means**.

---

## 2. Possible product interpretations (pick one primary model)

These are common patterns that match the idea. We should choose **one primary model** for v1 (others can come later).

| Model | Short description | “Grows” means | Complexity |
|---|---|---|---|
| **A. Mutual aid / peer donations** | Individuals request help; others donate to them | More requests + donations + stories | Medium |
| **B. Campaign crowdfunding** | Creators run campaigns (medical, school, community); donors fund campaigns | Campaign count, funds raised, success rate | Medium–High |
| **C. Community pool / collective fund** | Users contribute to a shared pool; pool supports verified needs | Pool size + number of supported people | High (governance) |
| **D. Recurring giving circles** | Small groups donate regularly to rotating members | Membership + consistency | High (trust & rules) |
| **E. NGO / project marketplace** | Verified organizations list projects; donors fund them | Projects funded + transparency reports | Medium |

**Recommendation for discussion:** Start with **Model B (campaign crowdfunding)** or **Model A (peer donations)** for Nigeria + Paystack, because they are clearer for users, easier to regulate operationally, and map cleanly to Paystack checkout/transfers.

---

## 3. Proposed product vision (draft — to confirm)

> A trusted Nigerian platform where people and communities can create verified funding needs, receive contributions via Paystack, and show transparent progress so giving compounds into visible development impact.

**Brand direction (draft):**
- Color: green (growth, trust, community)
- Tone: hopeful, clear, accountable — not charity-shame or luxury fintech
- Core promise: **send help → see progress → grow impact**

---

## 4. Suggested MVP (v1) scope

Aim for a useful first release in **8–12 weeks** (estimate only; depends on final model and compliance needs).

### In scope (MVP)
1. **Public landing page** (mission, how it works, trust signals)
2. **User accounts** (sign up / login; email or phone)
3. **Create a request or campaign** (title, story, goal amount, category, media)
4. **Browse / search** active campaigns or requests
5. **Donate via Paystack** (card / bank / local methods Paystack supports in NG)
6. **Progress tracking** (amount raised vs goal, recent supporters)
7. **Basic verification status** (unverified / pending / verified)
8. **Admin review panel** (approve/reject campaigns, flag abuse)
9. **Receipt / transaction history** for donors and recipients
10. **Basic notifications** (email: donation received, campaign approved)

### Out of scope for MVP (discuss later)
- Mobile native apps
- Wallet balances / internal ledger spending between users
- Peer-to-peer chat
- Investment / interest / “money grows” financial products
- Matching grants automation
- Multi-country expansion
- Complex KYC beyond what Paystack + manual admin can cover

> Important: If “money grows” means **interest / investment yield**, that becomes a regulated financial product and should be treated as a separate legal track — not assumed for MVP.

---

## 5. High-level architecture

```text
[ Next.js Web App ]
        |
        | HTTPS / REST (or RPC)
        v
[ FastAPI Backend ]
        |
        +--> PostgreSQL (users, campaigns, donations, statuses)
        +--> Paystack API (checkout, webhooks, transfers)
        +--> Object storage (campaign images / docs)  e.g. S3-compatible
        +--> Email provider (receipts, alerts)
        +--> Admin tools (same backend + protected UI)
```

### Suggested service boundaries

| Layer | Responsibility |
|---|---|
| **Next.js** | Marketing pages, campaign discovery, donate UX, dashboards, SEO |
| **FastAPI** | Auth, business rules, campaign lifecycle, webhook handling, admin APIs |
| **PostgreSQL** | Source of truth for users, campaigns, donations, payouts, audit logs |
| **Paystack** | Payment collection; later payouts/transfers to recipients |
| **Webhooks** | Confirm successful payments reliably (never trust frontend alone) |
| **Admin** | Manual review, fraud flags, content moderation |

### Core data entities (draft)

- `User` (donor / campaign owner / admin roles)
- `Campaign` or `HelpRequest` (goal, story, status, verification)
- `Donation` (amount, donor, campaign, Paystack reference, status)
- `Payout` (transfer to recipient bank/account, status)
- `MediaAsset` (images/docs)
- `AuditLog` (admin actions, status changes)

### Money flow (recommended for v1)

1. Donor pays via Paystack checkout.
2. Funds land in **platform merchant account** (or split model if used).
3. Backend marks donation successful only after **Paystack webhook**.
4. Admin (or automated rules) approves payout.
5. Platform pays out to recipient via Paystack Transfer (or manual bank process at first).

**Discussion choice:** Instant payout vs held-until-goal vs periodic settlement.

---

## 6. Non-functional priorities

- **Trust & safety:** verification, abuse reporting, suspicious activity review
- **Payment reliability:** webhook idempotency, reconciliation jobs
- **Transparency:** clear fees, clear “where money went”
- **Performance:** fast campaign pages on mobile networks
- **Security:** auth hardening, secrets management, role-based admin access
- **Compliance readiness:** privacy policy, terms, refund policy, KYC posture

---

## 7. Suggested tech decisions (aligned with your proposal)

| Area | Suggestion | Why |
|---|---|---|
| Backend | FastAPI | Fast APIs, clear validation, good for payment webhooks |
| DB | PostgreSQL | Relational integrity for money + status workflows |
| Frontend | Next.js | SEO for campaigns, good DX, solid production path |
| Auth | JWT/session + refresh (decide in tech kickoff) | Secure dashboards for donors/creators |
| Hosting | e.g. Vercel (web) + cloud VM/container (API) + managed Postgres | Simple early ops |
| Files | S3-compatible storage | Campaign images/docs |
| Observability | structured logs + error tracking | Critical for payment issues |

Open-source alternatives and exact cloud vendors can wait until product model is locked.

---

## 8. Brand & UX notes (green, Nigeria-first)

- Lead with **trust**: real stories, verification badges, progress, receipts
- Green palette: growth + reliability; avoid generic “fintech purple”
- Mobile-first: many users will donate on phone
- Local clarity: NGN amounts, Nigerian categories, clear Paystack methods
- Hero message should make the brand/product unmistakable in one viewport
- Keep first release visually simple: brand, one promise, one primary action (“Donate” / “Start a campaign”)

---

## 9. Questions for the client (priority)

### Product definition
1. Is this mainly **donations**, **fundraising campaigns**, **community savings**, or something else?
2. Who is the primary user in month 1: donors, people in need, NGOs, churches/communities, or all?
3. What does “it grows” mean exactly — more users, more total donated, recurring giving, or financial yield?
4. Should recipients be **individuals**, **groups/NGOs**, or both?
5. Do donors give to a **specific person/campaign**, or to a **general fund**?

### Money & operations
6. Who receives the money legally — platform company, campaign owner, or partner NGO?
7. Are platform fees charged? If yes, what % / flat fee, and is it shown clearly?
8. When is money paid out — instantly, after goal reached, weekly, or on request?
9. What happens if a campaign does not reach its goal?
10. Refunds: allowed? under what conditions?
11. Do you already have a registered Nigerian business / NGO entity for Paystack?

### Trust & compliance
12. What verification is required before someone can receive funds (ID, utility bill, community letter, etc.)?
13. Who reviews and approves campaigns in the beginning (client team size)?
14. Any categories that are not allowed (politics, weapons, etc.)?
15. Privacy expectations for recipients (public story vs anonymized)?

### Go-to-market
16. What is the first city/community/network you can launch with?
17. Do you have seed campaigns or partner organizations ready at launch?
18. What is success in 90 days (e.g. 50 campaigns, ₦X raised, Y returning donors)?
19. Preferred language(s): English only, or also Hausa / Yoruba / Igbo later?
20. Domain name / brand name already decided?

### Scope & budget
21. Target launch date?
22. Budget range for MVP (design + build + Paystack/ops)?
23. Who provides content (stories, photos, FAQs, legal pages)?
24. Will there be an admin operator daily after launch?

---

## 10. Discussion points for the next meeting

Use this agenda (~60–90 minutes):

1. **Confirm product model** (A/B/C/D/E from section 2)
2. **Agree MVP must-haves** (cut list if needed)
3. **Money flow decision** (hold / payout / fees / refunds)
4. **Verification & trust process** (manual first is OK)
5. **Legal entity & Paystack readiness**
6. **Brand basics** (name, green direction, tone)
7. **Timeline & roles** (client vs developer responsibilities)
8. **Next artifact after this meeting:** 1-page PRD + wireframe outline

---

## 11. Suggestions (so the project stays realistic)

1. **Do not build a wallet first.** Collect via Paystack checkout, record donations, pay out intentionally.
2. **Manual verification in v1.** Automation can come after real abuse patterns appear.
3. **Launch with a narrow niche.** Example: education support in one city, or medical emergency campaigns only.
4. **Seed the marketplace.** Empty platforms fail; prepare 5–10 credible campaigns before public launch.
5. **Make transparency a feature.** Show raised amount, updates from recipients, and basic “funds sent” status.
6. **Write clear policies early.** Terms, acceptable use, refunds, and privacy reduce payment disputes.
7. **Separate “impact growth” from “money growth.”** Marketing should not sound like investment returns unless legally intended.
8. **Plan for dispute handling.** Chargebacks and fraudulent campaigns will happen; define admin playbook.
9. **Measure one north-star metric.** Suggested: *successful verified donations per week*.
10. **Keep architecture boring.** FastAPI + Postgres + Next.js + Paystack is enough for MVP scale.

---

## 12. Risks to discuss openly

| Risk | Why it matters | Mitigation |
|---|---|---|
| Unclear product identity | Build wrong thing | Lock model before UI polish |
| Trust abuse / fake campaigns | Destroys brand quickly | Verification + admin review |
| Payment / payout complexity | Delays launch | Start with collect-now, payout-later |
| Regulatory ambiguity | Especially if funds are pooled or “grow” | Legal consult if needed; avoid investment framing |
| Empty supply at launch | No campaigns → no donors | Seed content + partners |
| Operational load | Someone must approve/support users | Define admin ownership |

---

## 13. Proposed delivery phases

### Phase 0 — Discovery (this document + workshop)
- Lock product model, MVP scope, money flow, brand name

### Phase 1 — Foundation
- Auth, campaign CRUD, Paystack test donations, admin approval

### Phase 2 — Trust & transparency
- Verification states, donation receipts, campaign updates, basic reports

### Phase 3 — Launch readiness
- Production Paystack, legal pages, seeded campaigns, monitoring

### Phase 4 — Growth (post-MVP)
- Recurring donations, better search, localization, payout automation, impact stories

---

## 14. Immediate next steps

1. Review this document with the client.
2. Answer the priority questions in section 9.
3. Choose one product model for v1.
4. Produce a short PRD (goals, users, user stories, success metrics).
5. Sketch 5–7 key screens (home, campaign list, campaign detail, donate, create campaign, admin review).
6. Confirm Paystack business account readiness.
7. Only then start technical scaffolding (Next.js + FastAPI + Postgres).

---

## 15. One-sentence decision we need from the client

> “In version 1, should people mainly **donate to individual/campaign stories**, and should money be **paid out to verified recipients after approval**, without any investment-style growth?”

If yes, we can proceed confidently with the architecture above.  
If no, we revisit the model before any coding.

---

*This is a planning draft, not a contract or final specification. Technical estimates and legal conclusions require confirmation after product decisions.*
