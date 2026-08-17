import { BRAND } from "@/lib/marketing/brand";

/**
 * Brand mark: four squares, the last one filled.
 *
 * The whole product is "an enquiry arrives incomplete and leaves complete", so
 * the mark is a four-field docket with the last field answered. It reuses the
 * geometry already on the page: the same square as the amber eyebrow bullet,
 * on the same right-angled grid as the hero backdrop.
 *
 * Drawn inline rather than imported as a raster. The old SD monogram was a
 * fixed-colour PNG, which meant `onDark` could not tint it and had to seat it
 * on a paper-coloured chip instead. Three of these squares are `currentColor`,
 * so the mark now simply inherits, and `onDark` is a colour swap on one
 * element. It also stays sharp at favicon size, where the raster did not.
 */
export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${
        onDark ? "text-white" : "text-ink"
      }`}
    >
      <BrandMark className="size-[1.15rem] shrink-0" />
      <span className="font-display text-lg font-semibold tracking-tight">
        {BRAND.name}
      </span>
    </span>
  );
}

/**
 * The mark on its own, for places with no room for the name.
 *
 * Three squares inherit `currentColor`; the fourth is always caution amber, so
 * the mark reads the same on paper and on ink without a second asset.
 *
 * Decorative by default: beside the wordmark the name is already the label,
 * and announcing both makes a screen reader say it twice. Pass `label` only
 * where the mark stands alone.
 */
export function BrandMark({
  className = "",
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
    >
      <rect x="2" y="2" width="9" height="9" fill="currentColor" />
      <rect x="13" y="2" width="9" height="9" fill="currentColor" />
      <rect x="2" y="13" width="9" height="9" fill="currentColor" />
      <rect x="13" y="13" width="9" height="9" className="fill-brand" />
    </svg>
  );
}
