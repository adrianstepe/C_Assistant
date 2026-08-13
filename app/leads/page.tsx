import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lead inbox",
};

/**
 * Internal view where a cleaning company's owner/staff read qualified leads.
 *
 * Placeholder only. Access control, persistence and the lead list are not
 * implemented yet — see `lib/leads/` and `components/leads/`.
 */
export default function LeadsPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Lead inbox</h1>
      <p className="text-muted mt-3 text-base">Not implemented yet.</p>
    </main>
  );
}
