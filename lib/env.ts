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
 * 1. `NEXT_PUBLIC_SITE_URL` — the canonical domain. Always set this in
 *    production; nothing else knows which of several possible hosts is the one
 *    you want indexed.
 * 2. `NEXT_PUBLIC_VERCEL_URL` — the deployment host, supplied automatically by
 *    Vercel. Not the canonical domain, but never *wrong* the way localhost is.
 * 3. `http://localhost:3000` — development only.
 *
 * Returning `null` rather than falling back to localhost in production is the
 * whole point: a canonical tag or a Stripe return URL pointing at localhost is
 * worse than one that is absent, because it silently sends real customers and
 * search engines nowhere.
 */
export function resolveSiteUrl(): string | null {
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
