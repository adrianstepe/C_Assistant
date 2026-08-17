import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

/**
 * The public routes, in the order a visitor would sensibly meet them.
 *
 * Gated on the site URL for the same reason as the canonical tag in
 * `app/layout.tsx`: without a real base, Next resolves these against
 * localhost, and a sitemap advertising localhost URLs is worse than no
 * sitemap. Returns empty until `NEXT_PUBLIC_SITE_URL` is set.
 */
const ROUTES = ["/", "/demo", "/pricing", "/privacy", "/terms"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const { siteUrl } = publicEnv;
  if (!siteUrl) return [];

  const lastModified = new Date();

  return ROUTES.map((route) => ({
    url: new URL(route, siteUrl).toString(),
    lastModified,
    changeFrequency: "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
