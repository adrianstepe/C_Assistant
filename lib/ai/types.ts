/**
 * Provider-agnostic contract for the quote assistant.
 *
 * The UI talks only to `AssistantProvider`. Swapping the deterministic demo
 * engine for a real LLM means writing a second implementation of this
 * interface — no component changes. `respond` is async precisely so that a
 * network-backed provider behaves the same as the local one.
 */

/** The pieces of information a quote depends on. */
export type SlotId =
  | "propertyType"
  | "location"
  | "size"
  | "frequency"
  | "preferredTime"
  | "currentSituation"
  | "requirements";

/** Order the assistant works through, when nothing is known yet. */
export const SLOT_ORDER: readonly SlotId[] = [
  "propertyType",
  "location",
  "size",
  "frequency",
  "preferredTime",
  "currentSituation",
  "requirements",
];

/**
 * Labels for the lead card. Provider-agnostic on purpose: the wording a given
 * engine uses to *ask* is its own business, but what a lead is *called* is not.
 */
export const SLOT_LABELS: Record<SlotId, string> = {
  propertyType: "Property",
  location: "Location",
  size: "Size",
  frequency: "Frequency",
  preferredTime: "Preferred time",
  currentSituation: "Current cleaning",
  requirements: "Requirements",
};

export interface SlotValue {
  /** Tidied text shown on the lead card. */
  display: string;
  /**
   * Canonical value when the answer was recognised. This is what a CRM or
   * pricing rule would key off; free text keeps `code` undefined.
   */
  code?: string;
}

export interface ContactDetails {
  name: string;
  company?: string;
  email: string;
  phone?: string;
}

export interface LeadDraft {
  slots: Partial<Record<SlotId, SlotValue>>;
  contact?: ContactDetails;
}

export const EMPTY_LEAD: LeadDraft = { slots: {} };

export type ChatRole = "assistant" | "customer";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

/** What the composer should present next. */
export type InputMode = "text" | "contact" | "none";

export interface AssistantReply {
  /** Assistant text. One bubble per entry; usually a single short one. */
  messages: string[];
  /** Tappable suggested answers. Empty when free text is expected. */
  suggestions: string[];
  inputMode: InputMode;
  /** The lead after applying whatever this turn understood. */
  lead: LeadDraft;
  /** True once nothing further is needed. */
  complete: boolean;
  /**
   * Set when the previous input could not be used (a malformed email, say).
   * The UI surfaces this without treating it as a failure.
   */
  validationError?: string;
}

export interface RespondInput {
  lead: LeadDraft;
  history: readonly ChatMessage[];
  /** Free text the customer typed. */
  message?: string;
  /** Structured submission from the inline contact card. */
  contact?: ContactDetails;
}

export interface AssistantProvider {
  /** Identifies the implementation in analytics and debugging. */
  readonly id: string;
  /** Opening message. Synchronous so the first paint needs no round trip. */
  greeting(): AssistantReply;
  respond(input: RespondInput): Promise<AssistantReply>;
}

/** How far through the required information the conversation is. */
export interface CollectionProgress {
  collected: number;
  total: number;
  /** 0–1, for the progress meter. */
  ratio: number;
}

/** Required slots plus the contact card. */
export function computeProgress(lead: LeadDraft): CollectionProgress {
  const total = SLOT_ORDER.length + 1;
  const filledSlots = SLOT_ORDER.filter((slot) => lead.slots[slot]).length;
  const collected = filledSlots + (lead.contact ? 1 : 0);
  return { collected, total, ratio: collected / total };
}
