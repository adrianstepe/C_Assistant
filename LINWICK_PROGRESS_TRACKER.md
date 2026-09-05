# Linwick progress tracker

Permanent working document for the launch-readiness plan in
`../LINWICK_LAUNCH_READINESS_PLAN.md` (5 September 2026). Two sections, both
permanent:

- **BUILD CHECKLIST** — everything that is code, grouped by the plan's W1–W7.
  Claude ticks these off once the work is committed and verified.
- **ADRIANS TO DO** — everything that needs a dashboard, an account, a payment
  or a judgement only Adrians can make. **Claude never ticks these off.** They
  are marked done only when Adrians says so in a later session.

Status keys: `[x]` done · `[~]` partly done · `[ ]` not started ·
`[!]` blocked on an ADRIANS TO DO item.

**Last updated:** 5 September 2026, after the `stealth-ox/provisioning-v1`
merge.

---

## Session log

### 5 September 2026 — provisioning merge + W1 claim repairs

**Merged.** `stealth-ox/provisioning-v1` → `main` as `2b51b48`.

A correction to the brief worth recording, because it changes what "merge the
branches" meant: **`stealth-ox/shopfront-fixes` and `stealth-ox/fulfilment-v1`
were already merged into `main` before this session** — both are 0 commits
ahead of `main` and 13–15 commits behind it, and `git branch --no-merged main`
named `provisioning-v1` alone (exactly as §1.1 of the plan reported). There was
nothing to merge from them and nothing to re-merge; merging them again would
have reverted work. Only `provisioning-v1` was outstanding.

**No conflicts arose, and none could have.** Against the merge base `aad7680`,
the branch changed 11 files and `main` changed 3 (`app/layout.tsx`,
`components/marketing/SiteFooter.tsx`, `lib/marketing/hero.ts`) — disjoint
sets. The conflicts anticipated in `layout.tsx`, `demo/page.tsx` and the
ContactForm/Composer area did not appear because those files reached `main`
through the earlier `fulfilment-v1` and `uiux-and-fulfilment-check` merges;
`provisioning-v1` never touched them. Both sides' work is intact — verified by
diffing the three files against the branch and confirming the merge left
`main`'s newer versions in place.

**Verification on the merge result** (not on the branch), against the local
portable Postgres on `127.0.0.1:54329`:

| Suite | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm run lint` | clean |
| `scripts/journey-check.mjs` | **21/21** — JOURNEY COMPLETE |
| `scripts/verify-phase1.mjs` | **24 passed** |
| `scripts/verify-phase2.mjs` | **36 passed** |
| `scripts/verify-phase2-browser.mjs` | **31 passed** |
| `scripts/verify-phase3.mjs` | **41 passed** |
| `scripts/verify-provisioning.mjs` | **33 passed** |

`journey-check` needs its rig spawned by hand — Stripe env blanked to force
dev-preview checkout (`.env.local` holds **live** keys, and a live `cs_live_…`
session opens otherwise), served from `http://localhost:3210` and not
`127.0.0.1` (Next 16 dev blocks its own chunks on the IP form), with the env
passed as an explicit map from node because PowerShell deletes a variable
assigned an empty string. The other five suites boot their own instances and
need only `--db-url`.

**Then committed as `bd7afd3`:** three claim-vs-code repairs, detailed under
W1 and W3 below.

---

## BUILD CHECKLIST

### W1 — Make production match the shopfront (BLOCKING)

- [!] **1. Decide: leave checkout live, or clear one Stripe price id.**
  → ADRIANS TO DO #4. Plan's recommendation: close it for the day.
- [!] **2. `ADMIN_USERNAME` / `ADMIN_PASSWORD` on Vercel.** → ADRIANS TO DO #1.
  Nothing to build; `/admin/leads` fails closed until they exist.
