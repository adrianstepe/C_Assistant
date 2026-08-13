import { NextResponse } from "next/server";
import { readWebhookConfig, toOrderEvent, verifyEvent } from "@/lib/stripe/webhook";
import { record } from "@/lib/integrations/order-events";

/**
 * Stripe webhook receipt.
 *
 * The status code is the entire protocol here, so each one is deliberate:
 *
 *  - **400** — the signature did not verify. Never 200: that would tell Stripe
 *    a forged or corrupted payload was accepted.
 *  - **200** — verified, and either handled or an event type we do not act on.
 *    Unrecognised types must not error, or Stripe retries them forever and
 *    eventually disables the endpoint.
 *  - **500** — verified and we tried, but recording failed. Stripe retries with
 *    backoff for up to three days, which is the recovery mechanism.
 *  - **503** — not configured. Distinguishable from a bug, and honest.
 *
 * Nothing here reveals *why* a request was rejected: the response body for a
 * bad signature is the same regardless of what was wrong with it.
 */

// Node runtime for crypto, and never cached or statically analysed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const config = readWebhookConfig();
  if (!config) {
    console.error(
      "[stripe-webhook] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is unset; refusing to accept events.",
    );
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // The raw body, exactly as sent. `request.json()` would re-serialise it and
  // the computed signature would never match.
  const payload = await request.text();

  const event = await verifyEvent(config, payload, signature);
  if (!event) {
    console.warn("[stripe-webhook] rejected a payload with an invalid signature.");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const orderEvent = toOrderEvent(event);
  if (!orderEvent) {
    // Subscribed to in the dashboard but not acted on here. Acknowledge it.
    return NextResponse.json({ received: true, handled: false });
  }

  try {
    await record(orderEvent);
  } catch (error) {
    console.error(
      `[stripe-webhook] failed to record ${event.type} (${event.id}); returning 500 so Stripe retries.`,
      error,
    );
    return NextResponse.json({ error: "Failed to record event." }, { status: 500 });
  }

  return NextResponse.json({ received: true, handled: true });
}
