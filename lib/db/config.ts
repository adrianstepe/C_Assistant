import { optionalServerEnv } from "@/lib/env";

/**
 * Datastore configuration, read from the environment and nowhere else.
 *
 * Server-only. This module mirrors `lib/stripe/config.ts`: the provider's
 * connection details stop at this boundary, and nothing downstream knows how
 * the database is reached. Which vendor backs the URL is Adrians' decision
 * (ADR-1); anything speaking the Postgres wire protocol in an EU region works.
 *
 * Absence is a normal state, not an error: until `LEADS_DATABASE_URL` is set,
 * every caller degrades to its pre-datastore behaviour (log-only recording,
 * admin panel showing a "not configured" notice) rather than crashing.
 */
function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "lib/db is server-only and must not be imported from a client component.",
    );
  }
}

export interface LeadsDatabaseConfig {
  url: string;
}

/** The database URL, or `null` when no datastore is configured. */
export function readLeadsDatabaseConfig(): LeadsDatabaseConfig | null {
  assertServer();
  const url = optionalServerEnv("LEADS_DATABASE_URL");
  if (!url) return null;
  return { url };
}
