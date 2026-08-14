# AI Cleaning Lead Assistant

A web application for demonstrating and selling an AI-powered "quote assistant"
to UK commercial cleaning companies.

**Status.** Built: the public marketing site (`/`), the interactive quote
assistant demo (`/demo`), the Stripe checkout path (`/pricing` →
`/checkout/success`) and the internal prospect tracker (`/admin/leads`).

Not built: any real LLM behind the assistant (the demo runs on a deterministic
local engine, see `lib/ai/`), and any persistence — the onboarding form after
checkout does not save to a server.

## Intended workflow

The application will eventually demonstrate this end-to-end:

1. A customer submits a cleaning enquiry.
2. The AI assistant asks useful follow-up questions.
3. The enquiry is turned into structured data.
4. A qualified lead is created from it.
5. The business owner or their staff view the lead.
6. The customer receives a confirmation / follow-up.

## Stack

| Concern    | Choice                        |
| ---------- | ----------------------------- |
| Framework  | Next.js 16 (App Router)       |
| Language   | TypeScript 5 (strict)         |
| UI         | React 19                      |
| Styling    | Tailwind CSS 4                |
| Linting    | ESLint 9 + `eslint-config-next` |
| Package manager | npm                      |
| Payments   | Stripe Checkout (`stripe` SDK, server-side only) |
| Deployment target | Vercel                  |

`stripe` is the only runtime dependency beyond the framework. Anything else
added should earn its place.

## Layout

```
app/                    routes (App Router)
  (marketing)/          public site — supplies header, footer, <main>
    page.tsx            landing page
    demo/ privacy/ terms/
  admin/leads/          prospect tracker (built, password-protected)
  api/health/           liveness probe
  opengraph-image.tsx   social card, generated at build time
  layout.tsx            root layout, fonts, skip link, SEO metadata
  globals.css           Tailwind entry + design tokens
components/             React components, grouped by product area
  ui/ marketing/ demo/ checkout/ admin/
lib/                    framework-agnostic logic (no JSX)
  env.ts                typed env access — the only place secrets are read
  date.ts               ISO date helpers, anchored to Europe/London
  analytics.ts          analytics seam (currently a no-op)
  marketing/            brand constants, page copy, preview script
  prospects/            outreach tracker logic (built)
  assistant/            AI quote assistant: prompts, follow-ups, structuring
  leads/                lead creation, qualification, persistence
  integrations/         email / CRM / webhook delivery
types/                  shared domain types
  enquiry.ts            raw + structured enquiry
  lead.ts               qualified lead, status, qualification
  prospect.ts           outreach prospect, status, urgency, stats
hooks/                  shared client-side React hooks
public/                 static assets
```

`lib/assistant`, `lib/leads` and `lib/integrations` are empty placeholders for
work not yet started. Each area has a `README.md` describing what belongs there.

Import alias: `@/*` maps to the project root, e.g. `import type { Lead } from "@/types"`.

## Public site (`/`)

Routes: `/` (landing), `/demo`, `/pricing`, `/privacy`, `/terms`,
`/checkout/*` — all inside the `app/(marketing)` route group, which supplies the
header, footer and `<main>`.

**Identity** lives entirely in `lib/marketing/brand.ts`: the name shown in the
wordmark and titles, the tagline, and the contact address every fallback route
uses. Changing it there updates the metadata, the OG card, the favicon-adjacent
branding and every `mailto:` on the site.

**Still needing a factual decision before live trading** — each is marked with a
`REVIEW BEFORE LAUNCH` comment in the file concerned:

1. VAT treatment of these sales (`lib/pricing.ts`, marked `REVIEW BEFORE LIVE
   CHARGING`). The copy is deliberately neutral until this is confirmed.
2. The GDPR Chapter V transfer basis for DeepSeek (`/privacy` section 5). The
   live model is switched off by default until this exists — see `CLAUDE.md`.

