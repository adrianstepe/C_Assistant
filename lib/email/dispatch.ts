import { optionalServerEnv } from "@/lib/env";
import { BRAND } from "@/lib/marketing/brand";
import type postgres from "postgres";
import {
  claimLeadForSending,
  getDeliverableLead,
  getLeadByProviderMessageId,
  listDueLeads,
  recordSendAccepted,
  recordSendFailure,
  type DeliverableLead,
} from "@/lib/db/store";
import { sendLeadEmail, type EmailDeliveryConfig } from "./resend";

/**
 * Getting a stored enquiry into the tenant's inbox, and being honest when
 * that does not happen.
 *
 * The lifecycle the privacy notice and the admin panel both describe:
 *
 *   captured -> pending -> sent            (webhook confirms delivery)
 *                 |-> undeliverable        (permanent failure, or retries
 *                                           exhausted) + escalation email
 *
 * Retries run at most MAX_RETRIES times and only for transient failures,
 * spread over roughly an hour by default (see `retryDelaysMs`). Every state
 * change is guarded in SQL (see `lib/db/store.ts`), so a webhook arriving
 * mid-retry or two sweeps racing cannot double-send an enquiry.
 */

/** Env-overridable so tests can compress "roughly an hour" to milliseconds. */
export function retryDelaysMs(): number[] {
  const raw = optionalServerEnv("EMAIL_RETRY_DELAYS_MS");
  if (!raw) return [5 * 60_000, 15 * 60_000, 40 * 60_000];
  const parsed = raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
  return parsed.length > 0 ? parsed : [5 * 60_000, 15 * 60_000, 40 * 60_000];
}

export type AttemptOutcome =
  | { kind: "accepted"; providerMessageId: string }
  | { kind: "retry-scheduled" }
  | { kind: "undeliverable" };

/** The shape of the config bundle passed around here. */
export interface DispatchContext {
  sql: postgres.Sql;
  http: EmailDeliveryConfig;
}

/**
 * One send attempt for one claimed lead. The caller has already flipped the
 * row to `pending` via `claimLeadForSending`; everything after that is
 * recorded against the guard on that status.
 */
async function attemptOne(
  context: DispatchContext,
  lead: DeliverableLead,
): Promise<AttemptOutcome> {
  const delays = retryDelaysMs();
  const maxRetries = delays.length;

  if (!lead.recipientEmail) {
    // A lead with no tenant row left cannot go anywhere. Terminal, honest.
    await recordSendFailure(context.sql, lead.id, "no recipient mailbox configured", {
      transient: false,
      nextRetryAt: new Date(),
      maxRetries,
    });
    return { kind: "undeliverable" };
  }

  const result = await sendLeadEmail(context.http, {
    to: lead.recipientEmail,
    replyTo: lead.contactEmail,
    subject:
      lead.tenantCompanyName !== null
        ? `New enquiry for ${lead.tenantCompanyName} (${lead.summary ?? lead.eventId})`
        : `New enquiry (${lead.summary ?? lead.eventId})`,
    text: renderLeadText(lead),
  });

  if (result.ok) {
    await recordSendAccepted(context.sql, lead.id, result.providerMessageId);
    return { kind: "accepted", providerMessageId: result.providerMessageId };
  }

  const outcome = await recordSendFailure(
    context.sql,
    lead.id,
    result.error,
    {
      transient: result.kind === "transient",
      nextRetryAt: new Date(
        Date.now() + (delays[lead.retryCount] ?? delays[delays.length - 1] ?? 0),
      ),
      maxRetries,
    },
  );
  return outcome === "retry" ? { kind: "retry-scheduled" } : { kind: "undeliverable" };
}

/**
 * Sends a freshly captured enquiry now, as the capture endpoint's fast path.
 *
 * Returns the lead's id so the route can log which row went where. The HTTP
 * response to the enquirer never depends on this outcome: their part is
 * done, and delivery is our problem from here.
 */
