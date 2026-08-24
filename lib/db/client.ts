import postgres from "postgres";
import type { LeadsDatabaseConfig } from "./config";

/**
 * Constructs the Postgres client.
 *
 * Cached per URL so repeated requests reuse one instance, exactly as
 * `lib/stripe/client.ts` caches per secret key. The vendor's shapes stop
 * here: everything outside `lib/db/` deals only in plain rows and errors.
 *
 * Settings chosen for a serverless host (Vercel), where instances freeze
 * between requests and sockets die with them:
 * - `max: 1` — one connection per instance is plenty at ten customers and
 *   stays inside the free tiers' connection ceilings even across warm
 *   instances.
 * - `prepare: false` — pooled serverless Postgres (PgBouncer in transaction
 *   mode) cannot reliably reuse named prepared statements. Disabling them is
 *   the documented requirement for Neon, Supabase pooler and Vercel Postgres.
 * - Short idle timeout so a frozen instance never holds a dead socket open.
 */
let cached: { url: string; sql: postgres.Sql } | null = null;

export function getLeadsDatabase(config: LeadsDatabaseConfig): postgres.Sql {
  if (cached?.url === config.url) return cached.sql;

  const sql = postgres(config.url, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });

  cached = { url: config.url, sql };
  return sql;
}
