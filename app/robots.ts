import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

/**
 * `/admin` is already behind Basic auth in `proxy.ts` and sends
 * `X-Robots-Tag: noindex`, and the checkout pages carry their own `noindex`.
 * Naming them here is belt and braces: it keeps a crawler from spending
 * requests on routes it will only be turned away from.
 *
 * `/api` is excluded because an indexed health endpoint helps nobody.
 */
export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = publicEnv;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/checkout", "/api"],
    },
    // Only advertise a sitemap once its URLs would be real ones.
    ...(siteUrl
      ? { sitemap: new URL("/sitemap.xml", siteUrl).toString() }
      : {}),
  };
}