Settled: the registered name, address and number are in `lib/marketing/brand.ts`
and render on `/privacy` and `/terms`; the refund position is a full refund of
the setup fee within 30 days where the assistant is not live on the customer's
site.

**Theming.** The marketing palette (`--color-ink`, `--color-brand`, …) is fixed,
not theme-aware — the public site should look the same to everyone. Dark mode is
opt-in through the `.theme-auto` class, which only the admin layout applies. Do
not move those dark tokens back onto `:root`: a dark document background shows
through on overscroll behind the marketing pages.

**Client JavaScript.** Only `AssistantPreview` is a Client Component. The header
menu is a native `<details>`, and there is no scroll-reveal animation, so the
page renders complete before hydration.

**Copy** lives in `lib/marketing/content.ts` and `lib/marketing/preview-script.ts`,
deliberately separated from the JSX so it can be edited as prose. Names, domains
and phone numbers in the example conversation are fictional; the phone numbers
come from Ofcom's drama-and-fiction ranges so they can never be dialled.

## Demo (`/demo`)

An interactive quote assistant a prospect can actually talk to. It collects
property type, location, size, frequency, preferred time, current arrangement
and requirements, then contact details, and produces a CRM-style qualified
lead with the JSON an integration would receive.

### How the model fits in

> **The live model is off by default and must stay off in production.**
> `ASSISTANT_MODEL_ENABLED` gates it, and anything other than an explicit
> `true`/`1`/`yes` — including unset — means off. DeepSeek processes
> conversation content in China and there is no GDPR Chapter V transfer basis in
> place yet. See the note in `CLAUDE.md` before changing this.

With `ASSISTANT_MODEL_ENABLED=true` **and** both `DEEPSEEK_API_KEY` and
`DEEPSEEK_MODEL` set, the demo routes through `/api/assistant`, which calls
DeepSeek. With the flag off — the default — it runs entirely on the
deterministic engine in `lib/ai/demo-engine.ts`. Both work.

The flag is checked at the top of `readDeepSeekConfig()`, before the credentials
are read. That function is the only thing that produces a `DeepSeekConfig`, and
`complete()` needs one to know where to `fetch`, so credentials left in the
environment cannot on their own cause a single request to leave for
`api.deepseek.com`.

**The model does not drive the conversation.** It may *propose* what the
customer just said and suggest wording; every proposed value is normalised
through the same parser the offline engine uses, and the offline engine decides
what to ask next and when the enquiry is complete. Three reasons that split
matters:

- The flow always terminates.
- Text injected through the chat box cannot skip to "complete" or fabricate a lead.
- When the model is slow, broken, over budget or switched off, the endpoint still
  returns a sensible reply. Verified by pointing `DEEPSEEK_BASE_URL` at an
  unreachable host: the visitor sees a normal reply, the failure is logged
  server-side only.

Do not "simplify" this by letting the model return the whole `AssistantReply`.

**Rate limiting** lives in `lib/rate-limit.ts`: 10/min and 60/hr per IP, plus a
global daily ceiling. The per-IP counters are in-memory and therefore per
serverless instance — they raise the cost of abuse rather than capping it. The
global ceiling is the actual protection for the API bill. Read the comment at
the top of that file before relying on it.

Suggested-answer chips are load-bearing: they let a prospect finish the whole
flow in about six taps on a phone. Removing them costs completions.

The closing CTA is a `mailto`, because payments and onboarding do not exist. A
button that went nowhere would undo the credibility the demo just earned.

## Checkout (`/pricing`, `/checkout/*`)

£149 one-off setup + £79/month, sold as a single Stripe Checkout session in
`subscription` mode — Stripe puts a one-time price on the first invoice, which
is exactly this arrangement. Amounts and copy live in `lib/pricing.ts`.

