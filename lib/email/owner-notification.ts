import { optionalServerEnv } from "@/lib/env";
import { readEmailDeliveryConfig, type EmailDeliveryConfig } from "./config";
import { sendLeadEmail } from "./resend";

/**
 * Internal alerting for the business owner — "someone actually bought".
 *
 * Fired synchronously from the request that flips a tenant live, never from
 * the daily sweep: on the Hobby tier `/api/email-dispatch` runs once a day
 * (see vercel.json), so a sweep-borne "you made a sale" could arrive up to
 * 24 hours after the money did.
 *
 * Gating is deliberately two-fold and reuses what exists:
 *
 * 1. `EMAIL_SENDING_ENABLED` + `RESEND_API_KEY` — exactly the customer-facing
 *    mail seam's gate, via `readEmailDeliveryConfig()`. One transport, one
 *    audited off switch; no second sending path to forget about.
 * 2. `OWNER_NOTIFICATION_EMAIL` — a separate check naming a recipient, so the
 *    internal alert can be pointed at (or away from) a mailbox independently
 *    of any tenant's lead-delivery address.
 *
 * Either gate missing means no alert is attempted and nothing is sent — the
 * same fail-safe bias as everything else in lib/email. A suppressed alert is
 * logged loudly at the moment it was needed, not silently dropped.
 *
 * Server-only.
 */

export interface OwnerNotificationConfig {
  /** Where the alert goes. */
  to: string;
  /** The already-gated delivery transport (carries the key). */
  delivery: EmailDeliveryConfig;
}

/**
 * Reads the alert configuration, or null when either gate is closed. Callers
 * pass the reason through to the log when an alert was actually warranted.
 */
export function readOwnerNotificationConfig(): OwnerNotificationConfig | null {
  const delivery = readEmailDeliveryConfig();
  if (!delivery) return null;

  // The recipient is checked second so that turning alerts OFF is a matter of
  // unsetting one variable, independent of whether customer email runs.
  const to = optionalServerEnv("OWNER_NOTIFICATION_EMAIL");
  if (!to) return null;

  return { to, delivery };
}

/** What a suppressed alert should say, so the log explains its own silence. */
export function ownerNotificationGateReason(): string {
  if (!readEmailDeliveryConfig()) {
    return "EMAIL_SENDING_ENABLED/RESEND_API_KEY not configured";
  }
  if (!optionalServerEnv("OWNER_NOTIFICATION_EMAIL")) {
    return "OWNER_NOTIFICATION_EMAIL not set";
  }
  return "unknown reason";
}

/**
 * Sends one owner notification. NEVER throws and NEVER affects the caller's
 * outcome: the sale is already recorded and the tenant already live by the
 * time this runs, and an alerting outage must not turn a paid webhook into a
 * Stripe retry loop. Returns whether the provider accepted the message.
 */
export async function notifyOwner(
  config: OwnerNotificationConfig,
  subject: string,
  text: string,
): Promise<boolean> {
  try {
    const result = await sendLeadEmail(config.delivery, {
      to: config.to,
      replyTo: null,
      subject,
      text,
    });
    if (result.ok) {
      console.info(`[owner-notify] alert accepted for ${config.to}: ${subject}`);
      return true;
    }
    console.error(
      `[owner-notify] send failed (${result.kind}): ${result.error} — subject: ${subject}`,
    );
    return false;
  } catch (error) {
    console.error("[owner-notify] unexpected send failure", error);
    return false;
  }
}
