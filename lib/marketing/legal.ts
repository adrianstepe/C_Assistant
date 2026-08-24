/**
 * Facts the legal pages state about processors and retention.
 *
 * Kept here so the privacy notice, /security and the terms page cannot drift
 * apart. An empty label means "not provisioned yet": pages render an explicit
 * to-be-confirmed marker rather than inventing a name, exactly like the
 * registration-address banner behaves when company details were missing.
 *
 * Both labels were filled on the stealth-ox/legal-pack-v1 branch once the
 * vendors were confirmed: Neon for the database (Adrians' ADR-1 pick,
 * provisioned EU region), Resend for transactional lead email (ADR-2).
 * They must match what is actually switched on — every page that renders
 * them still double-checks against live configuration before naming either.
 */

/** The Postgres provider backing LEADS_DATABASE_URL (EU-region project). */
export const DATABASE_VENDOR_LABEL = "Neon";

/** The transactional email provider behind EMAIL_SENDING_ENABLED. */
export const EMAIL_DELIVERY_VENDOR_LABEL = "Resend";

/**
 * Retention, stated in the privacy notice and enforced by code
 * (`/api/retention`). If either number changes here, it changes in the
 * processor agreement template and in the enforcement code at the same time.
 */
export const RETENTION_DAYS_AFTER_DELIVERY = 30;

/** No enquiry row outlives this, whatever its delivery status. */
export const RETENTION_HARD_CEILING_DAYS = 90;
