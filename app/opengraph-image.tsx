import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/marketing/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${BRAND.name} — ${BRAND.tagline}`;

/**
 * The paper-coloured monogram, inlined as a data URI. Satori cannot resolve a
 * bundler path or a relative URL, and reading the file at build time keeps the
 * card free of any network fetch.
 */
const markSrc = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "components/marketing/sd-mark-paper.png"),
).toString("base64")}`;

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
          background: "#15231f",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markSrc} width={68} height={43} alt="" />
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
              color: "#9fb0a3",
              maxWidth: 820,
            }}
          >
            {BRAND.tagline}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 14,
              height: 14,
              background: "#f0b429",
            }}
          />
          <div style={{ fontSize: 24, color: "#8ea298" }}>
            Enquiry, conversation, qualified lead
          </div>
        </div>
      </div>
    ),
    size,
  );
}
