import { BRAND } from "@/lib/marketing/brand";

/**
 * Brand mark: a facilities tag - the punched-hole ticket clipped to a
 * completed job or a tested appliance, ticked off. Grounded in the trade
 * rather than abstract: no robot, no spark, nothing that dates the product.
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
          rx="7"
          className={onDark ? "fill-white" : "fill-ink"}
        />
        <circle
          cx="8"
          cy="8"
          r="2.1"
          fill="none"
          strokeWidth="1.6"
          className={onDark ? "stroke-ink" : "stroke-brand"}
        />
        <path
          d="M9.5 17.5 13.25 21.25 21 12"
          fill="none"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={onDark ? "stroke-ink" : "stroke-brand"}
        />
      </svg>
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
