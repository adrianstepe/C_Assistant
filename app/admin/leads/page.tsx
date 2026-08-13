import type { Metadata } from "next";
import { ProspectDashboard } from "@/components/admin/ProspectDashboard";
import { todayIso } from "@/lib/date";

export const metadata: Metadata = {
  title: "Prospect tracker",
};

// "Today" is resolved per request so urgency never goes stale in a prerender.
export const dynamic = "force-dynamic";

export default function AdminLeadsPage() {
  return <ProspectDashboard today={todayIso()} />;
}
