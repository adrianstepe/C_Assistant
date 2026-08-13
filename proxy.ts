import { NextResponse } from "next/server";
import type { NextRequest, ProxyConfig } from "next/server";

/**
 * Access gate for the internal area.
 *
 * HTTP Basic authentication over the whole of `/admin`. Deliberately the
 * smallest thing that works: credentials come from the environment, the
 * browser handles the prompt, and there is no session store, no user table and
 * no third-party auth service to run.
 *
 * Uses the `proxy.ts` convention — Next 16 deprecated `middleware.ts` in favour
 * of it, and warns at build time if the old name is used.
 *
 * Two properties matter more than elegance here:
 *
 * 1. It fails closed. If the credentials are not configured, the admin area is
 *    locked rather than open. A misconfigured deploy loses access to a tool;
 *    the alternative loses the prospect list to the public.
 * 2. It is served over HTTPS in production. Basic auth sends credentials
 *    base64-encoded, not encrypted, so this is only safe because Vercel
 *    terminates TLS. Do not expose this over plain HTTP.
 */

const REALM = 'Basic realm="Internal", charset="UTF-8"';

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  // Belt and braces alongside the `robots` metadata on the admin layout.
  "X-Robots-Tag": "noindex, nofollow",
} as const;

/**
 * Compares without leaking length or position through timing.
 *
 * Node's `timingSafeEqual` is not available in the proxy runtime, so this is
 * the equivalent over char codes.
 */
function safeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function challenge(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { ...NO_STORE, "WWW-Authenticate": REALM },
  });
}

export function proxy(request: NextRequest): NextResponse {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    return new NextResponse(
      "Admin access is not configured on this deployment.",
      { status: 503, headers: NO_STORE },
    );
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return challenge();

  let decoded: string;
  try {
    decoded = atob(header.slice("Basic ".length).trim());
  } catch {
    return challenge();
  }

  const separator = decoded.indexOf(":");
  if (separator === -1) return challenge();

  // Both comparisons always run, so a wrong username is not faster to reject
  // than a wrong password.
  const userMatches = safeEqual(decoded.slice(0, separator), expectedUser);
  const passwordMatches = safeEqual(decoded.slice(separator + 1), expectedPassword);
  if (!userMatches || !passwordMatches) return challenge();

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(NO_STORE)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config: ProxyConfig = {
  // `:path*` matches zero segments, but `/admin` is listed explicitly so the
  // bare path can never fall through unprotected.
  matcher: ["/admin", "/admin/:path*"],
};
