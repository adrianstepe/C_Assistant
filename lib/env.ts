/**
 * Typed access to environment variables.
 *
 * Rules:
 * - Secrets are read here and nowhere else.
 * - Only `NEXT_PUBLIC_*` values may be referenced from client components.
 * - Nothing is read at module load, so a missing variable fails at the point
 *   of use rather than breaking the build.
 *
 * See `.env.example` for the full list.
 */

/** Server-only variables. Never import these into a client component. */
export type ServerEnvVar =
  | "STRIPE_SECRET_KEY"
  | "STRIPE_PRICE_SETUP"
  | "STRIPE_PRICE_MONTHLY"
  | "STRIPE_WEBHOOK_SECRET"
  | "LEADS_DATABASE_URL"
  | "EMAIL_SENDING_ENABLED"
  | "RESEND_API_KEY"
  | "RESEND_WEBHOOK_SECRET"
  | "RESEND_BASE_URL"
  | "EMAIL_RETRY_DELAYS_MS"
  | "EMAIL_DISPATCH_SECRET"
  | "RETENTION_SECRET"
  | "CRON_SECRET"
  | "ADMIN_USERNAME"
  | "ADMIN_PASSWORD"
  | "ASSISTANT_MODEL_ENABLED"
  | "DEEPSEEK_API_KEY"
  | "DEEPSEEK_MODEL"
  | "DEEPSEEK_BASE_URL";

/**
 * Reads a server variable, throwing if it is absent or blank.
 * Use for values the surrounding code cannot work without.
 */
export function requireServerEnv(name: ServerEnvVar): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to .env.local (see .env.example).`,
    );
  }
  return value;
}

/** Reads a server variable, returning `undefined` if absent or blank. */
export function optionalServerEnv(name: ServerEnvVar): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? undefined : value;
}

/**
 * Reads a boolean opt-in flag. Absent, blank or anything other than an explicit
 * affirmative reads as `false`.
 *
 * Deliberately opt-in rather than opt-out: these flags guard behaviour that
 * must not switch itself on because a variable was misspelled, left blank by a
 * deploy script, or lost when environment variables were copied between Vercel
 * environments. "Off unless someone deliberately said on" is the only default
 * that fails safe.
 */
export function serverFlagEnabled(name: ServerEnvVar): boolean {
  const value = optionalServerEnv(name)?.toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

import { CANONICAL_ORIGIN } from "@/lib/marketing/brand";

const DEV_FALLBACK_SITE_URL = "http://localhost:3000";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * The absolute base URL of this deployment, or `null` when it genuinely cannot
 * be determined in production.
 *
 * Resolution order, and why:
 *
 * 1. **A production deployment always uses `CANONICAL_ORIGIN`.** Which domain
 *    the public site is indexed under is a fact about the brand, and the repo
 *    knows it. Deriving it from a dashboard variable is how the live site came
 *    to publish a canonical tag and an `og:url` pointing at a preview
 *    deployment: the variable had been set once, to a hostname that was right
 *    at the time, and nothing could detect that it had stopped being right.
 *    A wrong canonical is worse than a missing one, so this is not left to
 *    configuration that can drift.
 * 2. `NEXT_PUBLIC_SITE_URL` — for any non-production deployment that needs to
 *    state a specific host.
 * 3. `NEXT_PUBLIC_VERCEL_URL` — the deployment host, supplied automatically by
 *    Vercel. Correct for previews, which should never claim to be the canonical
 *    site.
 * 4. `http://localhost:3000` — development only.
 *
 * Returning `null` rather than falling back to localhost is the whole point of
 * the last step: a canonical tag or a Stripe return URL pointing at localhost
 * silently sends real customers and search engines nowhere.
 *
 * `VERCEL_ENV` is Vercel's own signal and is `"production"` only for the
 * production deployment; previews report `"preview"`. `NODE_ENV` cannot stand
 * in for it, because a preview build is also `NODE_ENV === "production"`.
 *
 * Both spellings are checked deliberately. `VERCEL_ENV` is always present on
 * Vercel; the `NEXT_PUBLIC_` mirror only exists when the project has "expose
 * system environment variables" switched on. Reading just the public one would
 * mean this whole guard silently does nothing on a project where that setting
 * is off, which is the exact class of quiet misconfiguration it exists to end.
 *
 * Keeping previews on their own hostname matters beyond SEO: `siteOrigin()` in
 * `lib/stripe/config.ts` builds Stripe's success and cancel URLs from this, so
 * a preview that claimed the canonical origin would hand a tester back to the
 * production site mid-checkout.
 */
function isProductionDeployment(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
  );
}

export function resolveSiteUrl(): string | null {
  if (isProductionDeployment()) return stripTrailingSlash(CANONICAL_ORIGIN);

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return stripTrailingSlash(configured);

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercelUrl) return `https://${stripTrailingSlash(vercelUrl)}`;

  if (process.env.NODE_ENV === "production") return null;
  return DEV_FALLBACK_SITE_URL;
}

/**
 * Values safe to expose to the browser. Referenced statically so Next.js can
 * inline them at build time.
 */
export const publicEnv = {
  siteUrl: resolveSiteUrl(),
} as const;
