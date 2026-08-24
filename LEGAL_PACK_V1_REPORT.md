# Legal pack v1 — completion report

> **Provenance note.** The `stealth-ox/legal-pack-v1` branch's own summary
> referenced a `LEGAL_PACK_V1_REPORT.md` that was never actually written to
> disk. This document recreates it after the fact from the branch's commit
> message ("Legal pack v1: ICO-grounded processor agreement, vendor labels
> filled, privacy/security/terms aligned") and from the branch's full diff,
> which is the authoritative record of which gaps it closed. Nothing here
> describes work beyond what commit `5ed9750` contains.

## Scope

One commit, five files, +335/−100:

| File | Change |
|---|---|
| `legal/processor-agreement-DRAFT.md` | Template v0.1 → v0.2, rebuilt around the ICO's Article 28(3) checklist |
| `app/(marketing)/privacy/page.tsx` | Transfers section rewritten to match reality; safeguards made concrete |
| `app/(marketing)/security/page.tsx` | Every technical claim tied to a code artefact; new abuse-controls section |
| `app/(marketing)/terms/page.tsx` | Minor alignment with the above |
| `lib/marketing/legal.ts` | Vendor labels filled: Neon (database), Resend (email) |

## Gaps closed

### 1. Processor agreement was a thin sketch; now ICO-grounded

The v0.1 template listed eight bare clauses. v0.2 is written against the
ICO's published "What needs to be included in the contract?" checklist
(Article 28(3) UK GDPR / EU GDPR), clause by clause, each citing its source:

- **Details of the processing** (subject matter, duration, nature/purpose,
  data types, data subjects, controller obligations) now stated explicitly,
  as the ICO requires, with a drafting note about enquirers volunteering
  sensitive content.
- **Documented instructions** (Art. 28(3)(a)) including the duty to inform
  Controller if an instruction infringes data protection law.
- **Confidentiality** (28(3)(b)), **security** (28(3)(c)) — with the actual
  measures in force enumerated from the codebase (TLS, secrets in deployment
  config, fail-closed admin access, event-id de-duplication, no third-party
  scripts on capture pages, scheduled deletion).
- **Sub-processors** (28(3)(d)/(4)): general written authorisation via
  schedule 3, 14 days' advance notice, right to object, flow-down of
  equivalent obligations, Processor remains liable.
- **Data subject rights assistance** (28(3)(e)) answered from the single
  queryable store; **general assistance** (28(3)(f)) covering security,
  breach notification, DPIAs and prior consultation.
- **Breach notification**: without undue delay and within a self-imposed
  **24 hours** — explicitly flagged as tighter than the law requires (the ICO
  sets no fixed processor-to-controller timescale), chosen so the controller
  has realistic room inside its own 72-hour reporting deadline, and marked to
  change in all four places (agreement, privacy notice, terms, /security) or
  not at all.
- **End of contract** deletion including backup handling on the vendor's next
  deletion cycle (per ICO guidance); **audits** scoped realistically (remote,
  ≤1/year absent incident); **Article 30(2) records**.
- Company number filled in (Stepe Digital SIA, 40203711274); retention
  figures now cross-referenced to the enforcing constants in
  `lib/marketing/legal.ts` (30 days after delivery, 90-day hard ceiling).

### 2. Sub-processor schedule added, with transfer mechanisms per vendor

New schedule 3 tabulates Vercel, Neon and Resend — service, where data is
processed, transfer mechanism, published source URL — plus a note that
Stripe acts as an independent controller for payment data, not a
sub-processor for enquiry data. Transfer mechanisms are named concretely
(EU SCCs 2021/914, UK Addendum / UK IDTA, EU–US Data Privacy Framework with
UK extension where held).

**Deliberately left open inside this pack:** Neon's DPA substance is not
publicly verifiable (verified August 2026), so schedule 3 carries an explicit
**ACTION**: obtain and file the executed Neon DPA before any live enquiry
traffic. This is the one blocking item the pack itself flags.

### 3. Vendor labels filled

`DATABASE_VENDOR_LABEL = "Neon"` (ADR-1 pick, EU-region project) and
`EMAIL_DELIVERY_VENDOR_LABEL = "Resend"` (ADR-2) replace the empty
review-before-launch placeholders. Pages rendering these labels keep their
runtime check against live configuration, so they still refuse to name a
vendor that isn't actually switched on.

### 4. Privacy page aligned with verified facts

- Transfers section no longer claims blanket EEA-only processing: it states
  plainly that Vercel's primary processing is in the US with a worldwide
  edge, that Resend stores email content and metadata in the US regardless of
  sending region, and that DeepSeek (where the optional model is enabled) is
  in China.
- EU-region wording corrected to "enquiry data is stored and primarily
  processed inside the EEA", with onward delivery to a non-EEA mailbox
  correctly attributed to the customer as controller.
- Safeguards paragraph names the actual mechanisms (SCCs + UK Addendum /
  IDTA + DPF certification where held) and offers the DPA on request.
- The 24-hour breach-commitment is disclosed to prospective buyers so they
  can plan their own 72-hour duty.

### 5. Security page claims now point at code

Every technical statement maps to something that exists: shared rate-limit
counters (`lib/rate-limit/shared.ts` over `rate_windows`), intake guards in
`app/api/leads/route.ts` (honeypot, minimum completion time, 16 KB cap),
event-id de-duplication (`lib/db/schema.ts`), the retention sweep
(`lib/retention.ts` behind `/api/retention`, cron-configured in
`vercel.json`), and fail-closed authentication on every privileged route. A
new "Abuse and bot control" section describes the layered controls without
overclaiming. The header instruction now reads: if a measure is removed from
the code it must come off the page at the same time.

## Still open (unchanged by this pack)

- Neon executed DPA (see ACTION above) — required before go-live.
- Liability clause (15) deliberately open for negotiation with a lawyer once
  there is a paying client.
- Registered-address bracket and governing-law confirmation remain reviewer
  tasks at signature time (Latvia chosen; UK pushback anticipated).
- Confirm in the Neon dashboard that the project really was created in an EU
  region (Frankfurt/London) before live traffic.

## Verification at merge time

Merged into local main (merge commit `c739f6b`) with zero conflicts.
`npm run check` (typecheck + lint) clean immediately after the merge; the
full verification battery (journey-check plus phase 1/2/2-browser/3 suites)
passes on the merged tree — see the run log for the session record.
