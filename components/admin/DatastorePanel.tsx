import type { CustomerRow, LeadRow } from "@/lib/db/store";
import { setTenantEnabledAction } from "@/app/admin/leads/actions";

/**
 * View over the datastore: stored customers and recent rows from the `leads`
 * table.
 *
 * A server component with no client-side state. It was strictly read-only
 * until provisioning-v1; it now carries exactly ONE deliberate write control —
 * Pause / Re-enable per tenant — because automatic enablement on verified
 * payment removed the human look that used to happen before launch, and a
 * compensating control has to live somewhere better than a psql prompt.
 * Everything else stays read-only: editing still happens in the database or
 * the onboarding flow, never here. The CSV prospect tracker below it remains
 * its own tool; this sits alongside rather than replacing it.
 */

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function formatWhen(at: Date): string {
  return `${DATE_FORMAT.format(at)} UTC`;
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "sent" || status === "recorded"
      ? "bg-clear-tint text-clear"
      : status === "failed" || status === "undeliverable"
        ? "bg-fault-tint text-fault"
        : "bg-mist text-slate-body";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium ${tone}`}
    >
      {status}
    </span>
  );
}

export function DatastorePanel({
  customers,
  leads,
}: {
  customers: CustomerRow[];
  leads: LeadRow[];
}) {
  return (
    <section aria-labelledby="datastore-panel-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="datastore-panel-heading" className="text-lg font-semibold tracking-tight">
          Stored records
        </h2>
        <p className="text-muted mt-0.5 text-sm">
          Read straight from the datastore behind{" "}
          <code className="font-mono text-xs">LEADS_DATABASE_URL</code>. Newest
          first. Tenants can be paused or re-enabled; everything else is
          read-only.
        </p>
      </div>

      <div className="border-border overflow-x-auto rounded-lg border bg-white">
        <h3 className="border-border px-4 py-3 text-sm font-semibold">
          Customers ({customers.length})
        </h3>
        {customers.length === 0 ? (
          <p className="text-muted border-t px-4 py-4 text-sm">
            No customer rows yet. One appears here when a setup submission is
            accepted or a tenant is added by hand.
          </p>
        ) : (
          <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
            <thead>
              <tr className="text-muted border-b text-xs tracking-wide uppercase">
                <th className="px-4 py-2 font-medium">Slug</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Enquiries to</th>
                <th className="px-4 py-2 font-medium">Live</th>
                <th className="px-4 py-2 font-medium">Added</th>
                <th className="px-4 py-2 font-medium">Control</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.slug} className="border-b last:border-b-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{customer.slug}</td>
                  <td className="px-4 py-2.5">{customer.companyName}</td>
                  <td className="px-4 py-2.5 break-all">{customer.leadRecipientEmail}</td>
                  <td className="px-4 py-2.5">
                    {customer.enabled ? (
                      <span className="font-medium text-emerald-700">yes</span>
                    ) : (
                      <span className="text-muted">no</span>
                    )}
                  </td>
                  <td className="text-muted px-4 py-2.5 text-xs whitespace-nowrap">
                    {formatWhen(customer.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    {/* The one write control on this panel. Pausing a live
                        tenant takes its capture page dark immediately; the
                        action writes an audit row into the events table
                        below. */}
                    <form action={setTenantEnabledAction}>
                      <input type="hidden" name="slug" value={customer.slug} />
                      <input
                        type="hidden"
                        name="intent"
                        value={customer.enabled ? "pause" : "resume"}
                      />
                      <button
                        type="submit"
                        className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium ${
                          customer.enabled
                            ? "border-fault-tint text-fault hover:bg-fault-tint/40"
                            : "border-clear-tint text-clear hover:bg-clear-tint/40"
                        }`}
                      >
                        {customer.enabled ? "Pause" : "Re-enable"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-border overflow-x-auto rounded-lg border bg-white">
        <h3 className="border-border px-4 py-3 text-sm font-semibold">
          Recent events ({leads.length})
        </h3>
        {leads.length === 0 ? (
          <p className="text-muted border-t px-4 py-4 text-sm">
            Nothing stored yet. Confirmed Stripe events land here once{" "}
            <code className="font-mono text-xs">LEADS_DATABASE_URL</code> is set;
            each event id is stored once even if Stripe redelivers it.
          </p>
        ) : (
          <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
            <thead>
              <tr className="text-muted border-b text-xs tracking-wide uppercase">
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Kind</th>
                <th className="px-4 py-2 font-medium">Summary</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Event id</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-b-0">
                  <td className="text-muted px-4 py-2.5 text-xs whitespace-nowrap">
                    {formatWhen(lead.receivedAt)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{lead.kind}</td>
                  <td className="max-w-[22rem] px-4 py-2.5">
                    {lead.summary ?? <span className="text-muted">(no summary)</span>}
                    {lead.contactEmail ? (
                      <span className="text-muted block text-xs break-all">
                        {lead.contactEmail}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={lead.status} />
                  </td>
                  <td className="text-muted max-w-[12rem] truncate px-4 py-2.5 font-mono text-xs">
                    {lead.eventId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
