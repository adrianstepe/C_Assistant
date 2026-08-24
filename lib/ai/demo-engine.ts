import type {
  AssistantProvider,
  AssistantReply,
  ContactDetails,
  LeadDraft,
  RespondInput,
  SlotId,
  SlotValue,
} from "./types";
import { EMPTY_LEAD, SLOT_ORDER } from "./types";
import {
  extractAll,
  isEchoable,
  isValidEmail,
  isValidName,
  parseSlot,
} from "./extract";

/**
 * Deterministic quote assistant used by the public demo and, since phase 2 of
 * the fulfilment plan, by per-tenant hosted capture pages.
 *
 * It implements `AssistantProvider`, so replacing it with a real LLM is a
 * matter of writing another implementation and changing one line in
 * `provider.ts`. No component imports this file directly.
 *
 * Design rules that keep the demo convincing:
 * - Never ask something already known. Every message is run through the full
 *   extractor, so an opening line can answer three questions at once.
 * - Never get stuck. The slot under discussion is always filled from the
 *   customer's reply, however odd that reply is.
 * - Never ask more than one thing at a time, except for contact details, which
 *   arrive together on a small form.
 *
 * PHASE 2 SCOPE NOTE. Hosted tenant pages pass a `companyName` so the greeting
 * names the right cleaning company. That is the entire extent of this file's
 * configuration surface, deliberately: the slot order, the wording templates,
 * the never-quote-a-price boundary and the state machine are shared with the
 * public demo and do not vary per tenant.
 */

/** The fictional cleaning company the public demo answers on behalf of. */
export const DEMO_COMPANY = "Meridian Cleaning";

interface SlotSpec {
  question: string;
  suggestions: readonly string[];
  /** Short confirmation of what was understood. */
  ack: (value: SlotValue) => string;
}

/** How *this* engine asks. Card labels live in `types.ts`. */
const SLOT_SPECS: Record<SlotId, SlotSpec> = {
  propertyType: {
    question: "What kind of premises is it?",
    suggestions: ["An office", "Retail unit", "Warehouse", "Communal areas"],
    ack: (v) => v.display.toLowerCase(),
  },
  location: {
    question: "Which town or city is it in?",
    suggestions: ["Manchester", "Birmingham", "Leeds", "London"],
    ack: (v) => `in ${v.display}`,
  },
  size: {
    question: "Roughly how big is the space?",
    suggestions: ["About 1,500 sq ft", "Around 3,000 sq ft", "Over 5,000 sq ft", "Not sure"],
    ack: (v) => v.display.toLowerCase(),
  },
  frequency: {
    question: "How often would you like it cleaned?",
    suggestions: ["3 times a week", "5 days a week", "Once a week", "One-off clean"],
    ack: (v) => v.display.toLowerCase(),
  },
  preferredTime: {
    question: "When suits for the cleaning team to come in?",
    suggestions: ["Evenings", "Early mornings", "Weekends", "Flexible"],
    ack: (v) => v.display.toLowerCase(),
  },
  currentSituation: {
    question: "Do you have cleaners in at the moment?",
    suggestions: ["No, not currently", "Yes, another company", "We clean in-house"],
    ack: (v) => v.display.toLowerCase(),
  },
  requirements: {
    question: "Anything specific the team should know about?",
    suggestions: [
      "Just general cleaning",
      "Washrooms and kitchen",
      "Windows included",
      "Waste removal",
    ],
    ack: (v) => v.display.toLowerCase(),
  },
};

const CONTACT_QUESTION =
  "Last thing, who should the quote go to? I'll pass this straight to the team.";

/** First slot still missing; also tells us what the previous turn asked. */
function nextSlot(lead: LeadDraft): SlotId | null {
  return SLOT_ORDER.find((slot) => !lead.slots[slot]) ?? null;
}

