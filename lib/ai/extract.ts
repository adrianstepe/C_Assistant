import type { SlotId, SlotValue } from "./types";

/**
 * Deterministic parsing of customer free text into lead slots.
 *
 * This is the part a real LLM would replace. Keeping it isolated means the
 * conversation flow, the UI and the lead model stay unchanged when it goes.
 *
 * Two entry points:
 * - `extractAll` runs every parser over a message, so "office in Manchester,
 *   about 1,500 sq ft" fills three slots at once.
 * - `parseSlot` is targeted at the question just asked, and always returns
 *   something usable so the conversation can never stall.
 */

const MAX_DISPLAY = 120;

/** Trims, collapses whitespace and caps length for display on the card. */
function tidy(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ").replace(/[.,;]+$/, "");
  return cleaned.length > MAX_DISPLAY
    ? `${cleaned.slice(0, MAX_DISPLAY - 1)}…`
    : cleaned;
}

function sentenceCase(raw: string): string {
  // Drop leading punctuation so stray characters don't lead the lead card.
  const text = tidy(raw).replace(/^[^\p{L}\p{N}]+/u, "");
  if (text === "") return tidy(raw);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Whether a value is safe to repeat back to the customer.
 *
 * Recognised answers always are. Unrecognised free text only is when it reads
 * like words — repeating "!!! xyzzy 42 ???" back with confidence makes the
 * assistant look like it understood something it plainly did not.
 */
export function isEchoable(value: { display: string; code?: string }): boolean {
  if (value.code !== undefined && value.code !== "other" && value.code !== "unknown") {
    return true;
  }
  return /^\p{L}[\p{L}\p{N}\s'’\-,.()&]{0,44}$/u.test(value.display);
}

/** Answers that mean "I don't know" rather than a real value. */
const UNSURE = /\b(not sure|dunno|don'?t know|do not know|no idea|unsure|tbc)\b/i;

/** Answers that mean "nothing to add". */
const NOTHING =
  /^(no|none|nope|nothing|n\/?a|not really|nothing special|just the usual|standard)\b/i;

// --- property type -----------------------------------------------------------

const PROPERTY_PATTERNS: readonly [RegExp, string, string][] = [
  [/\b(offices?|workplace|business park|co-?working)\b/i, "office", "Commercial office"],
  [/\b(retail|shops?|store|showroom|boutique)\b/i, "retail", "Retail unit"],
  [/\b(warehouse|industrial|factory|depot|distribution)\b/i, "industrial", "Warehouse / industrial"],
  [/\b(schools?|college|academy|nursery|university|educational)\b/i, "education", "School / education"],
  [/\b(surgery|clinic|dental|medical|healthcare|care home|hospital)\b/i, "healthcare", "Healthcare premises"],
  [/\b(gym|leisure|fitness|studio)\b/i, "leisure", "Gym / leisure"],
  [/\b(restaurants?|caf[eé]|pub|bar|hotel|hospitality|kitchens?)\b/i, "hospitality", "Hospitality venue"],
  [/\b(communal|flats?|apartments?|block|residential building|stairwell)\b/i, "communal", "Communal areas"],
];

function parsePropertyType(raw: string): SlotValue | null {
  for (const [pattern, code, display] of PROPERTY_PATTERNS) {
    if (pattern.test(raw)) return { display, code };
  }
  return null;
}

// --- location ----------------------------------------------------------------

/** Enough coverage to recognise a city mentioned in an opening enquiry. */
const UK_PLACES: readonly string[] = [
  "London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Liverpool",
  "Bristol", "Sheffield", "Edinburgh", "Cardiff", "Belfast", "Nottingham",
  "Newcastle", "Leicester", "Coventry", "Southampton", "Portsmouth", "Reading",
  "Brighton", "Bournemouth", "Plymouth", "Derby", "Stoke-on-Trent", "Wolverhampton",
  "Norwich", "Swansea", "Aberdeen", "Dundee", "York", "Oxford", "Cambridge",
  "Exeter", "Ipswich", "Luton", "Milton Keynes", "Northampton", "Preston",
  "Sunderland", "Swindon", "Telford", "Warrington", "Bolton", "Salford",
  "Stockport", "Croydon", "Slough", "Watford", "Basingstoke", "Chelmsford",
  "Colchester", "Peterborough", "Huddersfield", "Blackpool", "Middlesbrough",
  "Bradford", "Wakefield", "Doncaster", "Rotherham", "Gateshead", "Chester",
];

const POSTCODE = /\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})\b/i;

function parseLocation(raw: string): SlotValue | null {
  const place = UK_PLACES.find((city) =>
    new RegExp(`\\b${city.replace(/[-\s]/g, "[-\\s]")}\\b`, "i").test(raw),
  );
  const postcode = POSTCODE.exec(raw);
  if (place) {
    const display = postcode
      ? `${place} (${postcode[1]?.toUpperCase()} ${postcode[2]?.toUpperCase()})`
      : place;
    return { display, code: place.toLowerCase().replace(/\s+/g, "-") };
  }
  if (postcode) {
    return {
      display: `${postcode[1]?.toUpperCase()} ${postcode[2]?.toUpperCase()}`,
      code: "postcode",
    };
  }
  return null;
}

// --- size --------------------------------------------------------------------

const SQ_FT = /(\d[\d,]*(?:\.\d+)?)\s*(?:sq\.?\s*(?:ft|feet)|sqft|square\s*f(?:ee)?t|ft2|ft²)/i;
const SQ_M = /(\d[\d,]*(?:\.\d+)?)\s*(?:sq\.?\s*m(?:tr)?s?|sqm|square\s*met(?:re|er)s?|m2|m²)/i;
const BARE_NUMBER = /\b(\d[\d,]{2,})\b/;

function formatSqFt(value: number): string {
  return `${Math.round(value).toLocaleString("en-GB")} sq ft`;
}

function parseSize(raw: string, asked: boolean): SlotValue | null {
  const sqft = SQ_FT.exec(raw);
  if (sqft?.[1]) {
    const value = Number(sqft[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value > 0) {
      return { display: formatSqFt(value), code: String(Math.round(value)) };
    }
  }

  const sqm = SQ_M.exec(raw);
  if (sqm?.[1]) {
    const value = Number(sqm[1].replace(/,/g, "")) * 10.7639;
    if (Number.isFinite(value) && value > 0) {
      return {
        display: `${formatSqFt(value)} (approx.)`,
        code: String(Math.round(value)),
      };
    }
  }

  if (/\bsmall\b/i.test(raw)) return { display: "Small — under 1,000 sq ft", code: "small" };
  if (/\b(medium|mid)\b/i.test(raw)) return { display: "Medium — 1,000–3,000 sq ft", code: "medium" };
  if (/\b(large|big)\b/i.test(raw)) return { display: "Large — over 5,000 sq ft", code: "large" };

  // A bare number only counts when we actually asked about size.
  if (asked) {
    const bare = BARE_NUMBER.exec(raw);
    if (bare?.[1]) {
      const value = Number(bare[1].replace(/,/g, ""));
      if (Number.isFinite(value) && value >= 50 && value <= 5_000_000) {
        return { display: formatSqFt(value), code: String(Math.round(value)) };
      }
    }
  }
  return null;
}

// --- frequency ---------------------------------------------------------------

const WORD_NUMBERS: Record<string, number> = {
  one: 1, once: 1, two: 2, twice: 2, three: 3, thrice: 3,
  four: 4, five: 5, six: 6, seven: 7,
};

function parseFrequency(raw: string): SlotValue | null {
  if (/\b(one[-\s]?off|single clean|just once|ad[-\s]?hoc)\b/i.test(raw)) {
    return { display: "One-off clean", code: "one_off" };
  }
  if (/\b(daily|every day|each day|7 days)\b/i.test(raw)) {
    return { display: "Daily", code: "daily" };
  }
  if (/\b(mon(day)?\s*(-|to|–)\s*fri(day)?|weekdays?|every weekday)\b/i.test(raw)) {
    return { display: "5 days a week (weekdays)", code: "weekdays" };
  }

  const numeric = /\b(\d+)\s*(?:x|times?)?\s*(?:a|per|each)?\s*week\b/i.exec(raw);
  const worded =
    /\b(one|once|two|twice|three|thrice|four|five|six|seven)\s*(?:x|times?)?\s*(?:a|per|each)?\s*week\b/i.exec(
      raw,
    );
  const count = numeric?.[1]
    ? Number(numeric[1])
    : worded?.[1]
      ? WORD_NUMBERS[worded[1].toLowerCase()]
      : undefined;

  if (count !== undefined && count >= 1 && count <= 7) {
    if (count === 1) return { display: "Once a week", code: "weekly" };
    if (count === 7) return { display: "Daily", code: "daily" };
    return { display: `${count} times a week`, code: `weekly_x${count}` };
  }

  if (/\bfortnight|every (two|2) weeks\b/i.test(raw)) {
    return { display: "Fortnightly", code: "fortnightly" };
  }
  if (/\bmonthly|every month\b/i.test(raw)) {
    return { display: "Monthly", code: "monthly" };
  }
  if (/\bweekly\b/i.test(raw)) return { display: "Once a week", code: "weekly" };
  return null;
}

// --- preferred time ----------------------------------------------------------

const TIME_PATTERNS: readonly [RegExp, string, string][] = [
  [/\b(evenings?|after hours|after work|after \d|out of hours)\b/i, "evenings", "Evenings"],
  [/\b(early mornings?|before \d|first thing|mornings?)\b/i, "mornings", "Early mornings"],
  [/\b(overnight|night ?shift|nights?)\b/i, "overnight", "Overnight"],
  [/\b(weekends?|saturdays?|sundays?)\b/i, "weekends", "Weekends"],
  [/\b(during (the )?day|working hours|daytime|office hours)\b/i, "daytime", "During working hours"],
  [/\b(flexible|any time|anytime|whenever|no preference|don'?t mind)\b/i, "flexible", "Flexible"],
];

function parsePreferredTime(raw: string): SlotValue | null {
  for (const [pattern, code, display] of TIME_PATTERNS) {
    if (pattern.test(raw)) return { display, code };
  }
  return null;
}

// --- current situation -------------------------------------------------------

function parseCurrentSituation(raw: string): SlotValue | null {
  if (/\b(in[-\s]?house|our own staff|ourselves|we do it|own team)\b/i.test(raw)) {
    return { display: "Cleaned in-house at present", code: "in_house" };
  }
  if (
    /\b(another company|current (provider|cleaners?|contractor)|existing (provider|cleaners?)|we use|contract|switching|changing|not happy|unhappy|looking to change)\b/i.test(
      raw,
    )
  ) {
    return { display: "Using another provider", code: "other_provider" };
  }
  if (/\b(no|none|nobody|not currently|don'?t have|first time|new (office|site|premises))\b/i.test(raw)) {
    return { display: "No cleaners at present", code: "none" };
  }
  return null;
}

// --- requirements ------------------------------------------------------------

function parseRequirements(raw: string): SlotValue | null {
  if (NOTHING.test(raw.trim())) {
    return { display: "General cleaning, nothing specialist", code: "general" };
  }
  return null;
}

// --- public API --------------------------------------------------------------

/** Runs every parser over a message. Used on each turn, not just the first. */
export function extractAll(raw: string): Partial<Record<SlotId, SlotValue>> {
  const found: Partial<Record<SlotId, SlotValue>> = {};
  const property = parsePropertyType(raw);
  if (property) found.propertyType = property;
  const location = parseLocation(raw);
  if (location) found.location = location;
  const size = parseSize(raw, false);
  if (size) found.size = size;
  const frequency = parseFrequency(raw);
  if (frequency) found.frequency = frequency;
  const time = parsePreferredTime(raw);
  if (time) found.preferredTime = time;
  return found;
}

/**
 * Parses an answer to a specific question. Always returns a value so the
 * conversation advances even when the text is unexpected — the whole point is
 * that a demo visitor cannot get the assistant stuck.
 */
export function parseSlot(slot: SlotId, raw: string): SlotValue {
  const text = raw.trim();

  if (UNSURE.test(text)) {
    switch (slot) {
      case "size":
        return { display: "Not known — to confirm on site", code: "unknown" };
      case "requirements":
        return { display: "General cleaning, nothing specialist", code: "general" };
      default:
        return { display: "To be confirmed", code: "unknown" };
    }
  }

  switch (slot) {
    case "propertyType":
      return parsePropertyType(text) ?? { display: sentenceCase(text), code: "other" };
    case "location":
      return parseLocation(text) ?? { display: sentenceCase(text) };
    case "size":
      // Refuse to record nonsense as a floor area.
      return parseSize(text, true) ?? { display: "Not known — to confirm on site", code: "unknown" };
    case "frequency":
      return parseFrequency(text) ?? { display: sentenceCase(text) };
    case "preferredTime":
      return parsePreferredTime(text) ?? { display: sentenceCase(text) };
    case "currentSituation":
      return parseCurrentSituation(text) ?? { display: sentenceCase(text) };
    case "requirements":
      return parseRequirements(text) ?? { display: sentenceCase(text) };
  }
}

// --- contact validation ------------------------------------------------------

/**
 * Re-exported from `lib/validation` so existing call sites keep working and
 * the onboarding form shares exactly the same rules.
 */
export { isValidEmail, isValidName, isValidPhone } from "@/lib/validation";
