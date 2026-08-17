import { BRAND_NAME } from "./brand";

/**
 * The hero headline and sub-head, shared by the page and the social card.
 *
 * These used to be a hand-copy: the H1 lived in `Hero.tsx` and was retyped into
 * `app/opengraph-image.tsx`. Satori cannot import a component, so the card has
 * to restate the copy somehow, and restating it by hand meant every headline
 * change silently left the social card a version behind. Both now read from
 * here.
 */

/**
 * The tagline is two negatives in a row. `HERO_SUBHEAD` resolves it and must
 * render directly underneath with nothing in between, on the page and on the
 * card alike.
 */
export const HERO_SUBHEAD = `${BRAND_NAME} answers new enquiries on your website the moment they arrive, asks the questions your estimator needs, and hands the job over ready to price.`;

/** Sits above the H1. Says who this is for before it says what it does. */
export const HERO_EYEBROW = "For UK commercial cleaning companies";

/** The line under the buttons. Removes the "book a call" objection early. */
export const HERO_REASSURANCE =
  "No sales call to see it. Watch a real enquiry get qualified in under a minute.";

/**
 * The boundary paragraph.
 *
 * The single most persuasive block on the site for a sceptical director, so it
 * appears twice: on the landing page straight after the worked example, and
 * again on /pricing where the objection is sharpest. Kept verbatim in both
 * places. Do not paraphrase it per-page.
 */
export const BOUNDARY = {
  eyebrow: "What it does not do",
  /** Set at heading scale. The claim itself. */
  claim: `${BRAND_NAME} never gives a price.`,
  /** Set at body scale, directly beneath. The proof of the claim. */
  detail:
    "It holds no rates, no rules of thumb and no opinion about what a job is worth. It asks, it records, it hands over. What the work is worth stays with your estimator, where it belongs.",
} as const;