/** Drops repeats, case-insensitively, keeping the first of each. */
function dedupe(): (part: string) => boolean {
  const seen = new Set<string>();
  return (part) => {
    const key = part.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
}

/** Builds "Got it, commercial office in Manchester." from what just landed. */
function acknowledge(filled: readonly SlotId[], lead: LeadDraft): string {
  const parts = filled
    .map((slot) => {
      const value = lead.slots[slot];
      // Only repeat back what was actually recognised.
      return value && isEchoable(value) ? SLOT_SPECS[slot].ack(value) : null;
    })
    .filter((part): part is string => part !== null)
    // One reply can legitimately fill two slots with the same words -
    // "evenings" is read as both a frequency and a preferred time - and
    // acknowledging each of them produced "Got it, evenings, evenings."
    .filter(dedupe())
    .slice(0, 2);

  if (parts.length === 0) return "Thanks.";
  return `Got it, ${parts.join(", ")}.`;
}

/** A touch of latency so the typing indicator reads as real work. */
function thinkingTime(text: string): number {
  return 550 + Math.min(text.length * 7, 450);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyMessage(
  lead: LeadDraft,
  message: string,
): { lead: LeadDraft; filled: SlotId[] } {
  const asked = nextSlot(lead);
  const slots: Partial<Record<SlotId, SlotValue>> = { ...lead.slots };
  const filled: SlotId[] = [];

  // Opportunistic: anything recognisable anywhere in the message.
  for (const [slot, value] of Object.entries(extractAll(message)) as [
    SlotId,
    SlotValue,
  ][]) {
    if (!slots[slot]) {
      slots[slot] = value;
      filled.push(slot);
    }
  }

  // Targeted: whatever we actually asked about must end up answered, so the
  // conversation can never stall on a reply we did not understand.
  if (asked && !slots[asked]) {
    const parsed = parseSlot(asked, message);

    // ...but not by filing the answer to a *different* question under this
    // one. Asked for a town and told "5000 sq ft", the size parser claimed it
    // and the location fallback echoed the same text, so the card read
    // "Location: 5000 sq ft" and the town was never asked for again.
    //
    // `code === undefined` is exactly the bare-echo fallback: every parser that
    // recognises something sets a code, `size` returns "unknown" rather than
    // record nonsense as a floor area, and `propertyType` returns "other" while
    // keeping the customer's own words - which is what we want for premises
    // there is no pattern for.
    const echoedWithoutUnderstanding = parsed.code === undefined;
    const answeredADifferentQuestion = filled.length > 0;

    slots[asked] =
      echoedWithoutUnderstanding && answeredADifferentQuestion
        ? { display: "To be confirmed", code: "unknown" }
        : parsed;
    filled.push(asked);
  }

  // Keep acknowledgement order matching the question order.
  filled.sort((a, b) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b));
  return { lead: { ...lead, slots }, filled };
}

function askFor(slot: SlotId, lead: LeadDraft, prefix: string): AssistantReply {
  const spec = SLOT_SPECS[slot];
  return {
    messages: [`${prefix} ${spec.question}`.trim()],
    suggestions: [...spec.suggestions],
    inputMode: "text",
    lead,
    complete: false,
  };
}

function askForContact(lead: LeadDraft, prefix: string): AssistantReply {
  return {
    messages: [`${prefix} ${CONTACT_QUESTION}`.trim()],
    suggestions: [],
    inputMode: "contact",
    lead,
    complete: false,
  };
}

function completionReply(lead: LeadDraft): AssistantReply {
  const firstName = lead.contact?.name.trim().split(/\s+/)[0] ?? "";
  const greeting = firstName ? `Thanks, ${firstName}.` : "Thanks.";
  return {
    messages: [
      `${greeting} I've collected everything needed for the team to prepare your quote.`,
    ],
    suggestions: [],
    inputMode: "none",
    lead,
    complete: true,
  };
}

export interface DemoEngineOptions {
  /** Set to 0 in tests to remove the simulated round trip. */
  latency?: boolean;
  /**
   * Who the assistant is answering on behalf of. Defaults to the fictional
   * public-demo company; hosted tenant pages pass their own name.
   */
  companyName?: string;
}

export function createDemoEngine(
  options: DemoEngineOptions = {},
): AssistantProvider {
  const useLatency = options.latency ?? true;
  const company = options.companyName ?? DEMO_COMPANY;

  return {
    id: "demo-local",

    greeting(): AssistantReply {
      return {
        messages: [
          `Hi, thanks for getting in touch with ${company}. Tell me what you need cleaned and I'll put together everything the team needs to price it.`,
        ],
        suggestions: [
          "I need office cleaning in Manchester",
          "Cleaning for a retail unit in Leeds",
          "Communal areas for a block of flats",
        ],
        inputMode: "text",
        lead: EMPTY_LEAD,
        complete: false,
      };
    },

    async respond(input: RespondInput): Promise<AssistantReply> {
      const { lead, message, contact } = input;

      if (useLatency) await delay(thinkingTime(message ?? contact?.name ?? ""));

      if (contact) return handleContact(lead, contact);

      const text = (message ?? "").trim();
      if (text === "") {
        // Defensive: the UI blocks this, but a provider must not assume so.
        const slot = nextSlot(lead);
        return slot
          ? askFor(slot, lead, "Sorry, I missed that.")
          : askForContact(lead, "Sorry, I missed that.");
      }

      const { lead: updated, filled } = applyMessage(lead, text);
      const prefix = acknowledge(filled, updated);
      const slot = nextSlot(updated);

      if (slot) return askFor(slot, updated, prefix);
      if (!updated.contact) return askForContact(updated, prefix);
      return completionReply(updated);
    },
  };
}

function handleContact(lead: LeadDraft, contact: ContactDetails): AssistantReply {
  if (!isValidName(contact.name) || !isValidEmail(contact.email)) {
    return {
      messages: [
        "I couldn't read those details. Could you check the name and email and try once more?",
      ],
      suggestions: [],
      inputMode: "contact",
      lead,
      complete: false,
      validationError: "Enter a name and a valid email address.",
    };
  }

  const cleaned: ContactDetails = {
    name: contact.name.trim(),
    email: contact.email.trim(),
    ...(contact.company?.trim() ? { company: contact.company.trim() } : {}),
    ...(contact.phone?.trim() ? { phone: contact.phone.trim() } : {}),
  };

  return completionReply({ ...lead, contact: cleaned });
}
