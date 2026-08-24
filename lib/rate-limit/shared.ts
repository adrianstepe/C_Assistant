import { readLeadsDatabaseConfig } from "@/lib/db/config";
import { getLeadsDatabase } from "@/lib/db/client";
import {
  ensureSchema,
  incrementRateWindow,
  sweepRateWindows,
} from "@/lib/db/store";
import { checkRateLimit, type RateLimitResult, type RateLimitRule } from "../rate-limit";

/**
 * The shared-store rate limiter.
 *
 * `lib/rate-limit.ts` is honest about its own limitation: per-instance memory
 * counters multiply by warm instances and reset on cold starts. Once the
 * datastore exists (phase 2 of the fulfilment plan), counters move here, to
 * the same database as everything else, so a limit means a limit.
 *
 * Same interface and same fixed-window arithmetic as the in-memory limiter —
 * callers swap one function name and nothing else about their behaviour.
 *
 * Degradation, chosen deliberately:
 *
 * - No datastore configured: identical to the old behaviour (per-instance
 *   memory). Nothing about a deployment gets worse because the database is
 *   not provisioned yet.
 * - Datastore configured but the counter write fails: fall back to the
 *   in-memory counter for that request and log loudly. Failing closed would
 *   make one database blip refuse every enquiry on the site; failing open
 *   entirely would drop wallet protection. Per-instance counting degrades
 *   gracefully and is still bounded.
 */

export async function checkSharedRateLimit(
  key: string,
  rule: RateLimitRule,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  const config = readLeadsDatabaseConfig();
  if (!config) return checkRateLimit(key, rule, now);

  try {
    const sql = getLeadsDatabase(config);
    await ensureSchema(sql);

    // Fixed windows aligned on epoch, matching the memory limiter exactly.
    const windowStartedAt = new Date(Math.floor(now / rule.windowMs) * rule.windowMs);
    const { count } = await incrementRateWindow(sql, key, windowStartedAt);

    // Roughly once in a hundred calls, sweep windows that ended more than two
    // days ago. Cheap, self-healing, and needs no cron infrastructure.
    if (Math.random() < 0.01) {
      await sweepRateWindows(sql, new Date(now - 2 * 24 * 60 * 60_000));
    }

    const windowEndsAt = windowStartedAt.getTime() + rule.windowMs;
    if (count > rule.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((windowEndsAt - now) / 1000)),
        remaining: 0,
      };
    }
    return { allowed: true, retryAfterSeconds: 0, remaining: rule.limit - count };
  } catch (error) {
    console.error("[rate-limit] shared counter unavailable; using in-memory fallback", error);
    return checkRateLimit(key, rule, now);
  }
}
