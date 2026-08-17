import { ImageResponse } from "next/og";
import { BRAND_COLORS, MarkTiles } from "@/lib/marketing/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/**
 * Favicon, generated at build time from the same four-square mark as the
 * wordmark. No raster asset to keep in sync, and no network fetch during the
 * build.
 *
 * Ink ground rather than paper: at 16px in a browser tab the mark needs the
 * contrast, and the amber square has to stay visible against whatever chrome
 * the tab strip is using.
 */
export default function Icon() {
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
        <MarkTiles size={40} gap={4} tint={BRAND_COLORS.paper} />
      </div>
    ),
    size,
  );
}
