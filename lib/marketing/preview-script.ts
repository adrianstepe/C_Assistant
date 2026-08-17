/**
 * The scripted enquiry used by the product preview and the hero lead card.
 *
 * Everything here is illustrative. Telephone numbers come from Ofcom's ranges
 * reserved for drama and fiction (0161 496 0xxx, 07700 900xxx) so no real line
 * can ever be dialled, and the company and domain are invented.
 *
 * Field labels mirror `StructuredEnquiry` in `types/enquiry.ts` so the marketing
 * story and the eventual data model stay in step.
 */

/**
 * The fictional cleaning company whose enquiries these are.
 *
 * Matches the demo at `/demo`, so a visitor who reads the preview and then
 * plays the demo meets one invented firm rather than two. In real use this is
 * the customer's own name, which is why the transcript is labelled with a
 * company rather than with a role: that is how the conversation would actually
 * appear to the person enquiring.
 */
export const PREVIEW_COMPANY = "Meridian Cleaning";

export interface PreviewMessage {
  role: "customer" | "assistant";
  text: string;
}

export interface ExtractedField {
  label: string;
  value: string;
}

export interface PreviewStep {
  message: PreviewMessage;
  /** Fields the assistant can fill in once this message has landed. */
  fields?: readonly ExtractedField[];
}

export const PREVIEW_STEPS: readonly PreviewStep[] = [
  {
    message: {
      role: "customer",
      text: "Hi, do you cover office cleaning in Manchester? We’ve got roughly 1,500 sq ft and need a price.",
    },
    fields: [
      { label: "Service", value: "Office cleaning" },
      { label: "Location", value: "Manchester" },
      { label: "Floor area", value: "~1,500 sq ft" },
    ],
  },
  {
    message: {
      role: "assistant",
      text: "Yes, we cover Greater Manchester. Is this a regular contract or a one-off clean?",
    },
  },
  {
    message: {
      role: "customer",
      text: "Regular: three evenings a week if you can do it.",
    },
    fields: [{ label: "Frequency", value: "3 evenings per week" }],
  },
  {
    message: {
      role: "assistant",
      text: "We can. What time can our team get in, and how would they access the building?",
    },
  },
  {
    message: {
      role: "customer",
      text: "Any time after 6pm. We’d give you a fob. There are two washrooms and a small kitchen as well.",
    },
    fields: [
      { label: "Access", value: "After 18:00, fob provided" },
      { label: "Also included", value: "2 washrooms, kitchen" },
    ],
  },
  {
    message: {
      role: "assistant",
      text: "Noted. When would you like to start, and who should the quote go to?",
    },
  },
  {
    message: {
      role: "customer",
      text: "Start of next month ideally. Sarah Whitfield, s.whitfield@harburyoffices.co.uk, 0161 496 0142.",
    },
    fields: [
      { label: "Start date", value: "1 September" },
      { label: "Contact", value: "Sarah Whitfield" },
      { label: "Email", value: "s.whitfield@harburyoffices.co.uk" },
      { label: "Phone", value: "0161 496 0142" },
    ],
  },
  {
    message: {
      role: "assistant",
      text: "Thanks Sarah. That’s everything the team needs. They’ll come back to you with a price.",
    },
  },
];

/** Milliseconds each step stays on screen before the next one lands. */
export const STEP_DURATION_MS = 2100;

/** Longer beat on the completed conversation before it loops. */
export const LOOP_PAUSE_MS = 4200;

/** The finished article, shown in the hero as the thing you actually receive. */
export const HERO_LEAD = {
  reference: "ENQ-2481",
  receivedAt: "Received 16:50, Friday",
  company: "Harbury Offices Ltd",
  contact: "Sarah Whitfield",
  fields: [
    { label: "Service", value: "Office cleaning" },
    { label: "Site", value: "Manchester · ~1,500 sq ft" },
    { label: "Frequency", value: "3 evenings per week" },
    { label: "Access", value: "After 18:00, fob provided" },
    { label: "Start date", value: "1 September" },
  ],
} as const;
