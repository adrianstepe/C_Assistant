import type Stripe from "stripe";
import { optionalServerEnv } from "@/lib/env";
import { getStripeClient } from "./client";

/**
 * Webhook receipt: signature verification, and translation of Stripe's events
 * into the small set of things this business actually cares about.
 *
 * Like `checkout.ts`, this module exists so Stripe's shapes stop here. The
 * route handler and everything downstream deal only in `OrderEvent`.
 *
 * Server-only. Never import from a client component.
 */

export interface WebhookConfig {
  secretKey: string;
  signingSecret: string;
}

/**
 * Reads webhook credentials, or `null` when the endpoint is not configured.
 *
 * Deliberately does not require the price ids: verifying an incoming signature
 * has nothing to do with what we sell.
 */
export function readWebhookConfig(): WebhookConfig | null {
  const secretKey = optionalServerEnv("STRIPE_SECRET_KEY");
  const signingSecret = optionalServerEnv("STRIPE_WEBHOOK_SECRET");
  if (!secretKey || !signingSecret) return null;
  return { secretKey, signingSecret };
}

/**
 * Verifies the signature and returns the event, or `null` if the payload did
 * not come from Stripe.
 *
 * `payload` must be the *raw* request body. Parsing it to JSON first and
 * re-serialising changes the bytes and the signature will never match.
 */
export async function verifyEvent(
  config: WebhookConfig,
  payload: string,
  signature: string,
): Promise<Stripe.Event | null> {
  const stripe = getStripeClient(config);
  try {
    // The async variant works under both Node crypto and Web Crypto, so this
    // keeps working if the route is ever moved off the Node runtime.
    return await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      config.signingSecret,
    );
  } catch {
    return null;
  }
}

// --- domain events -----------------------------------------------------------

/** Fields every event carries, used for logging and de-duplication. */
interface EventBase {
  /** Stripe's event id (`evt_…`). Stable across retries — dedupe on this. */
  eventId: string;
  occurredAt: Date;
}

export type OrderEvent = EventBase &
  (
    | {
        kind: "checkout.completed";
        sessionId: string;
        email?: string;
        /** First-invoice total in pence. */
        amountTotal?: number;
        currency?: string;
        subscriptionId?: string;
        /**
         * False when the payment is still in flight. Delayed methods such as
         * Bacs Direct Debit complete the *session* days before the money
         * arrives, so this must be checked before treating the sale as real.
         */
        paid: boolean;
      }
    | { kind: "checkout.expired"; sessionId: string; email?: string }
    | {
        kind: "invoice.paid";
        invoiceId: string;
        number?: string;
        email?: string;
        amountPaid: number;
        currency: string;
        subscriptionId?: string;
        /** `subscription_create` for the first invoice, `subscription_cycle` for renewals. */
        reason?: string;
      }
    | {
        kind: "invoice.payment_failed";
        invoiceId: string;
        number?: string;
        email?: string;
        amountDue: number;
        currency: string;
        subscriptionId?: string;
        /** Stripe's hosted page where the customer can retry payment. */
        paymentUrl?: string;
      }
    | {
        kind: "subscription.updated";
        subscriptionId: string;
        status: string;
        /** True once the customer has cancelled but is still inside a paid month. */
        cancelAtPeriodEnd: boolean;
      }
    | {
        kind: "subscription.cancelled";
        subscriptionId: string;
        status: string;
        reason?: string;
      }
  );

function idOf(value: string | { id: string } | null | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

/**
 * The subscription an invoice belongs to.
 *
 * Invoices no longer carry a top-level `subscription`; since API version
 * `2025-03-31.basil` the link lives under `parent.subscription_details`. This
 * is exactly the kind of field that moves between API versions, which is why
 * the webhook endpoint's version must match the SDK's pinned one.
 */
function invoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  const details = invoice.parent?.subscription_details;
  return idOf(details?.subscription);
}

/**
 * Maps a verified Stripe event to an `OrderEvent`, or `null` for event types
 * this application does not act on.
 *
 * Returning `null` rather than throwing matters: an unrecognised event is a
 * perfectly normal thing to receive — Stripe sends whatever the endpoint is
 * subscribed to, and the subscription list is edited in a dashboard, not here.
 */
export function toOrderEvent(event: Stripe.Event): OrderEvent | null {
  const base: EventBase = {
    eventId: event.id,
    occurredAt: new Date(event.created * 1000),
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      return {
        ...base,
        kind: "checkout.completed",
        sessionId: session.id,
        email: session.customer_details?.email ?? session.customer_email ?? undefined,
        amountTotal: session.amount_total ?? undefined,
        currency: session.currency ?? undefined,
        subscriptionId: idOf(session.subscription),
        paid: session.payment_status === "paid",
      };
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      return {
        ...base,
        kind: "checkout.expired",
        sessionId: session.id,
        email: session.customer_details?.email ?? session.customer_email ?? undefined,
      };
    }

    case "invoice.paid": {
      const invoice = event.data.object;
      return {
        ...base,
        kind: "invoice.paid",
        invoiceId: invoice.id ?? "(unknown)",
        number: invoice.number ?? undefined,
        email: invoice.customer_email ?? undefined,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        subscriptionId: invoiceSubscriptionId(invoice),
        reason: invoice.billing_reason ?? undefined,
      };
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      return {
        ...base,
        kind: "invoice.payment_failed",
        invoiceId: invoice.id ?? "(unknown)",
        number: invoice.number ?? undefined,
        email: invoice.customer_email ?? undefined,
        amountDue: invoice.amount_due,
        currency: invoice.currency,
        subscriptionId: invoiceSubscriptionId(invoice),
        paymentUrl: invoice.hosted_invoice_url ?? undefined,
      };
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      return {
        ...base,
        kind: "subscription.updated",
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      return {
        ...base,
        kind: "subscription.cancelled",
        subscriptionId: subscription.id,
        status: subscription.status,
        reason: subscription.cancellation_details?.reason ?? undefined,
      };
    }

    default:
      return null;
  }
}
