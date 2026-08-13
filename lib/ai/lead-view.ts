import type { LeadDraft } from "./types";
import { SLOT_LABELS, SLOT_ORDER } from "./types";

/**
 * Turns a `LeadDraft` into the rows and payload the UI renders.
 *
 * Kept out of the components so the lead card has no logic in it, and so the
 * shape shown to a prospect matches the shape a real integration would send.
 */

export interface LeadRow {
  label: string;
  value: string;
  /** Present when the answer was recognised rather than taken as free text. */
  code?: string;
}

/** Collected slots, in question order. Missing ones are simply absent. */
export function leadRows(lead: LeadDraft): LeadRow[] {
  return SLOT_ORDER.flatMap((slot) => {
    const value = lead.slots[slot];
    if (!value) return [];
    return [
      {
        label: SLOT_LABELS[slot],
        value: value.display,
        ...(value.code ? { code: value.code } : {}),
      },
    ];
  });
}

/**
 * Stable reference derived from the lead's own content, so it survives a
 * re-render and never differs between server and client.
 */
export function leadReference(lead: LeadDraft): string {
  const seed = [
    lead.contact?.email ?? "",
    ...SLOT_ORDER.map((slot) => lead.slots[slot]?.display ?? ""),
  ].join("|");

  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000;
  }
  return `ENQ-${String(hash).padStart(5, "0")}`;
}

/** The JSON an integration would receive. Shown in the demo to make it real. */
export function leadPayload(lead: LeadDraft): Record<string, unknown> {
  const slots: Record<string, { value: string; code?: string }> = {};
  for (const slot of SLOT_ORDER) {
    const value = lead.slots[slot];
    if (value) {
      slots[slot] = value.code
        ? { value: value.display, code: value.code }
        : { value: value.display };
    }
  }

  return {
    reference: leadReference(lead),
    source: "website_quote_assistant",
    enquiry: slots,
    contact: lead.contact ?? null,
  };
}
