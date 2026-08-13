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
  | "ANTHROPIC_API_KEY"
  | "ANTHROPIC_MODEL"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_PRICE_SETUP"
  | "STRIPE_PRICE_MONTHLY"
  | "STRIPE_WEBHOOK_SECRET";

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
 * Values safe to expose to the browser. Referenced statically so Next.js can
 * inline them at build time.
 */
export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
