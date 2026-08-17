import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/marketing/brand";
import { HERO_SUBHEAD } from "@/lib/marketing/hero";
import { BRAND_COLORS, MarkTiles } from "@/lib/marketing/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${BRAND.name}: ${BRAND.tagline}`;

/**
 * Social card, generated at build time by `next/og` (part of Next, no extra
 * dependency). Uses system fonts so nothing is fetched during the build.
 *
 * The headline and sub-head come from `lib/marketing/hero.ts`, the same module
 * the page reads. They used to be retyped here, which meant the card kept
 * advertising whatever the headline said the last time somebody remembered to
 * update both.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BRAND_COLORS.ink,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <MarkTiles size={44} gap={5} tint={BRAND_COLORS.paper} />
          <div
            style={{ fontSize: 34, color: BRAND_COLORS.white, fontWeight: 600 }}
          >
            {BRAND.name}
          </div>
        </div>

        {/*
          The tagline is two negatives in a row, so the sub-head carries the
          same load here as on the page: it is what stops a scroller reading
          "never quote a price" as "does nothing". It has to stay directly
          beneath, and it has to stay legible at thumbnail size.
        */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.1,
              color: BRAND_COLORS.white,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              maxWidth: 900,
            }}
          >
            {BRAND.tagline}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 28,
              lineHeight: 1.4,
              color: BRAND_COLORS.onInk,
              maxWidth: 900,
            }}
          >
            {HERO_SUBHEAD}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{ width: 14, height: 14, background: BRAND_COLORS.brand }}
          />
          <div style={{ fontSize: 24, color: BRAND_COLORS.onInkFaint }}>
            {BRAND.descriptor}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