export async function dispatchNewLead(
  context: DispatchContext,
  leadId: string,
): Promise<AttemptOutcome | { kind: "not-claimable" }> {
  const claimed = await claimLeadForSending(context.sql, leadId);
  if (!claimed) return { kind: "not-claimable" };
  const lead = await getDeliverableLead(context.sql, leadId);
  if (!lead) return { kind: "not-claimable" };

  const outcome = await attemptOne(context, lead);
  if (outcome.kind === "undeliverable") {
    await escalate(context, lead, "delivery failed permanently");
  }
  return outcome;
}

/** Sweep result, for the cron route to report. */
export interface SweepResult {
  attempted: number;
  escalated: number;
}

/**
 * Re-attempts every due pending lead. Called by `/api/email-dispatch` on its
 * cron; also the recovery path when the fast path's inline attempt failed.
 */
export async function sweepDueLeads(context: DispatchContext): Promise<SweepResult> {
  const due = await listDueLeads(context.sql, new Date());
  let escalated = 0;

  for (const lead of due) {
    // The sweep re-sends only rows whose next_retry_at has passed; claiming
    // is not needed again because they are already `pending`. The monotonic
    // guards inside the store make a concurrent webhook harmless.
    const outcome = await attemptOne(context, lead);
    if (outcome.kind === "undeliverable") {
      escalated += 1;
      await escalate(context, lead, "retries exhausted");
    }
  }

  return { attempted: due.length, escalated };
}

/**
 * Escalation entry point for the webhook route: a provider-reported bounce
 * has just flipped the row to `undeliverable`; fetch it and tell a human.
 *
 * Deliberately awaited by the caller: if this throws, the webhook answers
 * 500, the provider redelivers, and - because the status flip is monotonic -
 * the retry escalates exactly once more rather than spamming.
 */
export async function escalateByProviderMessageId(
  sql: DispatchContext["sql"],
  http: EmailDeliveryConfig,
  providerMessageId: string,
): Promise<void> {
  const lead = await getLeadByProviderMessageId(sql, providerMessageId);
  if (!lead) return;
  await escalate({ sql, http }, lead, "provider reported the message could not be delivered");
}

/**
 * Tells a human, with everything needed to act: the tenant, the reference,
 * the full stored payload and why it failed. Uses the same provider - if
 * sending itself is broken this fails too, so the failure is shouted into
 * the server logs where the operator's alerting lives.
 */
export async function escalate(
  context: DispatchContext,
  lead: DeliverableLead,
  reason: string,
): Promise<void> {
  const message =
    `An enquiry could not be delivered.\n\n` +
    `Reference: ${lead.eventId}\n` +
    `Tenant: ${lead.tenantCompanyName ?? lead.tenantSlug ?? "unknown"}\n` +
    `Intended recipient: ${lead.recipientEmail ?? "(none configured)"}\n` +
    `Reason: ${reason}\n` +
    `Stored payload follows - act on it manually if the customer is waiting.\n\n` +
    JSON.stringify(lead.payload, null, 2);

  try {
    const result = await sendLeadEmail(context.http, {
      to: BRAND.contactEmail,
      replyTo: null,
      subject: `[action needed] enquiry ${lead.eventId} could not be delivered`,
      text: message,
    });
    if (!result.ok) {
      console.error(
        `[email] escalation for ${lead.eventId} could not be sent (${result.error}); payload follows.\n${message}`,
      );
    }
  } catch (error) {
    console.error(`[email] escalation for ${lead.eventId} threw; payload follows.`, error, `\n${message}`);
  }
}

/** Plain-text rendering of the enquiry. Deliberately not HTML: no tracking
 *  pixels, nothing image-loaded, reads fine anywhere. */
function renderLeadText(lead: DeliverableLead): string {
  const lines = [
    `New enquiry via linwick.co.uk`,
    ``,
    lead.summary ?? "",
    ``,
    `Reply straight to this email to reach the customer.`,
    `(Reference ${lead.eventId})`,
    ``,
    `---`,
    JSON.stringify(lead.payload, null, 2),
  ];
  return lines.join("\n");
}
