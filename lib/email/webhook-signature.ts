import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Webhook signature verification for the email provider.
 *
 * Resend signs its webhooks the svix way: `svix-id`, `svix-timestamp` and
 * `svix-signature` headers, with the signature computed over
 * `${id}.${timestamp}.${payload}` using HMAC-SHA256 keyed by the base64 part
 * of the signing secret. Verifying here - not in a vendor SDK - keeps the
 * webhook route's trust boundary in one auditable place, exactly as the
 * Stripe route does with its own scheme.
 */

export interface VerifiedWebhook {
  id: string;
  timestamp: number;
  payload: string;
}

/** Reject replays older than this; clocks drift a little, but not minutes. */
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * True when the headers and raw body carry a signature made by the secret.
 *
 * Never throws and never explains: like the Stripe route, callers respond
 * identically to every failure so nothing about the rejection is observable.
 */
export function verifyWebhookSignature(
  secret: string,
  headers: Headers,
  payload: string,
): boolean {
  const id = headers.get("svix-id");
  const timestampHeader = headers.get("svix-timestamp");
  const signatureHeader = headers.get("svix-signature");
  if (!id || !timestampHeader || !signatureHeader) return false;

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
    return false;
  }

  // The secret arrives as `whsec_<base64>`; only the base64 part keys the
  // MAC. A secret without the prefix is accepted as-is so tests (and any
  // future provider using bare keys) need no special casing.
  const keyBase64 = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(keyBase64, "base64");
  } catch {
    return false;
  }

  const signedContent = `${id}.${timestamp}.${payload}`;
  const expected = createHmac("sha256", key).update(signedContent).digest("base64");

  // Several signatures can be listed, space-separated, during key rotation;
  // matching any one of them is valid.
  return signatureHeader
    .split(" ")
    .some((candidate) => candidate.trim().length > 0 && safeEqual(candidate.trim(), expected));
}
