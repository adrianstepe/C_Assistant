/**
 * The schema, as one idempotent SQL string.
 *
 * This is the "plain SQL file" from ADR-1: no migrations framework, no ORM.
 * Every statement is safe to run any number of times, so the store can make
 * itself ready on first use (see `ensureSchema`) and a fresh database works
 * the moment `LEADS_DATABASE_URL` is pointed at it.
 *
 * Two tables, per ADR-1:
 *
 * - `customers` — one row per paying cleaning company (the tenant). Keyed by
 *   the URL slug the hosted page routes on. Holds what the onboarding form
 *   collects plus the Stripe ids linking the row to the subscription that
 *   pays for it. `enabled` doubles as the per-tenant kill switch: flipping it
 *   to false takes a capture page and its intake offline without deleting
 *   anything.
 *
 * - `leads` — one row per durable inbound event, whatever kind it is. Phase 1
 *   writes billing events (`kind = 'order_event'`) here; phase 2 adds captured
 *   enquiries (`kind = 'enquiry'`) and setup submissions (`kind =
 *   'setup_request'`). One table rather than one per event type keeps the
 *   ADR-1 promise of "two tables", and makes "everything we hold about this
 *   email address" genuinely one query, which is the DSAR story in section 4
 *   of the fulfilment plan.
 *
 * `event_id` carries a UNIQUE constraint because Stripe retries webhook
 * deliveries and can deliver the same event twice even after a success: the
 * constraint is what turns a redelivered event into a no-op instead of a
 * duplicate row (or, later, a duplicate lead email). Enquiries get their own
 * generated id in the same column, so a retried capture submission cannot
 * double-send either.
 */
export const SCHEMA_SQL = `
create table if not exists customers (
  slug text primary key,
  company_name text not null,
  contact_name text,
  lead_recipient_email text not null,
  config jsonb not null default '{}'::jsonb,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  enabled boolean not null default false,
  daily_enquiry_cap integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  tenant_slug text references customers(slug) on delete set null,
  event_id text not null unique,
  status text not null default 'recorded',
  summary text,
  payload jsonb not null,
  contact_email text,
  received_at timestamptz not null default now(),
  delivered_at timestamptz,
  retry_count integer not null default 0,
  next_retry_at timestamptz,
  last_error text,
  provider_message_id text
);

-- The admin panel reads recent activity; enquiries are read per tenant.
create index if not exists leads_received_at_idx on leads (received_at desc);
create index if not exists leads_tenant_received_idx on leads (tenant_slug, received_at desc);

-- Shared rate-limit windows (phase 2): fixed-window counters in the database
-- instead of one server instance's memory, so per-IP limits, the global daily
-- budget and each tenant's daily cap are real ceilings rather than
-- multiplied-by-warm-instances suggestions. One row per bucket per window;
-- rows older than a couple of days are swept opportunistically.
create table if not exists rate_windows (
  bucket_key text not null,
  window_started_at timestamptz not null,
  count integer not null default 0,
  primary key (bucket_key, window_started_at)
);

-- Databases created before phase 3 lack the provider id column; ALTER ... IF
-- NOT EXISTS keeps the whole script safe to re-run against any vintage.
alter table leads add column if not exists provider_message_id text;
create index if not exists leads_provider_message_id_idx on leads (provider_message_id);
`;
