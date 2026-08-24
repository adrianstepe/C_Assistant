import type { Metadata } from "next";
import { ProspectDashboard } from "@/components/admin/ProspectDashboard";
import { DatastorePanel } from "@/components/admin/DatastorePanel";
import { todayIso } from "@/lib/date";
import { loadProspectsFromFile } from "@/lib/prospects/source";
import { readLeadsDatabaseConfig } from "@/lib/db/config";
import { getLeadsDatabase } from "@/lib/db/client";
import { ensureSchema, listCustomers, listRecentLeads } from "@/lib/db/store";

export const metadata: Metadata = {
  title: "Prospect tracker",
};

// "Today" is resolved per request so urgency never goes stale in a prerender,
// and the CSV is re-read on each load so editing the file is enough to see the
// change.
export const dynamic = "force-dynamic";

/**
 * The datastore panel is read best-effort: if the database is configured but
 * unreachable, this page still renders the prospect tracker and says what went
 * wrong rather than failing wholesale. An admin tool that dies with its
 * slowest data source hides everything behind one outage.
 */
async function loadStoredRecords(): Promise<
  | { state: "unconfigured" }
  | { state: "ready"; customers: Awaited<ReturnType<typeof listCustomers>>; leads: Awaited<ReturnType<typeof listRecentLeads>> }
  | { state: "error"; message: string }
> {
  const config = readLeadsDatabaseConfig();
  if (!config) return { state: "unconfigured" };

  try {
    const sql = getLeadsDatabase(config);
    await ensureSchema(sql);
    const [customers, leads] = await Promise.all([
      listCustomers(sql),
      listRecentLeads(sql),
    ]);
    return { state: "ready", customers, leads };
  } catch (error) {
    console.error("[admin] datastore panel could not be loaded:", error);
    return {
      state: "error",
      message: error instanceof Error ? error.message : "Unknown database error.",
    };
  }
}

export default async function AdminLeadsPage() {
  const today = todayIso();
  const { prospects, errors } = await loadProspectsFromFile(today);
  const stored = await loadStoredRecords();

  return (
    <div className="flex flex-col gap-8">
      {stored.state === "ready" ? (
        <DatastorePanel customers={stored.customers} leads={stored.leads} />
      ) : stored.state === "error" ? (
        <div className="border-fault-tint bg-fault-tint rounded-lg border px-4 py-3 text-sm">
          <p className="font-medium">The datastore could not be reached.</p>
          <p className="text-slate-body mt-1 break-all">{stored.message}</p>
          <p className="text-slate-body mt-1">
            Stripe events keep being recorded to the log; anything Stripe could
            not store is retried by Stripe itself.
          </p>
        </div>
      ) : (
        <div className="border-hairline bg-mist rounded-lg border px-4 py-3 text-sm">
          <p className="font-medium text-ink">No datastore configured.</p>
          <p className="text-slate-body mt-1">
            Billing events are recorded to the server log only. Set{" "}
            <code className="font-mono text-xs">LEADS_DATABASE_URL</code> to make
            them durable and visible here.
          </p>
        </div>
      )}

      <ProspectDashboard
        today={today}
        initialProspects={prospects}
        loadErrors={errors}
      />
    </div>
  );
}