- [!] **3. EU Postgres, `LEADS_DATABASE_URL`.** → ADRIANS TO DO #2. Schema,
  client and `ensureSchema()` are built and exercised by every suite above.
- [!] **4. Resend: verify the domain, sending key, `EMAIL_SENDING_ENABLED=true`,
  webhook and signing secret.** → ADRIANS TO DO #3. The mail seam, retry ladder,
  bounce webhook and human escalation are built and pass 41 checks.
- [x] **5. Review, merge, deploy `provisioning-v1`.** Merged as `2b51b48`, 33/33
  on the merge result. *Deploying* it still depends on the env vars above.
- [x] **5b. `OWNER_NOTIFICATION_EMAIL` read and used correctly, and loud when
  unset.** Confirmed and then hardened this session:
  - `readOwnerNotificationConfig()` gates on `EMAIL_SENDING_ENABLED` +
    `RESEND_API_KEY` first, then on `OWNER_NOTIFICATION_EMAIL` — so alerts can
    be pointed away from a mailbox without touching customer mail.
  - It was **already loud, not silent**: `announce()` in
    `lib/provisioning/auto-enable.ts` emits
    `[provisioning] <slug> went live but NO owner alert was sent (<reason>)`,
    naming the exact closed gate, and `verify-provisioning [C4]` asserts that
    log line exists. That check passes.
  - What was still weak: the warning only fires **after** a sale has already
    gone unannounced, into a Vercel log nobody watches. Added
    `ownerNotificationStatus()` (key-free, the same discipline as
    `isEmailSendingEnabled()`) and a red banner at the top of `/admin/leads` —
    *"No one is being told when a customer buys"* — naming the closed gate.
    Discoverable while it is still free to fix. Confirmed rendering.
- [!] **6. Buy your own product in production with a real card.** → ADRIANS
  TO DO #5. **This is the release gate.** Nothing else proceeds until it passes.
- [x] **7. Confirm the cancellation route.** **Decision: the email route, not
  the Stripe customer portal.** Reasons, in order of weight:
  1. The portal is not trivial to wire. It needs a portal *configured in the
     Stripe dashboard* — credentials Claude does not have and, per this
     session's constraints, must not use.
  2. **There is no login anywhere in the product.** A portal session is minted
     from a Stripe customer id, and the only page holding one is
     `/checkout/success`, seen once, immediately after paying. A customer
     wanting to cancel in month three would have nothing to click. Fixing that
     properly means an authenticated customer area — a Release 2+ project, not
     a W1 item.
  3. The old sentence was false either way: *"cancel any time from the link in
     your Stripe receipt"* — a Stripe receipt carries no cancel link unless the
     portal is configured, and it is not.

  Implemented: `/checkout/success` now says to email `BRAND.contactEmail` to
  cancel, with the monthly-rolling terms restated; the **Cancelling** section of
  `/terms` names the same mechanism and states plainly that no self-service
  billing portal and no account exist. The two pages now agree.
- [x] **8. Fix the stale "no webhook exists yet" claim** on
  `app/(marketing)/checkout/success/page.tsx`. False since
  `app/api/stripe/webhook/route.ts` shipped, and doubly false now that the
  webhook is what flips a tenant live. Replaced with what the session lookup is
  actually for: the webhook is asynchronous and may not have landed by the time
  Stripe redirects, so this lookup decides what the page **says**, never what
  gets provisioned. *(The plan lists this under W3.5.)*

**W1 done when:** a stranger's card payment produces, with no human
intervention, an enabled tenant, a live capture page, an owner notification and
a delivered enquiry email — and `/admin/leads` shows all four.

**Still open in W1: items 1, 2, 3, 4 and 6 — every one of them an ADRIANS TO DO.
No code is outstanding.**

### W2 — Make the bought thing worth £79/month

- [ ] 1. Rewrite the enquiry email. Highest-value hour in the plan. Readable
      subject, aligned field block, real transcript, reference last, no
      `JSON.stringify` dump. Keep it plain text.
