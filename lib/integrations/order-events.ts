import type { OrderEvent } from "@/lib/stripe/webhook";

/**
 * Where confirmed billing events go.
 *
 * Right now: a structured log line, which on Vercel is a searchable, retained
 * record — enough to answer "did that renewal go through?" for the first
 * handful of customers without inventing a datastore first.
 *
 * This is deliberately the only seam. When orders need to be persisted, or a
 * failed payment needs to reach a human inbox, `record` is the single function
 * that changes; nothing upstream of it knows or cares.
 *
 * Two things a real implementation must handle that this one does not:
 *
 *  - **De-duplication.** Stripe retries until it gets a 2xx, and can deliver
 *    the same event more than once even when it does. Dedupe on `eventId`,
 *    which is stable across retries, before writing anything.
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
 * Records a billing event. Throwing here is meaningful: the route turns it
 * into a 500 so Stripe retries, rather than silently losing the event.
 */
export async function record(event: OrderEvent): Promise<void> {
  // Failed payments are the one case that needs a human before the customer
  // notices, so they are logged at error level to stand out in Vercel's UI.
  const log = event.kind === "invoice.payment_failed" ? console.error : console.info;
  log(`[stripe] ${summarise(event)}`, JSON.stringify(event));
}
