import { optionalServerEnv, resolveSiteUrl } from "@/lib/env";

/**
 * Stripe configuration, read from the environment and nowhere else.
 *
 * Server-only. Nothing here may be imported from a client component — the
 * guard below turns a mistake into a loud failure rather than a leaked key.
 */

function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "lib/stripe/config is server-only and must not be imported from a client component.",
    );
  }
}

export interface StripeConfig {
  secretKey: string;
  /** Price id for the one-off setup fee. */
  setupPriceId: string;
  /** Price id for the recurring monthly subscription. */
  monthlyPriceId: string;
}

/**
 * What the checkout button can actually do right now.
 *
 * `dev-preview` exists so the rest of the application still works without
 * Stripe credentials. It is deliberately unavailable in production: faking a
 * purchase in front of a real customer would be far worse than an honest
 * "not available yet".
 */
export type CheckoutAvailability =
  | { kind: "live"; config: StripeConfig }
  | { kind: "dev-preview" }
  | { kind: "unavailable" };

export function readStripeConfig(): StripeConfig | null {
  assertServer();
  const secretKey = optionalServerEnv("STRIPE_SECRET_KEY");
  const setupPriceId = optionalServerEnv("STRIPE_PRICE_SETUP");
  const monthlyPriceId = optionalServerEnv("STRIPE_PRICE_MONTHLY");

  if (!secretKey || !setupPriceId || !monthlyPriceId) return null;
  return { secretKey, setupPriceId, monthlyPriceId };
}

export function getCheckoutAvailability(): CheckoutAvailability {
  const config = readStripeConfig();
  if (config) return { kind: "live", config };
  return process.env.NODE_ENV === "production"
    ? { kind: "unavailable" }
    : { kind: "dev-preview" };
}

/**
 * Absolute origin for Stripe's return URLs.
 *
 * Prefers the configured site URL, then the deployment URL. Only falls back to
 * request headers — which a client controls — when neither is available, so a
 * poisoned Host header cannot redirect a paying customer somewhere else on a
 * properly configured deployment.
 *
 * Returns `null` rather than guessing localhost: sending someone who has just
 * paid to a URL that does not resolve is worse than declining to start
 * checkout at all.
 */
export async function siteOrigin(): Promise<string | null> {
  const resolved = resolveSiteUrl();
  if (resolved) return resolved;

  const { headers } = await import("next/headers");
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return null;
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
