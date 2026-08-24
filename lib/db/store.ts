import type postgres from "postgres";
import type { OrderEvent } from "@/lib/stripe/webhook";
import { SCHEMA_SQL } from "./schema";

/**
 * All data access lives here, so the rest of the application deals in plain
 * rows and never in SQL or driver types.
 *
 * Throwing is meaningful: `record()`'s contract is that a failure to persist
 * throws, and the Stripe webhook route turns that into a 500 so Stripe
 * retries - the designed recovery for a datastore outage.
 */

/** One applied schema per client, so cold starts pay the DDL once. */
const ready = new WeakMap<object, Promise<void>>();

/**
 * Binds a plain value as jsonb. The driver's own type for json parameters is
 * narrower than "any JSON-serialisable value", so the boundary lives here in
 * one place rather than being cast at every call site.
 */
function jsonb(sql: postgres.Sql, value: unknown) {
  return sql.json(value as postgres.JSONValue);
}

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
 * far as Stripe is concerned. Any other failure - connection refused, schema
 * missing through a bug, disk full - throws, on purpose.
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
            ${jsonb(sql, event)}::jsonb, ${email})
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

/** The tenant behind a capture-page slug, or `null` when there is none. */
export async function getTenantBySlug(
  sql: postgres.Sql,
  slug: string,
): Promise<TenantRecord | null> {
  const rows = await sql`
    select slug, company_name, contact_name, lead_recipient_email, config,
           enabled, daily_enquiry_cap
    from customers
    where slug = ${slug}
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    slug: row.slug,
    companyName: row.company_name,
    contactName: row.contact_name ?? undefined,
    leadRecipientEmail: row.lead_recipient_email,
    config: (row.config ?? {}) as Record<string, unknown>,
    enabled: row.enabled,
    dailyEnquiryCap: row.daily_enquiry_cap ?? null,
  };
}

/** A tenant as the database holds it. See `lib/tenants/config.ts` for the
 *  shaped view the site uses. */
export interface TenantRecord {
  slug: string;
  companyName: string;
  contactName?: string;
  leadRecipientEmail: string;
  config: Record<string, unknown>;
  /** The kill switch: false takes the capture page and intake offline without
   *  deleting anything. */
  enabled: boolean;
  dailyEnquiryCap: number | null;
}

/**
 * Inserts a captured enquiry.
 *
 * De-duplicated on `event_id` like every leads-table write: a client retrying
 * its POST after a flaky connection resolves to the original row instead of
 * storing (and later sending) the enquiry twice.
 */
export async function insertEnquiry(
  sql: postgres.Sql,
  enquiry: {
    tenantSlug: string;
    eventId: string;
    summary: string;
    payload: Record<string, unknown>;
    contactEmail: string;
  },
): Promise<{ inserted: boolean; id: string | null }> {
  const rows = await sql`
    insert into leads (kind, tenant_slug, event_id, status, summary, payload, contact_email)
    values ('enquiry', ${enquiry.tenantSlug}, ${enquiry.eventId}, 'captured',
            ${enquiry.summary}, ${jsonb(sql, enquiry.payload)}::jsonb, ${enquiry.contactEmail})
    on conflict (event_id) do nothing
    returning id
  `;
  const row = rows[0];
  if (!row) return { inserted: false, id: null };
  return { inserted: true, id: String(row.id) };
}

/**
 * Stores a setup submission from the onboarding form as an inactive customer
 * row: everything the founder needs to activate the tenant, nothing live.
 *
 * Activation stays manual on purpose (the fulfilment plan calls manual
 * onboarding a feature at this scale): payment is confirmed by a human, and
 * `enabled` only ever flips in the database, never from a public endpoint.
 */
export async function insertSetupRequest(
  sql: postgres.Sql,
  draft: {
    slug: string;
    companyName: string;
    contactName?: string;
    leadRecipientEmail: string;
    config: Record<string, unknown>;
    eventId: string;
  },
): Promise<{ inserted: boolean; slugTaken: boolean }> {
  // The audit trail of the submission itself also lands in the leads table,
  // so the admin page shows it alongside enquiries even before activation.
  const rows = await sql`
    insert into customers (slug, company_name, contact_name, lead_recipient_email, config, enabled)
    values (${draft.slug}, ${draft.companyName}, ${draft.contactName ?? null},
            ${draft.leadRecipientEmail}, ${jsonb(sql, draft.config)}::jsonb, false)
    on conflict (slug) do nothing
    returning slug
  `;
  if (rows.length === 0) return { inserted: false, slugTaken: true };

  await sql`
    insert into leads (kind, tenant_slug, event_id, status, summary, payload, contact_email)
    values ('setup_request', ${draft.slug}, ${draft.eventId}, 'received',
            ${`Setup details received for ${draft.companyName}`},
            ${jsonb(sql, draft)}::jsonb, ${draft.leadRecipientEmail})
    on conflict (event_id) do nothing
  `;
  return { inserted: true, slugTaken: false };
}

/**
 * True when `slug` is already taken. Slug generation tries candidates before
 * calling `insertSetupRequest`; this keeps that loop honest without relying
 * on insert-failure parsing.
 */
export async function slugExists(sql: postgres.Sql, slug: string): Promise<boolean> {
  const rows = await sql`
    select 1 from customers where slug = ${slug} limit 1
  `;
  return rows.length > 0;
}

/**
 * The slug an earlier setup submission with this event id already reserved,
 * or null. Checked BEFORE any slug generation on a retried submission:
 * otherwise the retry would see its own slug taken, pick a suffixed variant,
 * and quietly create a second tenant row.
 */
export async function findSetupRequestSlug(
  sql: postgres.Sql,
  eventId: string,
): Promise<string | null> {
  const rows = await sql`
    select tenant_slug from leads
    where kind = 'setup_request' and event_id = ${eventId}
    limit 1
  `;
  return rows[0]?.tenant_slug ?? null;
}

// ---------------------------------------------------------------------------
// shared rate-limit counters

export interface SharedWindowResult {
  count: number;
}

/**
 * Increments one fixed-window counter atomically and returns the new count.
 *
 * The window start is derived from epoch time exactly as the in-memory limiter
 * does, so both implementations agree on when a window rolls over. The
 * upsert-and-return is a single statement, so two instances incrementing the
 * same bucket cannot race past the limit by more than their own request.
 */
export async function incrementRateWindow(
  sql: postgres.Sql,
  bucketKey: string,
  windowStartedAt: Date,
): Promise<SharedWindowResult> {
  const rows = await sql`
    insert into rate_windows (bucket_key, window_started_at, count)
    values (${bucketKey}, ${windowStartedAt}, 1)
    on conflict (bucket_key, window_started_at)
    do update set count = rate_windows.count + 1
    returning count
  `;
  const row = rows[0];
  return { count: row?.count ?? 1 };
}

/** Opportunistic cleanup so the table never grows without bound. */
export async function sweepRateWindows(
  sql: postgres.Sql,
  olderThan: Date,
): Promise<void> {
  await sql`delete from rate_windows where window_started_at < ${olderThan}`;
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

// ---------------------------------------------------------------------------
// lead email delivery (phase 3)
//
// The enquiry lifecycle lives entirely in `leads.status`, advanced by
// monotonic UPDATE ... WHERE status IN (...) guards. No extra tables: a
// status can only move forwards, and every transition names the states it is
// legal from, so a retried webhook or a racing sweep cannot double-send,
// resurrect a delivered row, or downgrade one.

/** A lead row with everything the sender and the escalation need. */
export interface DeliverableLead {
  id: string;
  kind: string;
  eventId: string;
  tenantSlug: string | null;
  tenantCompanyName: string | null;
  /** Where the enquiry goes; null only for rows with no tenant row left. */
  recipientEmail: string | null;
  contactEmail: string | null;
  summary: string | null;
  payload: unknown;
  retryCount: number;
}

/**
 * Claims a stored enquiry for sending.
 *
 * Returns false when the row is not in the claimable state - already claimed
 * by a concurrent attempt, already sent, already failed terminally, or not
 * an enquiry at all. A `false` is a normal outcome, not an error.
 */
export async function claimLeadForSending(
  sql: postgres.Sql,
  id: string,
): Promise<boolean> {
  const rows = await sql`
    update leads set status = 'pending'
    where id = ${id} and kind = 'enquiry' and status = 'captured'
    returning id
  `;
  return rows.length > 0;
}

/**
 * Records that the provider accepted a message for this lead.
 *
 * The row stays `pending` on purpose: acceptance is not delivery. Only the
 * provider's own webhook promotes the row to `sent`.
 */
export async function recordSendAccepted(
  sql: postgres.Sql,
  id: string,
  providerMessageId: string,
): Promise<void> {
  await sql`
    update leads
    set provider_message_id = ${providerMessageId}, last_error = null
    where id = ${id} and status = 'pending'
  `;
}

/**
 * Records a failed send attempt and decides what happens next.
 *
 * Transient failures consume one retry slot and set `next_retry_at` from the
 * caller's schedule; once the budget is exhausted the row becomes
 * `undeliverable`. Permanent failures skip straight to undeliverable - no
 * schedule survives a rejected address. Both outcomes are monotonic: neither
 * branch can touch a row that has moved on from `pending`.
 */
export async function recordSendFailure(
  sql: postgres.Sql,
  id: string,
  error: string,
  options: { transient: boolean; nextRetryAt: Date; maxRetries: number },
): Promise<"retry" | "undeliverable"> {
  if (!options.transient) {
    await sql`
      update leads
      set status = 'undeliverable', last_error = ${error}
      where id = ${id} and status = 'pending'
    `;
    return "undeliverable";
  }

  const rows = await sql`
    update leads
    set retry_count = retry_count + 1,
        next_retry_at = ${options.nextRetryAt},
        last_error = ${error},
        status = case when leads.retry_count + 1 >= ${options.maxRetries}
                      then 'undeliverable' else 'pending' end
    where id = ${id} and status = 'pending'
    returning status
  `;
  const status = rows[0]?.status;
  return status === "undeliverable" ? "undeliverable" : "retry";
}

/** The provider's delivery confirmation. Monotonic: never un-sends. */
export async function markLeadDelivered(
  sql: postgres.Sql,
  providerMessageId: string,
): Promise<boolean> {
  const rows = await sql`
    update leads
    set status = 'sent', delivered_at = now(), last_error = null
    where provider_message_id = ${providerMessageId}
      and status in ('captured', 'pending')
    returning id
  `;
  return rows.length > 0;
}

/** The provider's hard-failure notice. Monotonic in the same way. */
export async function markLeadUndeliverable(
  sql: postgres.Sql,
  providerMessageId: string,
  reason: string,
): Promise<boolean> {
  const rows = await sql`
    update leads
    set status = 'undeliverable', last_error = ${reason}, next_retry_at = null
    where provider_message_id = ${providerMessageId}
      and status in ('captured', 'pending')
    returning id
  `;
  return rows.length > 0;
}

/**
 * Nudges a delayed message back into the sweep's view without burning a
 * retry: a delivery delay reported by the provider usually resolves itself.
 */
export async function nudgeDelayedLead(
  sql: postgres.Sql,
  providerMessageId: string,
  nextRetryAt: Date,
): Promise<void> {
  await sql`
    update leads
    set next_retry_at = coalesce(next_retry_at, ${nextRetryAt})
    where provider_message_id = ${providerMessageId} and status = 'pending'
  `;
}

/** Leads whose scheduled retry has come due, oldest first. */
export async function listDueLeads(
  sql: postgres.Sql,
  now: Date,
  limit = 20,
): Promise<DeliverableLead[]> {
  const rows = await sql`
    select l.id, l.kind, l.event_id, l.tenant_slug, c.company_name,
           c.lead_recipient_email, l.contact_email, l.summary, l.payload,
           l.retry_count
    from leads l
    left join customers c on c.slug = l.tenant_slug
    where l.kind = 'enquiry' and l.status = 'pending'
      and l.next_retry_at is not null and l.next_retry_at <= ${now}
    order by l.next_retry_at asc
    limit ${limit}
  `;
  return rows.map(mapDeliverableRow);
}

/** One lead by id, whatever its state; escalation reads the full payload. */
export async function getDeliverableLead(
  sql: postgres.Sql,
  id: string,
): Promise<DeliverableLead | null> {
  const rows = await sql`
    select l.id, l.kind, l.event_id, l.tenant_slug, c.company_name,
           c.lead_recipient_email, l.contact_email, l.summary, l.payload,
           l.retry_count
    from leads l
    left join customers c on c.slug = l.tenant_slug
    where l.id = ${id} and l.kind = 'enquiry'
    limit 1
  `;
  return rows[0] ? mapDeliverableRow(rows[0]) : null;
}

/** The lead a provider webhook event refers to, via the stored provider id. */
export async function getLeadByProviderMessageId(
  sql: postgres.Sql,
  providerMessageId: string,
): Promise<DeliverableLead | null> {
  const rows = await sql`
    select l.id, l.kind, l.event_id, l.tenant_slug, c.company_name,
           c.lead_recipient_email, l.contact_email, l.summary, l.payload,
           l.retry_count
    from leads l
    left join customers c on c.slug = l.tenant_slug
    where l.provider_message_id = ${providerMessageId} and l.kind = 'enquiry'
    limit 1
  `;
  return rows[0] ? mapDeliverableRow(rows[0]) : null;
}

function mapDeliverableRow(row: Record<string, unknown>): DeliverableLead {
  return {
    id: String(row.id),
    kind: String(row.kind),
    eventId: String(row.event_id),
    tenantSlug: (row.tenant_slug as string | null) ?? null,
    tenantCompanyName: (row.company_name as string | null) ?? null,
    recipientEmail: (row.lead_recipient_email as string | null) ?? null,
    contactEmail: (row.contact_email as string | null) ?? null,
    summary: (row.summary as string | null) ?? null,
    payload: row.payload,
    retryCount: Number(row.retry_count ?? 0),
  };
}