**To switch it on**, create two Stripe products — "AI Quote Assistant — Setup"
(£149 one-off) and "AI Quote Assistant — Monthly" (£79/month) — and set
`STRIPE_SECRET_KEY`, `STRIPE_PRICE_SETUP` and `STRIPE_PRICE_MONTHLY`. Use
`sk_test_…` until you mean it. Without all three, checkout falls back to
dev-preview locally and is disabled in production.

### Webhook (`/api/stripe/webhook`)

Verifies the signature, translates the event into an `OrderEvent`
(`lib/stripe/webhook.ts`) and hands it to `record` in
`lib/integrations/order-events.ts`. Subscribe the destination to six events:
`checkout.session.completed`, `checkout.session.expired`, `invoice.paid`,
`invoice.payment_failed`, `customer.subscription.updated` and
`customer.subscription.deleted`.

Payloads are serialised at the account's API version, not the SDK's, and fields
move between versions — `invoice.subscription` became
`invoice.parent.subscription_details.subscription` in basil, which is what the
code above reads. Aim to match the SDK's pinned **2026-07-29.dahlia**:

- Locally, `stripe listen --latest` renders events at the newest version.
- The account default is only changeable in **live** mode, so in test mode set
  `api_version` on the destination itself (`POST /v1/webhook_endpoints`) rather
  than trying to move the account.

**`record` currently only logs.** Orders are still not persisted anywhere, so
the log line is the record. It is the single seam: when orders need a database,
or a failed payment needs to reach a human inbox, that function changes and
nothing upstream of it does. A real implementation must also de-duplicate on
`eventId` (Stripe retries, and can deliver twice anyway) and must not assume
events arrive in the order they occurred.

**The onboarding form does not save anywhere.** It validates, then hands the
customer their answers with a prefilled email and a copy button, and says so
plainly. Replacing that with a real submission is a contained change to
`handleSubmit` in `components/checkout/OnboardingForm.tsx`.

Two things to decide before taking real money:

- **VAT.** `PLAN_TERMS` in `lib/pricing.ts` says only "Prices shown are subject
  to any applicable taxes." That is deliberately neutral: the treatment of these
  sales has not been confirmed and depends on where the business is established,
  its registration status and the customer's status. Do not replace it with a
  definite statement in either direction until that is settled — it is a factual
  tax claim a customer relies on at the point of sale.
- **Refunds.** `/terms` states there is no fixed policy yet and invites contact.
  Honest, but it is not a policy, and it should become one.

## Internal: prospect tracker (`/admin/leads`)

An outreach tracker for the companies we are selling *to*. It is internal
tooling, deliberately not linked from the public site, and the `/admin` layout
sets `robots: noindex`.

Deliberate constraints, per the brief: no authentication and no database. Data
starts from a fictional seed list in `lib/prospects/seed-data.ts`; edits are
persisted to `localStorage` on the machine doing the outreach. That is enough
for one operator running an experiment, and it means the page has no server
state to secure. **Anyone who reaches the URL can read and edit it** — add auth
before this goes anywhere shared, and move to a real store before a second
person needs the same list.

The organising idea is "who needs action today". `lib/prospects/urgency.ts`
derives an urgency level per prospect from its next action, status and how long
it has gone untouched; the table sorts by that by default and the row dot
colour-codes it. A prospect with no recorded plan cannot sit quietly — it
surfaces as "Set next action".

Keyboard: `/` focuses search, `J`/`K` (or arrows) move the row cursor, `Enter`
opens the detail panel, `Esc` closes it or leaves the field you are typing in.

Data model lives in `types/prospect.ts`; the status set and its labels,
funnel mapping and colours are one exhaustive `Record` in
`lib/prospects/constants.ts`, so adding a status is a compile error until every
site is updated.

## Architecture notes

- **Server Components by default.** `"use client"` only where interactivity needs it.
- **Data flow.** `RawEnquiry` → assistant conversation → `StructuredEnquiry` → `Lead`.
  These types live in `types/` and are the contract between the demo UI, the
  server logic and the lead inbox.
