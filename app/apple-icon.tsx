import { ImageResponse } from "next/og";
import { BRAND_COLORS, MarkTiles } from "@/lib/marketing/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Home-screen icon. Same mark, more breathing room, no rounding: iOS applies
 * its own mask and a corner radius baked in here would show through it.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_COLORS.ink,
        }}
      >
        <MarkTiles size={104} gap={10} tint={BRAND_COLORS.paper} />
      </div>
    ),
    size,
  );
}
