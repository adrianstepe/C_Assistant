import type { LeadDraft } from "@/lib/ai/types";
import { leadRows } from "@/lib/ai/lead-view";

/**
 * Live view of what the assistant has understood so far.
 *
 * Desktop only — on a phone the progress bar carries this job, and a
 * second growing list would push the conversation off screen.
 */
export function CollectedPanel({ lead }: { lead: LeadDraft }) {
  const rows = leadRows(lead);

  return (
    <div className="border-hairline rounded-xl border bg-white p-5">
      <h2 className="text-xs font-semibold tracking-[0.12em] text-ink uppercase">
        Captured so far
      </h2>

      {rows.length === 0 ? (
        <p className="text-slate-body mt-3 text-sm leading-relaxed">
          Nothing yet. As the customer answers, the details a quote depends on
          appear here.
        </p>
      ) : (
        <dl className="mt-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="border-hairline/70 animate-field-in border-t py-2.5 first:border-t-0 first:pt-0"
            >
              <dt className="text-slate-body text-[0.6875rem] font-medium tracking-wide uppercase">
                {row.label}
              </dt>
              <dd className="mt-0.5 text-sm font-medium break-words text-ink">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {lead.contact ? (
        <div className="border-hairline mt-3 border-t pt-3">
          <p className="text-slate-body text-[0.6875rem] font-medium tracking-wide uppercase">
            Contact
          </p>
          <p className="mt-0.5 text-sm font-medium text-ink">
            {lead.contact.name}
          </p>
        </div>
      ) : null}
    </div>
  );
}