- **Server-side mutations.** Enquiry submission and lead creation will use Server
  Actions; `app/api/` is reserved for things that must be real HTTP endpoints
  (webhooks, health checks).
- **Persistence.** Not chosen yet. `lib/leads/` is where it will be isolated so
  the rest of the app depends on functions, not on a specific database.
- **AI provider.** Anthropic, called server-side only. The API key is never
  exposed to the browser.
- **Accessibility.** Semantic landmarks, a skip link, `lang="en-GB"`, visible
  focus, and reduced-motion support are in from the start.
- **Responsive.** Mobile-first Tailwind utilities; no fixed pixel layouts.

## Getting started

Requires Node.js 20.9+ and npm.

```bash
npm install
```

```bash
cp .env.example .env.local
```

## Commands

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Development server on http://localhost:3000    |
| `npm run typecheck` | `tsc --noEmit`                                 |
| `npm run lint`      | ESLint                                         |
| `npm run lint:fix`  | ESLint with autofix                            |
| `npm run check`     | Typecheck then lint                            |
| `npm run build`     | Production build                               |
| `npm start`         | Serve the production build                     |

## Admin access (`/admin/*`)

The prospect tracker is protected by HTTP Basic authentication, implemented in
[`proxy.ts`](proxy.ts) at the project root. Next 16 deprecated the
`middleware.ts` filename in favour of `proxy.ts`; the build warns if the old
name is used.

Set two variables, locally in `.env.local` and on Vercel under **Project
Settings → Environment Variables**:

```
ADMIN_USERNAME=someone
ADMIN_PASSWORD=<long random string>
```

Behaviour:

| Situation | Result |
| --- | --- |
| Both set, correct credentials | Access granted |
| Both set, wrong or missing credentials | `401` with a browser password prompt |
| Either variable missing | `503`, area stays locked |

**It fails closed.** A deploy that forgets the variables loses access to the
tool; it does not expose the prospect list. Do not "fix" that by adding a
fallback default.

Basic auth transmits credentials base64-encoded, not encrypted, so this is only
safe because Vercel terminates TLS. Do not serve the admin area over plain
HTTP. This is deliberately the smallest thing that works for a single
operator — it is not a user system, and it does not scale to a team.

## Deployment

Deploys to Vercel with no extra configuration. Before the first deploy, set:

| Variable | Why |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | **Required.** The real public URL, no trailing slash. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Otherwise `/admin` returns 503. |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_SETUP`, `STRIPE_PRICE_MONTHLY` | Otherwise checkout is disabled in production. |
| `ASSISTANT_MODEL_ENABLED` | Leave unset. Off by default; must stay off until a GDPR Chapter V transfer basis exists. |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` | Optional, and inert while the flag above is off. Without them the assistant runs offline. |

`NEXT_PUBLIC_SITE_URL` matters more than it looks. Without it the app falls
back to Vercel's deployment URL, and in local development to
`http://localhost:3000`. It will **never** emit a localhost URL in production —
it omits the canonical tag and refuses to create a Stripe session rather than
sending a paying customer somewhere that does not resolve. That is the correct
behaviour, but it means a missing variable degrades checkout rather than
silently half-working.

## Environment variables

Local values go in `.env.local`, which is git-ignored. `.env.example` is the
committed template and lists every variable the project expects — keep it in
sync, with empty or placeholder values only.

Never commit real keys. On Vercel, set the same variables under
**Project Settings → Environment Variables**.

Read variables through `lib/env.ts` rather than touching `process.env`
directly. Only `NEXT_PUBLIC_*` values may reach client components.

## Deployment

Deploys to Vercel with no extra configuration: import the repository, set the
environment variables, and Vercel detects Next.js automatically. The build must
pass `npm run check` and `npm run build` locally first — type and lint errors
are not ignored during builds (see `next.config.ts`).
