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
  leads/                internal lead inbox placeholder
  admin/leads/          prospect tracker (built)
  api/health/           liveness probe
  opengraph-image.tsx   social card, generated at build time
  layout.tsx            root layout, fonts, skip link, SEO metadata
  globals.css           Tailwind entry + design tokens
components/             React components, grouped by product area
  ui/ marketing/ demo/ leads/ admin/
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

`components/demo`, `components/leads`, `lib/assistant`, `lib/leads` and
`lib/integrations` are empty placeholders. Each area has a `README.md`
describing what belongs there.

Import alias: `@/*` maps to the project root, e.g. `import type { Lead } from "@/types"`.

## Public site (`/`)

Routes: `/` (landing), `/demo`, `/privacy`, `/terms` — all inside the
`app/(marketing)` route group, which supplies the header, footer and `<main>`.

**Before launch**, three things must change:

1. `BRAND.name` in `lib/marketing/brand.ts` is a placeholder ("Quoteline") and
   `BRAND.contactEmail` points at a domain that does not exist. Both are used by
   the metadata, the OG card and every contact link.
2. `NEXT_PUBLIC_SITE_URL` must be set, or `og:url` and the canonical link will
   point at `localhost:3000`.
3. `/privacy` and `/terms` are placeholders and are `noindex` until written.

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

**It is not an LLM.** `lib/ai/demo-engine.ts` is a deterministic engine behind
the `AssistantProvider` interface. It reads as intelligent because it extracts
several answers from one sentence and never asks what it already knows — but
say "deterministic engine", not "AI", when describing it to anyone who will
check. Swapping in a real model is a one-line change in `lib/ai/provider.ts`.

Suggested-answer chips are load-bearing: they let a prospect finish the whole
flow in about six taps on a phone. Removing them costs completions.

The closing CTA is a `mailto`, because payments and onboarding do not exist. A
button that went nowhere would undo the credibility the demo just earned.

## Checkout (`/pricing`, `/checkout/*`)

£149 one-off setup + £79/month, sold as a single Stripe Checkout session in
`subscription` mode — Stripe puts a one-time price on the first invoice, which
is exactly this arrangement. Amounts and copy live in `lib/pricing.ts`.

**To switch it on**, create one Stripe product with two prices (£149 one-off,
£79 recurring monthly) and set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_SETUP` and
`STRIPE_PRICE_MONTHLY`. Use `sk_test_…` until you mean it. Without all three,
checkout falls back to dev-preview locally and is disabled in production.

**No webhook handler exists**, because nothing is persisted. The success page
verifies payment by retrieving the session server-side, which is adequate while
there are no orders to record. Add a webhook — and `STRIPE_WEBHOOK_SECRET` —
before you rely on knowing about renewals, failed payments or cancellations.

**The onboarding form does not save anywhere.** It validates, then hands the
customer their answers with a prefilled email and a copy button, and says so
plainly. Replacing that with a real submission is a contained change to
`handleSubmit` in `components/checkout/OnboardingForm.tsx`.

Two things to decide before taking real money:

- `PLAN_TERMS` states prices exclude VAT. Confirm that matches your VAT
  position and pricing intent.
- `/terms` is still a placeholder. It is linked from the footer and is where a
  customer would expect refund and cancellation detail to live.

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
