import Stripe from "stripe";
import type { StripeConfig } from "./config";

/**
 * Constructs the Stripe SDK client.
 *
 * Cached per secret key so repeated requests reuse one instance. No API
 * version is pinned here: the installed SDK pins its own, and overriding it
 * with a string the types do not know about only creates friction on upgrade.
 */
let cached: { key: string; client: Stripe } | null = null;

/**
 * Takes only the secret key, not the whole `StripeConfig`: webhook receipt
 * needs a client but has no business requiring the price ids to be present.
 */
export function getStripeClient(config: Pick<StripeConfig, "secretKey">): Stripe {
  if (cached?.key === config.secretKey) return cached.client;
  const client = new Stripe(config.secretKey, {
    typescript: true,
    appInfo: { name: "AI Quote Assistant" },
  });
  cached = { key: config.secretKey, client };
  return client;
}
