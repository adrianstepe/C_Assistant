import type { LeadDraft } from "@/lib/ai/types";
import { leadPayload, leadReference, leadRows } from "@/lib/ai/lead-view";

/**
 * The payoff: what the cleaning company receives.
 *
 * Styled as a CRM record rather than a chat summary, because that is the thing
 * being sold — a lead their team can act on, not a transcript to read.
 *
 * `audience` switches the framing: the public demo shows the *seller's* view
 ("qualified", "ready to quote"), while a hosted capture page shows the same
 * record to the person who just answered the questions, in language that makes
 * sense to them.
 */
export function LeadSummaryCard({
  lead,
  audience = "business",
}: {
  lead: LeadDraft;
  audience?: "business" | "enquirer";
}) {
  const rows = leadRows(lead);
  const reference = leadReference(lead);
  const contact = lead.contact;
  const forEnquirer = audience === "enquirer";

  return (
    <article className="border-hairline overflow-hidden rounded-2xl border bg-white shadow-xl shadow-ink/[0.07]">
      <header className="border-hairline bg-mist/60 flex items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-ink">
            {forEnquirer ? "Your enquiry" : "Qualified enquiry"}
          </h2>
          <p className="text-slate-body mt-0.5 text-xs">
            {reference} ·{" "}
            {forEnquirer
              ? "put together from your answers"
              : "captured from the conversation"}
          </p>
        </div>
        {forEnquirer ? null : (
          <span className="bg-clear-tint text-clear inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
            <span className="bg-clear size-1.5 rounded-full" aria-hidden="true" />
            Ready to quote
          </span>
        )}
      </header>

      <div className="px-5 py-4">
        <dl>
          {rows.map((row) => (
            <div
              key={row.label}
              className="border-hairline/70 animate-field-in flex flex-col gap-0.5 border-t py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <dt className="text-slate-body shrink-0 text-xs font-medium tracking-wide uppercase">
                {row.label}
              </dt>
              <dd className="text-sm font-medium break-words text-ink sm:text-right">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {contact ? (
          <div className="border-hairline mt-4 border-t pt-4">
            <p className="text-slate-body text-xs font-medium tracking-wide uppercase">
              Customer
            </p>
            <p className="mt-1.5 text-sm font-semibold text-ink">{contact.name}</p>
            {contact.company ? (
              <p className="text-slate-body text-sm">{contact.company}</p>
            ) : null}
            <p className="text-sm break-words text-ink">{contact.email}</p>
            {contact.phone ? (
              <p className="text-slate-body text-sm">{contact.phone}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* The structured-data story, shown rather than claimed. Seller-facing
          only: an enquirer has no systems for this to reach. */}
      {forEnquirer ? null : (
        <details className="border-hairline border-t">
          <summary className="text-slate-body hover:text-ink cursor-pointer list-none px-5 py-3 text-xs font-medium select-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink [&::-webkit-details-marker]:hidden">
            View the structured data your systems would receive
          </summary>
          <pre className="bg-ink overflow-x-auto px-5 py-4 text-[0.6875rem] leading-relaxed text-white/85">
            <code>{JSON.stringify(leadPayload(lead), null, 2)}</code>
          </pre>
        </details>
      )}
    </article>
  );
}
