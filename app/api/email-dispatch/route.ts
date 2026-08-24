import { NextResponse } from "next/server";
import { optionalServerEnv } from "@/lib/env";
import { readLeadsDatabaseConfig } from "@/lib/db/config";
import { getLeadsDatabase } from "@/lib/db/client";
import { ensureSchema } from "@/lib/db/store";
import { readEmailDeliveryConfig, type EmailDeliveryConfig } from "@/lib/email/config";
import { sweepDueLeads } from "@/lib/email/dispatch";

/**
 * Scheduled delivery sweep: re-attempts enquiries whose send failed
 * transiently and whose retry delay has passed (5m / 15m / 40m by default,
 * env-overridable), escalating the ones whose budget is exhausted.
 *
 * The fast path in `/api/leads` already sends on capture when enabled; this
 * route exists for everything that path could not finish: provider blips,
 * network partitions, a crashed instance mid-send. Every state change is
 * guarded in SQL, so overlapping this with an in-flight inline attempt is
 * safe.
 *
 * Authentication mirrors `/api/retention`: a bearer secret, 401 on mismatch,
 * 503 fail-closed when unset or when either dependency is unconfigured. On
 * Vercel, naming it `CRON_SECRET` lets the platform scheduler authenticate
 * automatically.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resolves the shared secret, or null when the route has not been given one. */
function configuredSecret(): string | null {
  return (
    optionalServerEnv("EMAIL_DISPATCH_SECRET") ?? optionalServerEnv("CRON_SECRET") ?? null
  );
}

function authorised(request: Request): boolean {
  const expected = configuredSecret();
  if (!expected) return false;
  const provided = request.headers.get("authorization") ?? "";
  if (!provided.startsWith("Bearer ")) return false;
  return provided.slice("Bearer ".length).trim() === expected;
}

async function handle(request: Request): Promise<NextResponse> {
  // Order matters for honesty: an UNCONFIGURED route answers 503 whatever
  // the caller sends - it cannot be operated, and that is the message an
  // operator needs. Only a configured route judges credentials.
  const secret = configuredSecret();
  if (!secret || !readEmailDeliveryConfig() || !readLeadsDatabaseConfig()) {
    return NextResponse.json(
      { error: "Not configured; nothing to sweep." },
      { status: 503 },
    );
  }
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  try {
    const sql = getLeadsDatabase(readLeadsDatabaseConfigOrThrow());
    await ensureSchema(sql);
    const result = await sweepDueLeads({ sql, http: readEmailDeliveryConfigOrThrow() });
    return NextResponse.json({ ranAt: new Date().toISOString(), ...result });
  } catch (error) {
    console.error("[email-dispatch] sweep failed", error);
    return NextResponse.json({ error: "Dispatch sweep failed." }, { status: 500 });
  }
}

/**
 * Unreachable after the guards above; stated as throws so the non-null
 * reads below are invariants, not assumptions.
 */
function readLeadsDatabaseConfigOrThrow(): { url: string } {
  const config = readLeadsDatabaseConfig();
  if (!config) throw new Error("dispatch route reached without LEADS_DATABASE_URL");
  return config;
}

function readEmailDeliveryConfigOrThrow(): EmailDeliveryConfig {
  const config = readEmailDeliveryConfig();
  if (!config) throw new Error("dispatch route reached without sending enabled");
  return config;
}

export async function GET(request: Request): Promise<NextResponse> {
  return handle(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return handle(request);
}
