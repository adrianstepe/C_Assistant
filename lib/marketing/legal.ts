/**
 * Facts the legal pages state about processors and retention.
 *
 * Kept here so the privacy notice, /security and the terms page cannot drift
 * apart. An empty label means "not provisioned yet": pages render an explicit
 * to-be-confirmed marker rather than inventing a name, exactly like the
 * registration-address banner behaves when company details were missing.
 *
 * REVIEW BEFORE LAUNCH: fill the two labels in when the accounts exist, and
 * re-read every page that renders them. They must match what is actually
 * switched on, which those pages double-check against live configuration.
 */

/** e.g. "Neon" or "Supabase". Empty until Adrians provisions the database. */
export const DATABASE_VENDOR_LABEL = "";

/** e.g. "Resend". Empty until the sending account exists. */
export const EMAIL_DELIVERY_VENDOR_LABEL = "";

/**
 * Retention, stated in the privacy notice and enforced by code
 * (`/api/retention`). If either number changes here, it changes in the
 * processor agreement template and in the enforcement code at the same time.
 */
export const RETENTION_DAYS_AFTER_DELIVERY = 30;

/** No enquiry row outlives this, whatever its delivery status. */
export const RETENTION_HARD_CEILING_DAYS = 90;
