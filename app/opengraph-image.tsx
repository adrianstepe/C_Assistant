import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/marketing/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${BRAND.name} — ${BRAND.tagline}`;

/**
 * Social card, generated at build time by `next/og` (part of Next, no extra
 * dependency). Uses system fonts so nothing is fetched during the build.
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
          background: "#0b1524",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Drawn rather than typed: a glyph would trigger a font fetch. */}
            <svg width="30" height="30" viewBox="0 0 24 24">
              <path
                d="M5 12.5 10 17.5 19 7"
                fill="none"
                stroke="#0b1524"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ fontSize: 34, color: "#ffffff", fontWeight: 600 }}>
            {BRAND.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              lineHeight: 1.1,
              color: "#ffffff",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              maxWidth: 900,
            }}
          >
            Every cleaning enquiry answered in seconds, not on Monday.
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 30,
              color: "#9fb0c4",
              maxWidth: 820,
            }}
          >
            Quote assistant for UK commercial cleaning companies.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: "#0b7a6b",
            }}
          />
          <div style={{ fontSize: 24, color: "#7d8ea3" }}>
            Enquiry, conversation, qualified lead
          </div>
        </div>
      </div>
    ),
    size,
  );
}
