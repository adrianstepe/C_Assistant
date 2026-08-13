/**
 * Analytics seam.
 *
 * No vendor is wired up. Events are typed here and logged locally in
 * development so call sites can be added and verified now; introducing a real
 * provider later means editing `emit` and nothing else.
 */

export type AnalyticsEvent =
  | { name: "demo_started"; properties: { provider: string } }
  | {
      name: "demo_completed";
      properties: { provider: string; messageCount: number; durationMs: number };
    }
  | { name: "lead_submitted"; properties: { hasPhone: boolean; hasCompany: boolean } }
  | { name: "cta_clicked"; properties: { id: string; location: string } }
  | { name: "checkout_started"; properties: { mode: string } }
  | { name: "checkout_cancelled"; properties: Record<string, never> }
  | { name: "onboarding_submitted"; properties: { hasWebsite: boolean } }
  | { name: "demo_restarted"; properties: Record<string, never> }
  | { name: "lead_viewed"; properties: { leadId: string } };

export type AnalyticsEventName = AnalyticsEvent["name"];

/** Recent events, useful when checking instrumentation by hand. */
const recent: { event: AnalyticsEvent; at: number }[] = [];
const MAX_RECENT = 50;

function emit(event: AnalyticsEvent): void {
  recent.push({ event, at: Date.now() });
  if (recent.length > MAX_RECENT) recent.shift();

  if (process.env.NODE_ENV === "development") {
    // Deliberate local-only sink until a provider is chosen.
    console.info("[analytics]", event.name, event.properties);
  }
}

export function track(event: AnalyticsEvent): void {
  try {
    emit(event);
  } catch {
    // Instrumentation must never break the page it is measuring.
  }
}

/** Read-only view of the buffer, for debugging in the console. */
export function recentEvents(): readonly { event: AnalyticsEvent; at: number }[] {
  return recent;
}
