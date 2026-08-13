import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness probe. Deliberately exposes nothing about the environment.
 * Useful for confirming a deployment is serving before any real routes exist.
 */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