- [ ] 2. Per-tenant questions, **or** stop claiming them. Plan's decision #3:
      copy fix this week, build in Release 2.
- [ ] 3. Settle the snippet — build `/embed.js`, or drop the claim. Plan's
      decision #2: build it. Live claims today: homepage step 01, and
      `/checkout/success` step 03 *"We give you a snippet to paste in"*.
- [ ] 4. Decide what the customer can see; write it into the FAQ and terms.
- [ ] 5. Article 28 agreement in the flow: finish the draft, publish at a
      stable URL, record timestamped acceptance on the onboarding form.
      Also needs ADRIANS TO DO #8 (legal review).

### W3 — Give the landing page somewhere to convert

- [ ] 1. Guarantee on the pricing card above the button, and in the demo close.
- [ ] 2. Middle-funnel capture ("send your website address").
- [ ] 3. Proof band (design audit §4/§9). No invented proof.
- [ ] 4. FAQ with the real objections.
- [~] 5. Claim-vs-code pass over every page. **Started.** Three claims repaired
      this session (the webhook comment, the cancellation route on the success
      page, the cancellation mechanism in the terms). A full page-by-page pass
      is still outstanding — known survivors: the snippet claim (W2.3) and
      "your rules, not generic ones" (W2.2).

### W4 — Execute the design system already planned (D1–D3)

- [ ] 1. Re-measure with `visual-qa.mjs` first.
- [ ] 2. D1 foundations: spacing scale, three semantic surfaces, split-heading
      wrappers, 44px hit areas.
- [ ] 3. D2 homepage.
- [ ] 4. D3: demo as an instrument, pricing guarantee block, boundary section.
- [ ] 5. Investigate the hero animation (finding 11).

### W5 — Measurement

- [ ] 1. EU-hosted cookieless analytics wired into `emit()`.
      Needs ADRIANS TO DO #9 (account and payment).
- [ ] 2. Watch four numbers: demo started, demo completed, pricing viewed,
      checkout started.
- [ ] 3. Tag cold-email links so outbound reads off the same four.
- [ ] 4. Count enquiries per tenant server-side.

### W6 — External research and decisions (long lead times)

- [ ] 1. VAT answer (T-013). ADRIANS TO DO #6. Stripe `tax_behavior` is
      immutable per price, and checkout is already live.
- [ ] 2. Trademark search: LINWICK, classes 9/35/42, UK IPO. ADRIANS TO DO #7.
- [ ] 3. Model decision — time-boxed to one day, recorded either way, including
      "permanently off". DeepSeek stays off meanwhile (see `CLAUDE.md`).
- [ ] 4. Deliverability seed test (T-007) — now also proves the new Resend
      domain into Gmail, Outlook.com, M365 and Workspace.
- [ ] 5. Take the processor agreement out of draft and have it reviewed.
      ADRIANS TO DO #8.

### W7 — Operations

- [ ] 1. External uptime check on `/api/health` and one live capture page.
      Needs ADRIANS TO DO #10 (account).
- [ ] 2. Route errors somewhere read.
- [ ] 3. One-page runbook: daily cap trips, enquiry undeliverable, DB
      unreachable, deletion request, customer pause.
- [ ] 4. Back up the leads database; verify a restore once.

---

## ADRIANS TO DO

Dashboards, DNS, env vars, accounts, payments and judgement calls. Claude has
no credentials for any of these and must not attempt them.

**Never ticked off by Claude. Tell Claude in a later session and it will be
marked done here then.**

### Release 1 blockers — in this order

