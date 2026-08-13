import type { ReactNode } from "react";

/** One horizontal rhythm for the whole site. */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export const buttonBase =
  `inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${focusRing}`;

export const primaryButton = `${buttonBase} bg-brand text-white shadow-sm hover:bg-brand-dark`;

export const secondaryButton = `${buttonBase} border border-hairline bg-white text-ink hover:bg-mist`;

/** Compact variant for the header, where 44px height is the target. */
export const primaryButtonSm = `inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark ${focusRing}`;

/** Secondary action sitting on one of the dark sections. */
export const ghostButtonOnDark = `${buttonBase} border border-white/25 text-white hover:bg-white/10 focus-visible:outline-white`;

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  lead?: string;
  /** Inverts the colours for use on the ink-coloured sections. */
  onDark?: boolean;
  align?: "left" | "center";
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  onDark = false,
  align = "left",
}: SectionHeadingProps) {
  return (
    <div
      className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      <p
        className={`text-xs font-semibold tracking-[0.14em] uppercase ${
          onDark ? "text-brand-tint/80" : "text-brand"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl ${
          onDark ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {lead ? (
        <p
          className={`mt-4 text-base leading-relaxed text-pretty sm:text-lg ${
            onDark ? "text-white/70" : "text-slate-body"
          }`}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}
