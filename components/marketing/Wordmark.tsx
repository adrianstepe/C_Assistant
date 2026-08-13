import { BRAND } from "@/lib/marketing/brand";

/**
 * Brand mark: an enclosed tick, for "enquiry handled". Deliberately abstract —
 * no robot, no spark, nothing that dates the product to a particular year.
 */
export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          width="28"
          height="28"
          rx="8"
          className={onDark ? "fill-white" : "fill-ink"}
        />
        <path
          d="M8.5 14.5 12.25 18.25 19.5 10.5"
          fill="none"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={onDark ? "stroke-ink" : "stroke-white"}
        />
      </svg>
      <span
        className={`text-[1.0625rem] font-semibold tracking-tight ${
          onDark ? "text-white" : "text-ink"
        }`}
      >
        {BRAND.name}
      </span>
    </span>
  );
}
