import type { Metadata } from "next";
import { ProspectDashboard } from "@/components/admin/ProspectDashboard";
import { todayIso } from "@/lib/date";
import { loadProspectsFromFile } from "@/lib/prospects/source";

export const metadata: Metadata = {
  title: "Prospect tracker",
};

// "Today" is resolved per request so urgency never goes stale in a prerender,
// and the CSV is re-read on each load so editing the file is enough to see the
// change.
export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const today = todayIso();
  const { prospects, errors } = await loadProspectsFromFile(today);

  return (
    <ProspectDashboard
      today={today}
      initialProspects={prospects}
      loadErrors={errors}
    />
  );
}
