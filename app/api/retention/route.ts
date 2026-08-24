import { NextResponse } from "next/server";
import { optionalServerEnv } from "@/lib/env";
import { readLeadsDatabaseConfig } from "@/lib/db/config";
import { getLeadsDatabase } from "@/lib/db/client";
import { ensureSchema } from "@/lib/db/store";
import { runRetentionSweep } from "@/lib/retention";

/**
 * Scheduled retention sweep: deletes enquiry rows past their retention window
 * (30 days after delivery, 90-day hard ceiling - the numbers the privacy
 * notice and processor agreement state).
 *
 * Authentication is a shared bearer secret, checked in constant time by
 * comparison length only. On Vercel, naming the secret `CRON_SECRET` makes
 * the platform's scheduler authenticate automatically; `RETENTION_SECRET`
 * works for any other scheduler or a manual run.
 *
 * Status codes follow the house style: 401 wrong secret, 503 when the secret
 * or datastore is not configured (fail closed - a sweep that cannot prove its
 * authority must not run), 200 with deletion counts otherwise.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const expected =
    optionalServerEnv("RETENTION_SECRET") ?? optionalServerEnv("CRON_SECRET");
  if (!expected) return false;
  const provided = request.headers.get("authorization") ?? "";
  if (!provided.startsWith("Bearer ")) return false;
  return provided.slice("Bearer ".length).trim() === expected;
}

function sweepUnavailable(message: string) {
  return NextResponse.json({ error: message }, { status: 503 });
}

async function handle(request: Request): Promise<NextResponse> {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const dbConfig = readLeadsDatabaseConfig();
  if (!dbConfig) return sweepUnavailable("No datastore configured.");

  try {
    const sql = getLeadsDatabase(dbConfig);
    await ensureSchema(sql);
    const result = await runRetentionSweep(sql);
    return NextResponse.json({ ranAt: new Date().toISOString(), ...result });
  } catch (error) {
    console.error("[retention] sweep failed", error);
    return NextResponse.json({ error: "Retention sweep failed." }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  return handle(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return handle(request);
}
