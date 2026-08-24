# STATE — UI/UX + fulfilment check

**Worktree:** `C:\Users\adria\Claude\Projects\C_Asistaint\C_Assistant-uiux`
**Branch:** `stealth-ox/uiux-and-fulfilment-check` (based on `main` @ `d3065cd`)
**Rule of engagement:** everything happens in this worktree only. Main checkout
(`C_Assistant`, currently on `stealth-ox/legal-pack-v1`) is another instance's
workspace — read nothing from it except the untracked `visual-qa.mjs` harness
(copied here, credited below). No merge, no push, no deploy.

---

## Environment (local verification rig)

- `npm ci` done (368 packages).
- Local Postgres: portable binaries at `C:\...\C_Asistaint\.tools\pgsql` (executed
  read-only), **data dir `C:\...\C_Asistaint\.tools-uiux\pgdata`, port 54339,
  db `linwick`** — deliberately NOT the shared default port/data-dir other
  instances might use.
- `.env.local`: admin basic-auth creds, `LEADS_DATABASE_URL` → local PG,
  Stripe unset (→ dev-preview checkout), email off, model off.
- Screenshot harness: `visual-qa.mjs` (untracked in main checkout; copied into
  this branch and extended: tablet viewport added, more routes).

## Orientation notes (verified by reading code, not assumed)

### The commercial loop as it exists on main today

1. **Buy:** `/pricing` → server action `startCheckout`
   (`app/(marketing)/pricing/actions.ts`). With Stripe creds absent locally it
   redirects to `/checkout/success?preview=1`; in prod with creds it creates a
   subscription-mode Checkout session (£149 setup one-off + £79/mo,
   `lib/stripe/checkout.ts`) and redirects to Stripe.
2. **Webhook:** `/api/stripe/webhook` verifies signature, maps to `OrderEvent`,
   `record()` logs it AND persists to the `leads` table (`kind='order_event'`,
   deduped on event id) when `LEADS_DATABASE_URL` is set.
   **It does NOT provision a tenant.** No code path writes
   `stripe_customer_id` / `stripe_subscription_id` into `customers`.
3. **Post-purchase setup:** `/checkout/success` shows an onboarding form
   (`components/checkout/OnboardingForm.tsx`) that POSTs `/api/setup`, which
   creates a **`customers` row with `enabled=false`** plus a `setup_request`
   lead row. By design ("manual onboarding is a feature at this scale") nothing
   public can flip `enabled`.
4. **Manual step today:** activation = human edits the DB row
   (`update customers set enabled=true ...`). `/admin/leads`' DatastorePanel is
   explicitly read-only. There is no admin UI to activate/review a tenant, and
   no link between the Stripe payment and the setup request beyond Adrians
   eyeballing emails.
5. **Capture page:** `/c/[slug]` renders tenant config for `enabled=true` rows;
   unknown/disabled slug → identical 404. Enquiries POST to `/api/leads`
   (rate-limits, honeypot, per-tenant daily cap, dedup) → stored as
   `kind='enquiry'` rows.
6. **Email delivery:** if `EMAIL_SENDING_ENABLED` + Resend creds, new enquiries
   are dispatched inline, retries swept post-response + daily cron, status
   promoted by Resend webhook. Off ⇒ stored-only (visible in /admin/leads).

So the honest answer to "is provisioning automatic?": **semi-automatic** —
payment + form land everything needed in the DB, but going live requires a
manual SQL flip, with no tooling around it. That's the gap Part B has to make
sellable (or document precisely).

### Design system (the "Linwick" system)

- Tokens in `app/globals.css` `@theme`: ink/paper/mist/hairline neutrals,
  brand amber `#f0b429` (all interactive moments), clear green (status only),
  fault red (errors only). Marketing palette fixed light; dark mode opt-in via
  `.theme-auto` (admin only).
- Type: IBM Plex Sans/Mono self-hosted + Barlow Semi Condensed display.
- Primitives: `components/marketing/primitives.tsx` (Container max-w-6xl,
  primaryButton amber w/ ink text, SectionHeading with mono eyebrow).
- Voice: UK English, sceptical-director tone, "paperwork/site-docket" motif
  (docket tear-line, mono eyebrows, hairline rules).
- No separate design-system plan doc found in-repo; these files ARE the system.
- README.md contains stale claims (onboarding form "does not save",
  webhook "only logs") — superseded by phases 2–3; needs a docs fix.

## Progress log

- [x] Isolated worktree created off main d3065cd; goal registered.
- [x] Read: stripe webhook/checkout/config, setup route, leads route, db store/
      schema, tenants config, order-events, admin pages, brand/primitives/globals.
- [x] Local env up (npm ci, isolated Postgres on :54339, .env.local).
- [x] Baseline visual QA: 27 page-viewport combos screenshotted to
      `visual-qa/*-{desk,tab,mob}.png` + metrics in `visual-qa/before.txt`
      (354 floor flags, mostly generous-padding artifacts of the fill metric).
- [x] Deep DOM audit (`scripts/ui-audit.mjs`): no horizontal overflow anywhere,
      contrast clean once inherited-colour false positives excluded; real
      findings below.
- [x] **Model limitation recorded:** this environment has no image-capable
      model (read_image fails on stealth/ox-alpha), so the audit's judgment is
      grounded in DOM measurement + source reading; PNG pairs are produced as
      evidence for human review.
- [x] Part A fixes implemented:
      1. LeadCard hero mock: h3 → p (h1→h3 outline break).
      2. AssistantPreview pause control min-h-8 → min-h-9 (consistency with
         the demo's own secondary controls).
      3. Capture pages no longer swallow failed enquiry POSTs: visible
         sending/sent(+ref)/failed states with a retry button
         (QuoteAssistantDemo capture outcome state).
      4. LeadSummaryCard audience switch: enquirer sees "Your enquiry", not
         seller copy ("Qualified enquiry / Ready to quote" / structured-data
         block stay demo-only).
      5. README de-staled: persistence/webhook claims matched to shipped code;
         new "Activating a tenant" section documenting the one manual step.
- [ ] Rebuild + after screenshots + audit re-run.
- [ ] Part B walk against test tenant.


## Decisions / flags for Adrians (running list)

- Admin area auth: Basic auth via proxy.ts, fails closed. OK for one operator.
- Manual enable step is documented product intent — but zero tooling around it
  (no admin action, no Stripe↔tenant link recorded). Candidate for a minimal
  safe improvement this run; anything touching money flow gets flagged instead.