- [ ] **1. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` on Vercel.**
  The cheapest item on the list, and it restores all visibility. `/admin/leads`
  returns `503` today because it fails closed without them. Do this first so
  you can watch every later step land.

- [ ] **2. Provision an EU-region Postgres instance and set
  `LEADS_DATABASE_URL`.** (ADR-1: EU region, not US.) Without it no tenant can
  exist, no enquiry can be stored, and nothing appears in `/admin/leads`.
  Schema creation is automatic — `ensureSchema()` runs on first use.

- [ ] **3. Resend — all of this in one sitting:**
  1. Verify `linwick.co.uk` in Resend.
  2. Add the **SPF** and **DKIM** records it gives you to DNS.
  3. **Add a DMARC record while you are already in the DNS.** You will not want
     to come back for it.
  4. Create the sending API key and set `RESEND_API_KEY`, then set
     **`EMAIL_SENDING_ENABLED=true`** — the key alone does nothing, the flag is
     a deliberate second gate.
  5. Set **`RESEND_WEBHOOK_SECRET`** from Resend's webhook config page, and
     register the webhook endpoint.

  Set **`OWNER_NOTIFICATION_EMAIL`** here too. Without it a customer can buy,
  go live, and nothing tells you. `/admin/leads` now shows a red banner naming
  the missing variable until it is set.

- [ ] **4. Decide: leave checkout live during this work, or clear one Stripe
  price id so pricing shows its disabled state honestly.**
  The plan's recommendation is **close it for the day** — one env var each way,
  the disabled state is already written and honest, and the funnel produces no
  data worth losing. Your call; note it here either way.

- [ ] **5. THE ACCEPTANCE TEST — buy your own product in production with a real
  card.** Only once every env var above is set **and** this branch is deployed.
  Walk the whole path and confirm each step:
  1. Pay with a real card at the live checkout.
  2. Fill in the setup form on `/checkout/success`.
  3. Confirm the tenant is **enabled automatically** — no manual SQL.
  4. Confirm the owner notification email arrives.
  5. Open the capture page at `/c/<slug>` and complete a conversation.
  6. Confirm the enquiry email arrives at the nominated address.
  7. Confirm all four are visible in `/admin/leads`.
  8. **Refund yourself.**

  **This is the acceptance test for the entire release.** Nothing else in the
  plan proceeds until it passes: **no further cold email, and no W2 work**,
  until Adrians confirms that it did.

### Not blocking Release 1, but long lead times — start when you can

- [ ] **6. VAT (T-013).** Latvian company, digital service, UK business
  customers, checkout already live. Stripe's `tax_behavior` is **immutable per
  price**, so this shapes prices you cannot later edit. Get the professional
  answer.
- [ ] **7. Trademark search:** LINWICK, classes 9/35/42, UK IPO — before any
  further brand spend.
- [ ] **8. Have the processor agreement reviewed and taken out of draft.**
  Three public pages already describe it as existing.
- [ ] **9. Choose and pay for an EU-hosted cookieless analytics provider**
  (Plausible / Fathom / self-hosted Umami) so W5 can be wired.
- [ ] **10. Choose an external uptime-check provider** for W7.

---

## Decisions record

| # | Decision | Status |
|---|---|---|
| 1 | Checkout open while W1 is fixed? | Open — ADRIANS TO DO #4. Plan recommends closing it for the day. |
| 2 | Embed script or hosted link? | Open. Plan recommends building the embed (W2.3). |
| 3 | Per-tenant questions now, or corrected copy now? | Open. Plan recommends the copy fix now, the build in Release 2. |
| 4 | Where does the boundary section live? | Open. Plan recommends pricing only. |
| 5 | Is the model permanently off? | Open. DeepSeek stays off meanwhile — see `CLAUDE.md`. |
| 6 | What does the middle-funnel CTA ask for? | Open. Plan recommends their website address. |
| 7 | **Cancellation: Stripe portal or email?** | **Decided 5 Sep 2026 — email.** The portal needs dashboard configuration Claude cannot do, and with no login in the product a portal link would only ever be reachable from the one post-checkout page. Implemented on `/checkout/success` and `/terms`. Revisit if a customer area is ever built. |
