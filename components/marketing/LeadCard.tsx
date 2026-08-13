import { HERO_LEAD } from "@/lib/marketing/preview-script";

/**
 * The hero's visual: the artefact the cleaning company actually receives.
 *
 * The content stays readable to assistive tech as a definition list; only the
 * decorative action buttons are hidden, since they are imagery rather than
 * controls and must not read as interactive.
 */
export function LeadCard() {
  return (
    <div className="relative">
      {/* Suggestion of a duplicate pad behind, without tilting anything. */}
      <div
        aria-hidden="true"
        className="border-hairline absolute -top-3 right-3 left-3 h-full rounded-lg border bg-white/60"
      />
      <div
        aria-hidden="true"
        className="border-hairline absolute -top-1.5 right-1.5 left-1.5 h-full rounded-lg border bg-white/80"
      />

      <article className="border-hairline relative rounded-lg border bg-white shadow-xl shadow-ink/[0.07]">
        {/* A tear-line, as if this docket had been pulled from the pad. */}
        <div aria-hidden="true" className="docket-tear h-2.5" />

        <header className="border-hairline flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">
              New qualified lead
            </h3>
            <p className="text-slate-body mt-0.5 font-mono text-xs">
              {HERO_LEAD.reference} · {HERO_LEAD.receivedAt}
            </p>
          </div>
          <span className="bg-clear-tint text-clear inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-xs font-semibold">
            <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M2 6.5 4.75 9.25 10 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Qualified
          </span>
        </header>

        <div className="px-5 py-4">
          <p className="text-base font-semibold text-ink">
            {HERO_LEAD.company}
          </p>
          <p className="text-slate-body text-sm">{HERO_LEAD.contact}</p>

          <dl className="mt-4 space-y-0">
            {HERO_LEAD.fields.map((field) => (
              <div
                key={field.label}
                className="border-hairline/70 flex items-baseline justify-between gap-4 border-t py-2.5 first:border-t-0 first:pt-0"
              >
                <dt className="text-slate-body shrink-0 font-mono text-xs tracking-wide uppercase">
                  {field.label}
                </dt>
                <dd className="text-right text-sm font-medium text-ink">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div
          aria-hidden="true"
          className="border-hairline flex gap-2 border-t px-5 py-3.5"
        >
          <span className="bg-brand flex-1 rounded-md px-3 py-2 text-center text-xs font-semibold text-ink">
            Send quote
          </span>
          <span className="border-hairline text-slate-body flex-1 rounded-md border px-3 py-2 text-center text-xs font-semibold">
            Read conversation
          </span>
        </div>
      </article>
    </div>
  );
}
