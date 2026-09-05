import type { EmailDeliveryConfig } from "./config";

export type { EmailDeliveryConfig };

/**
 * One call to Resend's send API, shaped by their documented request/response
 * and implemented with raw `fetch` - the same discipline as
 * `lib/ai/deepseek.ts`. No vendor SDK: nothing here executes on import, so a
 * disabled pipeline cannot make requests even by accident.
 *
 * Failures are classified rather than thrown:
 *
 *  - **transient** - network errors, timeouts, 429 and 5xx. The provider (or
 *    the network in between) may succeed next time; these schedule a retry.
 *  - **permanent** - 4xx. Retrying an invalid address or a rejected sender
 *    only burns the retry budget; these go straight to undeliverable.
 */

/** How long we hold a customer-facing request open for the send attempt. */
const TIMEOUT_MS = 8_000;

export interface LeadEmailMessage {
  /** Tenant's nominated inbox; where the enquiry is going. */
  to: string;
  /** The enquirer; replies go straight back to them, per ADR-2. */
  replyTo: string | null;
  subject: string;
  text: string;
}

export type SendResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; kind: "transient" | "permanent"; error: string };

export async function sendLeadEmail(
  config: EmailDeliveryConfig,
  message: LeadEmailMessage,
): Promise<SendResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Resend's POST /emails. `headers.reply_to` carries the enquirer's
    // address; `from` is the linwick.co.uk identity configured in the
    // Resend account, referenced by address only.
    const response = await fetch(`${config.baseUrl}/emails`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER_ADDRESS,
        to: [message.to],
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        subject: message.subject,
        text: message.text,
      }),
    });

    if (!response.ok) {
      // Only the status is recorded - never the body, which can echo
      // addresses or key material on some gateways.
      const error = `Resend returned ${response.status}`;
      return {
        ok: false,
        kind: response.status === 429 || response.status >= 500 ? "transient" : "permanent",
        error,
      };
    }

    const body: unknown = await response.json().catch(() => null);
    const id =
      typeof body === "object" && body !== null && "id" in body
        ? (body as { id?: unknown }).id
        : undefined;
    if (typeof id !== "string" || id === "") {
      return {
        ok: false,
        kind: "transient",
        error: "Resend accepted the message but returned no id.",
      };
    }
    return { ok: true, providerMessageId: id };
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    return { ok: false, kind: "transient", error: `send failed (${name})` };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * The verified linwick.co.uk sending identity. Enquiries must come FROM the
 * brand, not from a personal mailbox, and ADR-2 settled this address.
 *
 * This needs DNS control of linwick.co.uk, NOT a mailbox on it. Resend
 * verifies the domain with TXT records and signs with its own DKIM key; the
 * SMTP return-path is Resend's, so hard bounces come back to us as
 * `email.bounced` on /api/webhooks/resend and NOT to this address. The whole
 * delivery pipeline works with no inbox here at all.
 *
 * Replies do not land here either - Reply-To carries the enquirer, so a
 * customer hitting Reply reaches them directly.
 *
 * What DOES land here is a human deciding to write to the address they can see
 * in the From header: a customer asking for a question to be changed, a
 * data-subject request, an abuse report. Without an inbox or a forward, every
 * one of those hard-bounces. So this should be a deliverable address - a free
 * forward to CONTACT_EMAIL is enough - but that is a customer-service
 * obligation, not a technical prerequisite for sending.
 */
export const SENDER_ADDRESS = "enquiries@linwick.co.uk";
