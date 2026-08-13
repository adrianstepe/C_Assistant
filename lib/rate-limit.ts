/**
 * In-memory fixed-window rate limiter.
 *
 * Deliberately dependency-free. It exists to stop a public, paid-per-call
 * endpoint being trivially drained — not to be a security control.
 *
 * KNOWN LIMITATION, and it matters: the counters live in the memory of one
 * server instance. On Vercel each serverless instance keeps its own, and they
 * reset on cold start, so the real ceiling is roughly
 * `limit × number of warm instances`. It raises the cost of abuse; it does not
 * cap it. The global daily budget below is the actual wallet protection. Move
 * to a shared store (Upstash/Redis) if this ever matters commercially.
 */

interface Window {
  count: number;
  resetAt: number;
}

export interface RateLimitRule {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets. Use for `Retry-After`. */
  retryAfterSeconds: number;
  remaining: number;
}

const buckets = new Map<string, Window>();

/** Stops the map growing without bound on a long-lived instance. */
function evictExpired(now: number): void {
  if (buckets.size < 5000) return;
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  rule: RateLimitRule,
  now: number = Date.now(),
): RateLimitResult {
  evictExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: rule.limit - 1,
    };
  }

  if (existing.count >= rule.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: rule.limit - existing.count,
  };
}

/**
 * Best-effort client identity.
 *
 * Behind Vercel, `x-forwarded-for` is set by the platform. It is still
 * spoofable in principle, which is another reason the global budget exists.
 */
export function clientKey(headers: Headers, scope: string): string {
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}
