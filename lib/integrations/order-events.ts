import type { OrderEvent } from "@/lib/stripe/webhook";
import { readLeadsDatabaseConfig } from "@/lib/db/config";
import { getLeadsDatabase } from "@/lib/db/client";
import { ensureSchema, insertOrderEvent } from "@/lib/db/store";

/**
 * Where confirmed billing events go.
 *
 * The log line always happens first, so an event is visible in Vercel's
 * searchable log even if persistence fails. When `LEADS_DATABASE_URL` is set,
 * it is then written to the `leads` table with de-duplication on `eventId` —
 * Stripe retries until it gets a 2xx and can deliver the same event more than
 * once even when it does, so the store's UNIQUE constraint is what turns a
 * redelivery into a no-op.
 *
 * This is deliberately still the only seam. Nothing upstream of `record`
 * knows or cares whether a datastore is configured.
 *
 * Failure semantics (the route depends on them):
 *
 * - No database configured: log only, never throws. Exactly the behaviour the
 *   application had before the datastore existed, so setting nothing changes
 *   nothing.
 * - Database configured but unavailable or unwritable: throws. The webhook
 *   route turns that into a 500 and Stripe retries for up to three days,
 *   which is the designed recovery rather than silent loss.
 * - Redelivered event: succeeds quietly as a no-op via the UNIQUE constraint
 *   on `event_id`.
 *
 * One duty from the original docstring remains open on purpose:
 *
 *  - **Ordering.** Events are not guaranteed to arrive in the order they
 *    occurred. Do not derive subscription state by replaying them in receipt
 *    order; read the current state from Stripe when it matters.
 */

/** One-line human summary, so the log is readable without parsing JSON. */
function summarise(event: OrderEvent): string {
  switch (event.kind) {
    case "checkout.completed":
      return event.paid
        ? `Sale: ${event.email ?? "unknown email"} paid ${money(event.amountTotal, event.currency)}`
        : `Checkout completed but payment is still pending for ${event.email ?? "unknown email"}`;
    case "checkout.expired":
      return `Abandoned checkout: ${event.email ?? "no email captured"}`;
    case "invoice.paid":
      return `Invoice ${event.number ?? event.invoiceId} paid: ${money(event.amountPaid, event.currency)} (${event.reason ?? "no reason given"})`;
    case "invoice.payment_failed":
      return `PAYMENT FAILED for ${event.email ?? "unknown email"}: ${money(event.amountDue, event.currency)} on invoice ${event.number ?? event.invoiceId}`;
    case "subscription.updated":
      return event.cancelAtPeriodEnd
        ? `Subscription ${event.subscriptionId} set to cancel at period end (status ${event.status})`
        : `Subscription ${event.subscriptionId} updated to status ${event.status}`;
    case "subscription.cancelled":
      return `Subscription ${event.subscriptionId} ended${event.reason ? ` (${event.reason})` : ""}`;
  }
}

function money(amount: number | undefined, currency: string | undefined): string {
  if (amount === undefined || !currency) return "an unknown amount";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Records a billing event: always to the log, and to the datastore when one
 * is configured. Throwing here is meaningful: the route turns it into a 500
 * so Stripe retries, rather than silently losing the event.
 */
export async function record(event: OrderEvent): Promise<void> {
  // Failed payments are the one case that needs a human before the customer
  // notices, so they are logged at error level to stand out in Vercel's UI.
  const log = event.kind === "invoice.payment_failed" ? console.error : console.info;
  log(`[stripe] ${summarise(event)}`, JSON.stringify(event));

  await persist(event);
}

/**
 * The persistence half of `record`, split out so the logging contract above
 * stays obvious at a glance.
 *
 * Every failure path throws — including schema preparation — because the only
 * time this runs is with a database configured, and a write we could not make
 * must reach Stripe as a retryable failure, not disappear.
 */
async function persist(event: OrderEvent): Promise<void> {
  const config = readLeadsDatabaseConfig();
  // No store configured: today's behaviour, unchanged. Nothing to retry.
  if (!config) return;

  const sql = getLeadsDatabase(config);
  await ensureSchema(sql);
  await insertOrderEvent(sql, event);
}
