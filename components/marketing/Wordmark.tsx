import Image from "next/image";
import { BRAND } from "@/lib/marketing/brand";
import mark from "./sd-mark.png";

/**
 * Brand mark: the SD monogram, set beside the company name.
 *
 * The mark is a fixed-colour raster, so `onDark` swaps the name's colour and
 * seats the monogram on a paper chip rather than tinting it - an ink mark on an
 * ink ground would simply disappear.
 */
export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={
          onDark
            ? "bg-paper flex h-7 items-center rounded-md px-1.5"
            : "flex h-7 items-center"
        }
      >
        <Image
          src={mark}
          alt=""
          aria-hidden="true"
          priority
          className="h-4 w-auto"
        />
      </span>
      <span
        className={`font-display text-lg font-semibold tracking-tight ${
          onDark ? "text-white" : "text-ink"
        }`}
      >
        {BRAND.name}
      </span>
    </span>
  );
}
