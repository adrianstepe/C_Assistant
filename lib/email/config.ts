import { optionalServerEnv, serverFlagEnabled } from "@/lib/env";

/**
 * Lead email delivery configuration.
 *
 * Server-only, and OFF BY DEFAULT - the mirror of the DeepSeek seam in
 * `lib/ai/deepseek.ts`, pointed at Resend's API instead. The reasons differ:
 * DeepSeek stays off for a compliance reason (Chapter V), while email stays
 * off because a half-configured mail pipeline that silently eats enquiries
 * is worse than one that visibly does nothing. `EMAIL_SENDING_ENABLED` must
 * be an explicit affirmative AND an API key must exist; either alone is not
 * enough.
 *
 * Like the model seam, the transport is raw `fetch` against the provider's
 * documented HTTP API - no vendor SDK, so no dependency to audit and no code
 * path that phones home on import. When the flag is off,
 * `readEmailDeliveryConfig()` returns null and nothing in this module ever
 * issues a request.
 */

function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "lib/email is server-only and must not be imported from a client component.",
    );
  }
}

/** Overridable only so the verification harness can point at a local stub;
 *  production always uses the real origin. */
const DEFAULT_BASE_URL = "https://api.resend.com";

export interface EmailDeliveryConfig {
  apiKey: string;
  baseUrl: string;
}

export function readEmailDeliveryConfig(): EmailDeliveryConfig | null {
  assertServer();

  // Flag first, credentials second - same order as the model seam, for the
  // same reason: a key lying around must never be sufficient on its own.
  if (!serverFlagEnabled("EMAIL_SENDING_ENABLED")) return null;

  const apiKey = optionalServerEnv("RESEND_API_KEY");
  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl: (optionalServerEnv("RESEND_BASE_URL") ?? DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    ),
  };
}

/**
 * True when sending is live. Pages and panels read this; they must not read
 * the config itself, which carries the key.
 */
export function isEmailSendingEnabled(): boolean {
  return readEmailDeliveryConfig() !== null;
}
