import type postgres from "postgres";
import type { OrderEvent } from "@/lib/stripe/webhook";
import {
  enableTenantBySlug,
  enableTenantsForEmails,
  findPaidOrderEventId,
  recordProvisioningAudit,
  type EnabledTenant,
} from "@/lib/db/store";
import {
  notifyOwner,
  ownerNotificationGateReason,
  readOwnerNotificationConfig,
} from "@/lib/email/owner-notification";

/**
 * The automatic half of provisioning: bring a tenant live when BOTH facts
 * exist — a genuinely completed, signature-verified Stripe payment, and a
 * submitted onboarding form — regardless of which arrives first.
 *
 * What this deliberately does NOT do:
 *
 *  - It does not touch how either fact is produced. Webhook signatures are
 *    verified in `lib/stripe/webhook.ts` before an event is ever recorded;
 *    billing events are stored de-duplicated by the same insert as before;
 *    the onboarding form's intake guards are unchanged. This module only
 *    reads what those seams already proved.
 *  - It does not treat a checkout completion as money. Delayed payment
 *    methods complete a session days before collection, so only
 *    `checkout.completed` with `paid: true`, and `invoice.paid`, count.
 *  - It does not let a public request flip `enabled` directly. Both entry
 *    points below derive enablement from durably recorded events, and the
 *    UPDATE itself only fires for rows still inactive, so replays and races
 *    collapse into at most one flip, one audit row and one alert.
 *
 * The trade-off this encodes is stated rather than buried: going live no
 * longer includes a human look before launch. That is why every automatic
 * flip writes an audit row the admin panel shows, sends the owner a
 * synchronous notification, and why the manual pause override exists
 * (`setTenantEnabledByAdmin`, surfaced on /admin/leads).
 */

/** Whether this event proves money actually moved. */
function isGenuinePayment(event: OrderEvent): boolean {
  if (event.kind === "checkout.completed") return event.paid;
  // An invoice being paid IS collection — including the first subscription
  // invoice (`subscription_create`) that follows a completed checkout.
  if (event.kind === "invoice.paid") return true;
  return false;
}

interface EnableOutcome {
  /** True when this call flipped at least one tenant live. */
  enabledAny: boolean;
}

/**
 * Called from the webhook seam after a verified billing event is durably
 * recorded. Datastore failures THROW (the webhook route turns them into a
 * 500, Stripe retries, and the de-duplicated storage makes the replay
 * harmless) — but notification failures never propagate: the sale is already
 * recorded by then, and retrying it would only re-alert.
 */
export async function autoEnableAfterVerifiedPayment(
  sql: postgres.Sql,
  event: OrderEvent,
): Promise<EnableOutcome> {
  // Narrow to the two money-bearing shapes before touching `email`: only a
  // collected payment (or an invoice Stripe says was settled) may go on to
  // enable anything.
  if (!isGenuinePayment(event)) return { enabledAny: false };
  if (event.kind !== "checkout.completed" && event.kind !== "invoice.paid") {
    return { enabledAny: false };
  }

  const emails = event.email ? [event.email] : [];
  if (emails.length === 0) {
    console.info(`[provisioning] paid event ${event.eventId} carries no email; nothing to match`);
    return { enabledAny: false };
  }

  // Throws on datastore failure, on purpose — see the docstring.
  const newlyLive = await enableTenantsForEmails(sql, emails);

  for (const tenant of newlyLive) {
    await recordProvisioningAudit(sql, {
      kind: "tenant_enabled",
      slug: tenant.slug,
      eventId: `tenant_live_evt_${event.eventId}_${tenant.slug}`,
      summary:
        `Went live automatically: verified Stripe payment + submitted setup form (matched ${tenant.leadRecipientEmail})`,
      payload: {
        slug: tenant.slug,
        source: "stripe_payment",
        stripeEventId: event.eventId,
        stripeKind: event.kind,
        matchedEmail: tenant.leadRecipientEmail,
      },
    });
  }

  if (newlyLive.length > 0) await announce(newlyLive, event);
  return { enabledAny: newlyLive.length > 0 };
}

/**
 * Called from the setup intake after a submission is durably stored, covering
 * the other arrival order: the customer pays first and fills the form second
 * (or retries a form that timed out). Same failure split as above, except the
 * caller chooses to swallow datastore errors here — the submission itself was
 * already accepted with a 201 contract, and the admin panel shows both the
 * inactive tenant and the paid event if this ever fails.
 */
export async function autoEnableAfterSetupSubmission(
  sql: postgres.Sql,
  submission: { slug: string; companyName: string; emails: string[] },
): Promise<EnableOutcome> {
  const paidEventId = await findPaidOrderEventId(sql, submission.emails);
  if (!paidEventId) return { enabledAny: false };

  // Already-live means the webhook path won a race; nothing left to do.
  const flipped = await enableTenantBySlug(sql, submission.slug);
  if (!flipped) return { enabledAny: false };

  await recordProvisioningAudit(sql, {
    kind: "tenant_enabled",
    slug: submission.slug,
    eventId: `tenant_live_setup_${submission.slug}_${paidEventId}`,
    summary:
      `Went live automatically: submitted setup form matched an already-verified payment (${paidEventId})`,
    payload: {
      slug: submission.slug,
      source: "setup_submission",
      matchedPaymentEventId: paidEventId,
      matchedEmails: submission.emails,
    },
  });

  await announce(
    [
      {
        slug: submission.slug,
        companyName: submission.companyName,
        leadRecipientEmail: submission.emails[0] ?? "",
      },
    ],
    null,
  );
  return { enabledAny: true };
}

/**
 * The synchronous owner notification. Fired inside the request that flips the
 * tenant — NOT queued for the daily sweep, which on the Hobby tier runs once
 * a day and could lag a "you made a sale" by up to 24 hours. Suppression is
 * loud: when a tenant went live but no alert could be sent, the log says
 * exactly which gate is closed.
 */
async function announce(tenants: EnabledTenant[], event: OrderEvent | null): Promise<void> {
  const config = readOwnerNotificationConfig();
  if (!config) {
    console.warn(
      `[provisioning] ${tenants.map((t) => t.slug).join(", ")} went live but NO owner alert was sent (${ownerNotificationGateReason()})`,
    );
    return;
  }

  for (const tenant of tenants) {
    const trigger = event
      ? `${event.kind} (Stripe event ${event.eventId})`
      : "submitted setup form matched an earlier verified payment";
    const subject = `Linwick: ${tenant.companyName} went live automatically`;
    const text = [
      "A new tenant just went live without a human review step.",
      "",
      `Company:     ${tenant.companyName}`,
      `Slug:        ${tenant.slug}`,
      `Enquiries to: ${tenant.leadRecipientEmail}`,
      `Trigger:     ${trigger}`,
      "",
      "This happened because both conditions were met automatically:",
      "a verified, completed Stripe payment AND a submitted onboarding form.",
      "",
      "No one checked this tenant before it launched. If anything looks",
      "wrong, pause it from /admin/leads (or:",
      "update customers set enabled = false where slug = '" + tenant.slug + "';",
      ") — the capture page goes dark immediately.",
    ].join("\n");
    await notifyOwner(config, subject, text);
  }
}
