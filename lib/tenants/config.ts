import { readLeadsDatabaseConfig } from "@/lib/db/config";
import { getLeadsDatabase } from "@/lib/db/client";
import { getTenantBySlug, type TenantRecord } from "@/lib/db/store";

/**
 * Per-tenant configuration for the hosted capture pages.
 *
 * This module is the only thing that knows how a `customers` row becomes the
 * shape the site renders. Everything downstream — the capture page, the demo
 * engine, lead intake — deals in a `TenantConfig` and cannot accidentally
 * leak database details (or another tenant's row) into a page.
 *
 * Server-only: loading reads the datastore. Client components receive only
 * the specific fields passed down as props.
 */

export interface TenantConfig {
  slug: string;
  companyName: string;
  /** Towns, cities or postcode areas the tenant serves; shown on the page. */
  serviceAreas: readonly string[];
  /** The work they take on, as short phrases. */
  services: readonly string[];
  /** Anything they always want asked or noted. Free text, may be empty. */
  notes?: string;
  /** Where completed enquiries will be delivered. Never rendered on the page. */
  leadRecipientEmail: string;
  /** Optional contact name at the tenant. Never rendered on the page. */
  contactName?: string;
  /** Accent colour as CSS, e.g. `#0ea5e9`. Falls back to Linwick's brand amber. */
  brandAccent?: string;
  /** Row-level override of the daily enquiry cap; null means use the default. */
  dailyEnquiryCap?: number | null;
}

/**
 * The per-tenant daily enquiry cap when a row does not set its own.
 *
 * Wallet protection, not a performance number: each stored enquiry is one
 * future email send, so the cap bounds a farmed form's blast radius to a bad
 * hour rather than a bad month.
 */
export const DEFAULT_TENANT_DAILY_CAP = 100;

export function effectiveDailyCap(tenant: { dailyEnquiryCap?: number | null }): number {
  return tenant.dailyEnquiryCap && tenant.dailyEnquiryCap > 0
    ? tenant.dailyEnquiryCap
    : DEFAULT_TENANT_DAILY_CAP;
}

/**
 * Loads and shapes a tenant by slug, or returns `null` for anything that
 * should behave as an unknown slug: no row, or the kill switch off. Callers
 * must not distinguish those two cases in their responses — a disabled
 * tenant's page looks exactly like a slug that never existed.
 */
export async function loadTenantConfig(slug: string): Promise<TenantConfig | null> {
  const db = readLeadsDatabaseConfig();
  if (!db) return null;

  const sql = getLeadsDatabase(db);
  const record = await getTenantBySlug(sql, slug);
  if (!record || !record.enabled) return null;

  return shapeTenantConfig(record);
}

/** Shapes a raw customer row into what the site renders. Tolerant of gaps:
 *  a tenant configured before every field existed still gets a page. */
export function shapeTenantConfig(record: TenantRecord): TenantConfig {
  return {
    slug: record.slug,
    companyName: record.companyName,
    serviceAreas: readStringList(record.config.serviceAreas),
    services: readStringList(record.config.services),
    notes: readOptionalText(record.config.notes),
    leadRecipientEmail: record.leadRecipientEmail,
    contactName: record.contactName,
    brandAccent: readAccent(record.config.brandAccent),
    dailyEnquiryCap: record.dailyEnquiryCap,
  };
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    // A single plain string is accepted: "Manchester" means ["Manchester"].
    if (typeof value === "string" && value.trim() !== "") {
      return splitList(value);
    }
    return [];
  }
  return value.flatMap((entry) => (typeof entry === "string" ? splitList(entry) : []));
}

function splitList(value: string): string[] {
  return value
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .slice(0, 30);
}

function readOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed.slice(0, 2_000);
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function readAccent(value: unknown): string | undefined {
  return typeof value === "string" && HEX_COLOR.test(value.trim())
    ? value.trim().toLowerCase()
    : undefined;
}
