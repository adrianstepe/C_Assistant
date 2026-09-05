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
- [x] 6. **README deployment table corrected.** Found while writing the manual
      steps below: it listed `NEXT_PUBLIC_SITE_URL` as **Required**, which has
      been false since production started taking its origin from
      `CANONICAL_ORIGIN` (`.env.example` already said so; the README had not
      caught up). Setting it in production does nothing. The table now lists
      what a production deploy actually needs — including `LEADS_DATABASE_URL`,
      the three Resend variables, `OWNER_NOTIFICATION_EMAIL` and
      `CRON_SECRET`, none of which were mentioned — and the paragraph explains
      what the variable is still for (naming a preview's own host).

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

Everything in "Release 1 blockers" is one sitting — roughly 60–90 minutes, most
of it waiting for DNS. Do them in the order given: each one makes the next one
verifiable.

### Before you start — three facts to have to hand

| Thing | Value | Where it comes from |
|---|---|---|
| Vercel env var screen | Project → **Settings → Environment Variables** | scope every variable below to **Production** |
| Sending address | `enquiries@linwick.co.uk` | hardcoded, `lib/email/resend.ts:100` |
| Your address | `adrians@stepedigital.com` | `CONTACT_EMAIL`, `lib/marketing/brand.ts:51` |

Note the two are on **different domains**. Resend must verify
**`linwick.co.uk`** (the sending domain), while escalations and owner alerts go
to the `stepedigital.com` address. That is intentional and nothing needs
changing — but it does mean `enquiries@linwick.co.uk` should be able to
**receive** mail, because that is where bounces land. If no mailbox exists
there, add a forward to `adrians@stepedigital.com` while you are in the DNS.

Already set in production, from the plan's probes — do not re-do these:
`CRON_SECRET` (proved by `/api/retention` answering 401), and the three Stripe
variables (checkout works today). `EMAIL_DISPATCH_SECRET` is **not** needed:
the route falls back to `CRON_SECRET`, which Vercel's scheduler supplies
automatically.

---

### Release 1 blockers — in this order

- [ ] **1. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` on Vercel.**

  Vercel → Settings → Environment Variables → Add, scope **Production**:

  ```
  ADMIN_USERNAME=adrians
  ADMIN_PASSWORD=<30+ random characters from a password manager>
  ```

  The cheapest item on the list, and it restores all visibility — do it first
  so you can watch every later step land. `/admin/leads` returns `503` today
  because it fails closed without both. It is HTTP Basic auth over Vercel's
  TLS, not an identity system, so the password does the whole job: make it long
  and random, and store it in your password manager.

  **Check it worked** (after the redeploy in step 4b): open
  `https://www.linwick.co.uk/admin/leads`. The browser prompts for a username
  and password. Expect a red banner at the top saying *"No one is being told
  when a customer buys"* — that is correct at this stage and clears in step 3.

- [ ] **2. Provision an EU-region Postgres instance and set
  `LEADS_DATABASE_URL`.**

  ADR-1 requires an **EU region** — not US. The vendor is deliberately open:
  Neon, Supabase, Vercel Postgres and Turso all speak the Postgres wire
  protocol and all work. Neon's free tier is enough for now and the fastest to
  stand up.

  1. Create the project, choosing an **EU region** (Frankfurt or Ireland).
  2. Copy the **connection string** it gives you, in full — including any
     `?sslmode=require` the vendor appends. It looks like
     `postgres://user:pass@host.eu-central-1.aws.neon.tech/dbname?sslmode=require`.
  3. On Vercel, add it as `LEADS_DATABASE_URL`, scope **Production**.

  There is no migration step and no SQL to run: `ensureSchema()` creates every
  table on first use.

  **Check it worked:** `/admin/leads` stops saying "No datastore configured"
  and shows empty Customers and Leads tables instead.


- [ ] **3. Resend — and the DNS work, which is all on Namecheap.**

  **What the DNS actually looks like today** (verified by lookup, 5 Sep 2026 —
  re-check before trusting it):

  | Record | Current value | Means |
  |---|---|---|
  | NS | `dns1.registrar-servers.com`, `dns2` | **Namecheap BasicDNS.** All records go in Namecheap's **Advanced DNS** tab, and Namecheap's free Email Forwarding works. |
  | MX | `eforward1-3` (10), `eforward4` (15), `eforward5` (20) `.registrar-servers.com` | Namecheap's **email-forwarding MX is already in place.** Nothing to add for forwarding — only the rule. |
  | TXT `@` | `v=spf1 include:spf.efwd.registrar-servers.com ~all` | **An SPF record already exists at the root.** This is the trap from §3d below, live. |
  | TXT `_dmarc` | *none* | To add. |
  | TXT `resend._domainkey` | *none* | Resend not set up yet. |
  | CNAME `www` | `…vercel-dns-017.com` | Vercel serving, as expected. |

  **The one Namecheap rule that breaks everything if you miss it:** the **Host**
  field takes the name *without* the domain. `send.linwick.co.uk` is entered as
  Host `send`. Paste the full name and Namecheap silently creates
  `send.linwick.co.uk.linwick.co.uk`, which resolves to nothing and gives you
  an hour of wondering why Resend will not verify. Root records use `@`. TTL:
  Automatic.

  ---

  **3a. The email forward — do this first, it is two minutes and conflicts with
  nothing.**

  Namecheap → **Domain List** → **Manage** on `linwick.co.uk` → **Domain** tab →
  scroll to **REDIRECT EMAIL** → **ADD FORWARDER**:

  ```
  Alias:       enquiries
  Forwards to: adrians@stepedigital.com
  ```

  Save. The MX records it needs are already there. Send yourself a test from any
  address to `enquiries@linwick.co.uk` and confirm it lands in the
  stepedigital.com inbox.

  Not a prerequisite for sending and not part of the acceptance test — see the
  reasoning in the commit that added this. Do it anyway: every customer sees
  that address in the From header of every enquiry, and today mail to it
  bounces.

  **3b. Add the domain in Resend — and add the ROOT domain, not a subdomain.**

  Resend's "add domain" screen nudges you towards `send.yourdomain.com`. **Do
  not take it here.** Register **`linwick.co.uk`** itself.

  Resend authorises the exact domain you verify. Verifying
  `send.linwick.co.uk` does **not** authorise `enquiries@linwick.co.uk` — and
  that address is hardcoded as `SENDER_ADDRESS` in `lib/email/resend.ts`,
  because ADR-2 settled it and `/privacy` says enquiries are "sent from
  linwick.co.uk". Send from an unverified domain and Resend returns a 4xx,
  which `sendLeadEmail()` classifies as **permanent** — so the enquiry skips
  the retry ladder entirely, goes straight to `undeliverable`, and escalates.
  You would find out, but only after losing a real customer's enquiry.

  The reputation argument for a sending subdomain is real at bulk volumes and
  irrelevant here: this is low-volume transactional mail, and the From header
  is read by every customer every week. `enquiries@linwick.co.uk` reads as a
  business. `enquiries@send.linwick.co.uk` reads as a mailing list.

  Let Resend show you its records. **Read what it actually gives you** — the
  shape below is the current one, not a promise:

  - CNAME, host `send` → `send.forge.rmta.net`
  - CNAME, host `rsend` → `rsend.forge.rmta.net`
  - TXT, host `resend._domainkey` → the DKIM key; this is the one that makes
    verification pass

  Enter each in **Advanced DNS → HOST RECORDS → ADD NEW RECORD**, remembering
  the Host rule above: `send`, not `send.linwick.co.uk`, and **not**
  `send.send`. Wait for Resend to show **Verified** — usually minutes.

  **3c. DMARC.** Advanced DNS → ADD NEW RECORD:

  ```
  Type:  TXT Record
  Host:  _dmarc
  Value: v=DMARC1; p=none; rua=mailto:adrians@stepedigital.com
  TTL:   Automatic
  ```

  `p=none` reports without rejecting, which is what a new sending domain wants.
  Tighten to `p=quarantine` once the W6.4 seed test comes back clean.

  **3d. The two conflicts I warned about do not arise. Verified 5 Sep 2026.**

  Resend's current setup is **CNAME-based** (`forge.rmta.net`), which delegates
  SPF and the return-path through those two CNAMEs instead of asking for
  records at the root. That means:

  - **No SPF conflict.** Resend asks for no root SPF, so the existing
    `v=spf1 include:spf.efwd.registrar-servers.com ~all` stays exactly as it
    is. Namecheap shows it with a padlock because Mail Settings owns it —
    leave it locked, do not try to edit it, and do not add a second SPF record
    at `@`. Two SPF records at one name is a permanent error and SPF fails
    outright, which is worse than having none.
  - **No MX conflict.** Resend asks for no MX, so **Mail Settings stays on
    "Email Forwarding"** and the five `eforward` records stay untouched. You do
    not need Custom MX, and switching to it would break the forward in §3a for
    nothing.

  If a future Resend setup does ask for a root SPF, merge rather than add:
  `v=spf1 include:spf.efwd.registrar-servers.com include:amazonses.com ~all`.

  **3d-fix. If you already added the records under `send.` — clean them up.**

  On 5 Sep 2026 the domain carried a consistent but wrong-target set, from
  registering `send.linwick.co.uk` in Resend rather than the root:

  | Type | Host | Resolves as |
  |---|---|---|
  | CNAME | `send.send` | `send.send.linwick.co.uk` → `send.forge.rmta.net` |
  | CNAME | `rsend.send` | `rsend.send.linwick.co.uk` → `rsend.forge.rmta.net` |
  | TXT | `resend._domainkey.send` | DKIM under the subdomain |

  Nothing was mistyped — those are right for the domain that was registered.
  They are simply authorising a domain the app never sends from. To fix:
  delete the `send.linwick.co.uk` domain in Resend, add `linwick.co.uk`, enter
  the new records at root-level hosts per §3b, then delete these three from
  Namecheap. The `A @ 216.198.79.1` and `CNAME www` records are Vercel's —
  leave both alone.

  **3e. The Vercel variables.** Once Resend shows Verified, create a **sending
  API key** and set, scoped **Production**:

  ```
  RESEND_API_KEY=re_...
  EMAIL_SENDING_ENABLED=true
  OWNER_NOTIFICATION_EMAIL=adrians@stepedigital.com
  ```

  The key alone does nothing. `EMAIL_SENDING_ENABLED` is a deliberate second
  gate so a stray credential can never start sending on its own, and must be
  the literal string `true`. Without `OWNER_NOTIFICATION_EMAIL` a customer can
  buy, go live, and nothing tells you — `/admin/leads` shows a red banner naming
  the missing variable until it is set, and that banner disappearing is your
  confirmation.

  **3f. The Resend webhook.** In Resend, add an endpoint at
  `https://www.linwick.co.uk/api/webhooks/resend`, subscribed to **all five** of
  `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`,
  `email.complained`. Copy the endpoint's signing secret:

  ```
  RESEND_WEBHOOK_SECRET=whsec_...
  ```

  Without it that route answers `503` and accepts nothing. Enquiries would still
  send, but would stay stuck at `pending` instead of confirming to `sent` — and
  bounces would never be detected at all, which is the whole reason the mailbox
  in §3a is optional.


- [ ] **4. Decide: leave checkout live during this work, or close it.**

  The plan's recommendation is **close it for the day**. The reasoning: it is
  one env var each way, the disabled state on `/pricing` is already written and
  honest, and the funnel currently produces no data worth losing — whereas a
  stranger buying mid-configuration gets a broken delivery.

  **To close it:** delete (or blank) `STRIPE_PRICE_SETUP` on Vercel and
  redeploy. `/pricing` renders its disabled state; nobody can start a checkout.
  **To reopen:** put the price id back and redeploy.

  Note your choice here either way.

- [ ] **4b. Get this branch deployed.**

  `main` is committed locally but **not pushed** — Claude was not asked to push,
  and pushing `main` is what triggers the Vercel production deploy.

  ```
  git push origin main
  ```

  (Or ask Claude to run it.) Then watch the deployment in Vercel until it
  reports **Ready**.

  **The ordering trap:** environment variables only take effect on a deployment
  made *after* they are set. If you set any variable after this push, use
  Vercel's **Redeploy** on the latest deployment before step 5. Simplest safe
  order: do steps 1–4 first, push last.

  Six commits are waiting: the provisioning merge, the three claim repairs, and
  this tracker.

- [ ] **5. THE ACCEPTANCE TEST — buy your own product in production with a real
  card.** Only once every variable above is set **and** the deployment that
  followed them is Ready.

  Walk the whole path and confirm each step. Have `/admin/leads` open in a
  second tab throughout.

  1. Go to `/pricing` and pay with a **real card**. £149 + £79 will actually
     leave your account; you refund it at step 8.
  2. You land on `/checkout/success`. Fill in the setup form there.
  3. **Confirm the tenant is enabled automatically.** In `/admin/leads`, the new
     row under Customers shows **enabled: yes** with no action from you. This is
     the single most important assertion in the test — it is the thing that was
     a manual SQL flip before this release.
  4. **Confirm the owner notification email arrives** at
     `adrians@stepedigital.com`, subject *"Linwick: &lt;company&gt; went live
     automatically"*. Within seconds, not on the daily cron.
  5. Open the capture page at `/c/<slug>` — the slug is in the Customers table —
     and complete a full conversation as if you were an enquirer.
  6. **Confirm the enquiry email arrives** at whichever address you nominated on
     the setup form. Also within seconds: capture dispatches on the fast path,
     and the daily cron is only a backstop for retries.
  7. **Confirm all four are visible in `/admin/leads`:** the order event, the
     setup submission, the enabled tenant, and the enquiry — the enquiry's
     status reading `sent` (not `pending`, which would mean the Resend webhook
     from step 3.6 is not wired).
  8. **Refund yourself** in the Stripe dashboard, and cancel the subscription.

  **This is the acceptance test for the entire release.** Nothing else in the
  plan proceeds until it passes: **no further cold email, and no W2 work**,
  until Adrians confirms that it did.

  If a step fails, the failure is almost always the variable from the step of
  the same number: no tenant enabled → check the Stripe webhook endpoint and
  `LEADS_DATABASE_URL`; no owner email → `OWNER_NOTIFICATION_EMAIL` or
  `EMAIL_SENDING_ENABLED`; enquiry stuck at `pending` →
  `RESEND_WEBHOOK_SECRET`; `/admin/leads` 503 → the two admin variables.

### Not blocking Release 1, but long lead times — start when you can

- [ ] **6. VAT (T-013).** Latvian company, digital service, UK business
  customers, checkout already live. Stripe's `tax_behavior` is **immutable per
  price**, so this shapes prices you cannot later edit — changing it means
  creating new prices and repointing the two env vars. Get the professional
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
