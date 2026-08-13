# lib

Framework-agnostic logic. No JSX here.

| Module          | Purpose                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------- |
| `env.ts`        | Typed environment variable access. The only place secrets are read.                          |
| `date.ts`       | ISO date helpers, anchored to `Europe/London`.                                                |
| `analytics.ts`  | Analytics seam. Currently a no-op; a provider gets wired in here.                            |
| `ai/`           | The quote assistant: provider contract, demo engine, conversation state.                     |
| `marketing/`    | Brand constants, landing page copy and the scripted product preview.                         |
| `pricing.ts`    | The offer: amounts in pence, what's included, plain-English terms. No secrets.                |
| `validation.ts` | Shared field validators used by the demo contact card and the onboarding form.                |
| `stripe/`       | Checkout. Server-only — see below.                                                            |
| `prospects/`    | The internal outreach tracker's logic. Built — see below.                                    |
| `assistant/`    | The AI quote assistant — prompts, follow-up question logic, enquiry structuring.             |
| `leads/`        | Lead creation, qualification/scoring rules, and persistence.                                 |
| `integrations/` | Outbound integrations (email confirmations, CRM/webhook delivery). One file per integration. |

`assistant/`, `leads/` and `integrations/` are empty placeholders for now.

## `ai/`

Backs `/demo`. The UI imports **only** `types.ts`, `provider.ts`,
`conversation.ts` and `lead-view.ts` — never a concrete engine.

| File             | Purpose                                                                  |
| ---------------- | ------------------------------------------------------------------------ |
| `types.ts`       | `AssistantProvider` and the lead model. The contract everything shares.   |
| `provider.ts`    | Chooses the implementation. **The one line to change for a real LLM.**    |
| `demo-engine.ts` | Deterministic engine: question order, wording, acknowledgements.          |
| `extract.ts`     | Free text → slots. The part an LLM replaces wholesale.                    |
| `conversation.ts`| Pure reducer for transcript and status. No React, no provider.            |
| `lead-view.ts`   | Lead → rows, reference and JSON payload for the summary card.             |

To move onto a real model: add a provider that POSTs to a route handler which
calls Anthropic server-side (key via `lib/env.ts`), and return it from
`getAssistantProvider()`. `respond` is already async, so no component changes.

Two rules keep the demo from embarrassing itself, and are worth preserving in
any replacement: it never re-asks something already known, and the slot under
discussion is always filled from the customer's reply — so the conversation
cannot stall on unexpected input.

## `stripe/`

Server-only. `config.ts` throws if it is ever imported from a client component,
because that would mean a secret key was about to be bundled.

| File          | Purpose                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| `config.ts`   | Reads env vars; decides whether checkout is live, dev-preview or off.    |
| `client.ts`   | Constructs and caches the Stripe SDK client.                             |
| `checkout.ts` | Creates and retrieves Checkout Sessions. The only file that knows Stripe's shapes. |

The UI never imports these directly — it goes through the `startCheckout`
Server Action in `app/(marketing)/pricing/actions.ts`, and receives only a
`"live" | "dev-preview" | "unavailable"` string.

**Dev-preview mode** exists so the site works without credentials: checkout is
skipped and the browser goes straight to the success page, clearly labelled as
taking no money. It is unreachable in production — there, missing credentials
disable the button and offer an email route instead. Never make the preview
path reachable in production.

## `prospects/`

Backs `/admin/leads`. Split so the rules are testable without React:

| File            | Purpose                                                                     |
| --------------- | --------------------------------------------------------------------------- |
| `constants.ts`  | Status/urgency/label metadata. Exhaustive `Record`s keyed by the unions.     |
| `urgency.ts`    | Derives what a prospect needs today. The rule thresholds live here.          |
| `stats.ts`      | Funnel counts and conversion rates.                                          |
| `filter.ts`     | Search, status filtering and sorting.                                        |
| `storage.ts`    | `localStorage` read/write with validation on the way in.                     |
| `store.ts`      | External store read via `useSyncExternalStore`.                              |
| `seed-data.ts`  | Fictional seed prospects. Replace with the real list.                        |

Rule of thumb: anything that could be unit tested without React belongs here;
anything that renders belongs in `components/`.
