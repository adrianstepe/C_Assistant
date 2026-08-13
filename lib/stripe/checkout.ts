import type { StripeConfig } from "./config";
import { getStripeClient } from "./client";
import { PRODUCT_NAME } from "@/lib/pricing";

/**
 * Checkout session creation and lookup.
 *
 * The only module that knows Stripe's shapes. Pages and actions deal in the
 * small view models below, so swapping payment providers would not reach into
 * the UI.
 */

export interface CheckoutUrls {
  successUrl: string;
  cancelUrl: string;
}

/**
 * Creates a subscription checkout combining the one-off setup fee with the
 * monthly price. Stripe puts a one-time price on the first invoice of a
 * subscription, which is exactly the £149 + £79/month arrangement.
 */
export async function createCheckoutSession(
  config: StripeConfig,
  urls: CheckoutUrls,
): Promise<string> {
  const stripe = getStripeClient(config);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      { price: config.setupPriceId, quantity: 1 },
      { price: config.monthlyPriceId, quantity: 1 },
    ],
    success_url: `${urls.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: urls.cancelUrl,
    // Collected by Stripe so we never handle card details or billing addresses.
    billing_address_collection: "required",
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { product: PRODUCT_NAME },
    },
  });

  if (!session.url) {
    throw new Error("Stripe returned a session without a redirect URL.");
  }
  return session.url;
}

/** What the success page needs. Deliberately free of Stripe types. */
export interface CheckoutSummary {
  paid: boolean;
  customerEmail?: string;
  /** Total of the first invoice, in the smallest currency unit. */
  amountTotal?: number;
  currency?: string;
}

/**
 * Confirms a completed checkout on the success page.
 *
 * Returns `null` when the id is unrecognised, so a guessed or stale
 * `session_id` degrades to the generic confirmation rather than an error page.
 */
export async function retrieveCheckoutSession(
  config: StripeConfig,
  sessionId: string,
): Promise<CheckoutSummary | null> {
  const stripe = getStripeClient(config);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      paid: session.payment_status === "paid" || session.status === "complete",
      customerEmail:
        session.customer_details?.email ?? session.customer_email ?? undefined,
      amountTotal: session.amount_total ?? undefined,
      currency: session.currency ?? undefined,
    };
  } catch {
    return null;
  }
}
