"use server";

import { redirect } from "next/navigation";
import { createCheckoutSession } from "@/lib/stripe/checkout";
import { getCheckoutAvailability, siteOrigin } from "@/lib/stripe/config";

/**
 * Checkout entry point.
 *
 * A Server Action rather than a route handler so the buy button is a real
 * form submission: it works before hydration, and no Stripe identifier ever
 * reaches the browser.
 */

export interface CheckoutState {
  error?: string;
}

export async function startCheckout(
  _previous: CheckoutState,
  _formData: FormData,
): Promise<CheckoutState> {
  const availability = getCheckoutAvailability();

  if (availability.kind === "unavailable") {
    return {
      error:
        "Card payment isn't switched on yet. Email us and we'll get you set up directly.",
    };
  }

  const origin = await siteOrigin();

  // No Stripe credentials locally: skip to the success page so the rest of the
  // application can be worked on. Never reachable in production.
  if (availability.kind === "dev-preview") {
    redirect("/checkout/success?preview=1");
  }

  let checkoutUrl: string;
  try {
    checkoutUrl = await createCheckoutSession(availability.config, {
      successUrl: `${origin}/checkout/success`,
      cancelUrl: `${origin}/checkout/cancelled`,
    });
  } catch (error) {
    console.error("[checkout] failed to create Stripe session", error);
    return {
      error:
        "We couldn't start checkout just then. Please try again, or email us if it keeps happening.",
    };
  }

  // Outside the try: `redirect` signals by throwing, and must not be caught.
  redirect(checkoutUrl);
}
