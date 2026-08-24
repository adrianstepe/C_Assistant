import type postgres from "postgres";
import type { OrderEvent } from "@/lib/stripe/webhook";
import { SCHEMA_SQL } from "./schema";

/**
 * All data access lives here, so the rest of the application deals in plain
 * rows and never in SQL or driver types.
 *
 * Throwing is meaningful: `record()`'s contract is that a failure to persist
 * throws, and the Stripe webhook route turns that into a 500 so Stripe
 * retries — the designed recovery for a datastore outage.
 */

/** One applied schema per client, so cold starts pay the DDL once. */
const ready = new WeakMap<object, Promise<void>>();

/**
 * Makes sure the tables exist before the first statement of this instance.
 *
 * Idempotent DDL against an already-provisioned database costs one cheap
 * round trip per cold start and buys "set one env var and everything works"
 * with no migration step to forget. If it fails, the error propagates: a
 * database we cannot prepare is a database we cannot write to, and callers
 * need to see that rather than a silent log-only success.
 */
export function ensureSchema(sql: postgres.Sql): Promise<void> {
  let pending = ready.get(sql);
  if (!pending) {
    pending = sql.unsafe(SCHEMA_SQL).then(() => undefined);
    ready.set(sql, pending);
  }
  return pending;
}

/** A customer (tenant) row as the admin panel renders it. */
export interface CustomerRow {
  slug: string;
  companyName: string;
  leadRecipientEmail: string;
  enabled: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date;
}

/** A leads-table row as the admin panel renders it. */
export interface LeadRow {
  id: string;
  kind: string;
  tenantSlug: string | null;
  eventId: string;
  status: string;
  summary: string | null;
  contactEmail: string | null;
  receivedAt: Date;
}

/**
 * Inserts one billing event, de-duplicated on its event id.
 *
 * Returns whether the row was newly inserted: a redelivered event (the UNIQUE
 * constraint on `event_id`) resolves quietly to `false`, which is success as
 * far as Stripe is concerned. Any other failure — connection refused, schema
 * missing through a bug, disk full — throws, on purpose.
 */
export async function insertOrderEvent(
  sql: postgres.Sql,
  event: OrderEvent,
): Promise<{ inserted: boolean }> {
  // Only some union members carry an email; subscription events do not.
  const email = "email" in event ? (event.email ?? null) : null;
  const rows = await sql`
    insert into leads (kind, event_id, status, summary, payload, contact_email)
    values ('order_event', ${event.eventId}, 'recorded', ${summariseForStore(event)},
            ${sql.json(event as unknown as postgres.JSONValue)}::jsonb, ${email})
    on conflict (event_id) do nothing
    returning event_id
  `;
  return { inserted: rows.length > 0 };
}

/** Newest first; the admin panel shows a bounded page of these. */
export async function listCustomers(
  sql: postgres.Sql,
  limit = 100,
): Promise<CustomerRow[]> {
  const rows = await sql`
    select slug, company_name, lead_recipient_email, enabled,
           stripe_customer_id, stripe_subscription_id, created_at
    from customers
    order by created_at desc
    limit ${limit}
  `;
  return rows.map((row) => ({
    slug: row.slug,
    companyName: row.company_name,
    leadRecipientEmail: row.lead_recipient_email,
    enabled: row.enabled,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    createdAt: row.created_at,
  }));
}

/** Newest first across all kinds; the admin panel shows a bounded page. */
export async function listRecentLeads(
  sql: postgres.Sql,
  limit = 50,
): Promise<LeadRow[]> {
  const rows = await sql`
    select id, kind, tenant_slug, event_id, status, summary, contact_email, received_at
    from leads
    order by received_at desc
    limit ${limit}
  `;
  return rows.map((row) => ({
    id: String(row.id),
    kind: row.kind,
    tenantSlug: row.tenant_slug,
    eventId: row.event_id,
    status: row.status,
    summary: row.summary,
    contactEmail: row.contact_email,
    receivedAt: row.received_at,
  }));
}

/**
 * The same human summary the log line carries, stored alongside the payload so
 * the admin panel reads like the log does without parsing JSON.
 */
function summariseForStore(event: OrderEvent): string {
  // Kept deliberately terse here; the full wording lives in the integration
  // module that owns logging. This is enough to scan a table with.
  switch (event.kind) {
    case "checkout.completed":
      return event.paid
        ? `Checkout completed and paid (${event.email ?? "unknown email"})`
        : `Checkout completed, payment pending (${event.email ?? "unknown email"})`;
    case "checkout.expired":
      return "Checkout expired";
    case "invoice.paid":
      return `Invoice paid (${event.reason ?? "renewal"})`;
    case "invoice.payment_failed":
      return "Payment failed";
    case "subscription.updated":
      return `Subscription updated (${event.status})`;
    case "subscription.cancelled":
      return "Subscription cancelled";
  }
}
