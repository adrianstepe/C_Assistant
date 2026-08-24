import { NextResponse } from "next/server";
import { optionalServerEnv } from "@/lib/env";
import { readLeadsDatabaseConfig } from "@/lib/db/config";
import { getLeadsDatabase } from "@/lib/db/client";
import {
  ensureSchema,
  markLeadDelivered,
  markLeadUndeliverable,
  nudgeDelayedLead,
} from "@/lib/db/store";
import { readEmailDeliveryConfig } from "@/lib/email/config";
import { verifyWebhookSignature } from "@/lib/email/webhook-signature";
import { escalateByProviderMessageId } from "@/lib/email/dispatch";

/**
 * Email provider webhook receipt (Resend, signed the svix way).
 *
 * The status-code protocol is the same discipline as the Stripe route:
 *
 *  - **400** — the signature did not verify. Never 200: that would tell the
 *    provider a forged payload was accepted.
 *  - **200** — verified; handled or an event type we do not act on. Unknown
 *    types must not error, or delivery retries forever.
 *  - **500** — verified and we tried, but the write failed. The provider
 *    retries, which is the recovery.
 *  - **503** — no signing secret configured. Honest, and distinguishable
 *    from a bug. Note this does NOT require sending to be enabled: a webhook
 *    for an already-sent message must still be receivable while the flag is
 *    being flipped off.
 *
 * Every state change is monotonic (see `lib/db/store.ts`), so a replayed or
 * reordered event cannot un-send an enquiry.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Webhook event types we act on; anything else is acknowledged, not acted on. */
const DELIVERED = new Set(["email.sent", "email.delivered"]);
const FAILED = new Set(["email.bounced", "email.complained"]);

interface ResendWebhookBody {
  type?: unknown;
  data?: { email_id?: unknown; message_id?: unknown };
}

function extractProviderMessageId(body: ResendWebhookBody): string | null {
  const candidates = [body.data?.email_id, body.data?.message_id];
  const id = candidates.find((value) => typeof value === "string" && value !== "");
  return typeof id === "string" ? id : null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = optionalServerEnv("RESEND_WEBHOOK_SECRET");
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is unset; refusing events.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  // The raw body exactly as sent; re-serialising would break the signature.
  const payload = await request.text();
  if (!verifyWebhookSignature(secret, request.headers, payload)) {
    console.warn("[resend-webhook] rejected a payload with an invalid signature.");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let body: ResendWebhookBody;
  try {
    body = JSON.parse(payload) as ResendWebhookBody;
  } catch {
    return NextResponse.json({ error: "Unparsable payload." }, { status: 400 });
  }

  const providerMessageId = extractProviderMessageId(body);
  if (providerMessageId === null || typeof body.type !== "string") {
    return NextResponse.json({ received: true, handled: false });
  }

  const dbConfig = readLeadsDatabaseConfig();
  if (!dbConfig) {
    console.error(
      "[resend-webhook] LEADS_DATABASE_URL unset; cannot record delivery state.",
    );
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  try {
    const sql = getLeadsDatabase(dbConfig);
    await ensureSchema(sql);

    // Escalations need a working send path; when sending is switched off
    // there is nothing to escalate through, so the flip is recorded and the
    // admin panel shows the undeliverable row instead.
    const emailConfig = readEmailDeliveryConfig();

    switch (true) {
      case DELIVERED.has(body.type): {
        await markLeadDelivered(sql, providerMessageId);
        return NextResponse.json({ received: true, handled: true });
      }
      case body.type === "email.delivery_delayed": {
        // Usually resolves itself: nudge into the sweep's view without
        // spending retry budget.
        await nudgeDelayedLead(sql, providerMessageId, new Date(Date.now() + 5 * 60_000));
        return NextResponse.json({ received: true, handled: true });
      }
      case FAILED.has(body.type): {
        const updated = await markLeadUndeliverable(
          sql,
          providerMessageId,
          `provider reported ${body.type}`,
        );
        if (updated && emailConfig) {
          // Awaited on purpose: if the escalation send fails, this route
          // answers 500, the provider redelivers, and the monotonic status
          // guard makes the retry escalate exactly once more - so the
          // escalation is eventually-delivered, never duplicated.
          await escalateByProviderMessageId(sql, emailConfig, providerMessageId);
        }
        return NextResponse.json({ received: true, handled: true });
      }
      default:
        // Subscribed to in the dashboard but not acted on here.
        return NextResponse.json({ received: true, handled: false });
    }
  } catch (error) {
    console.error(`[resend-webhook] failed to record ${body.type}`, error);
    return NextResponse.json({ error: "Failed to record event." }, { status: 500 });
  }
}
