/**
 * Single source of truth for brand-level facts used across the site.
 *
 * Linwick is the product. Stepe Digital SIA is the company that sells it, and
 * is named as such in the footer and on the legal pages so that a
 * stepedigital.com contact address on a linwick.co.uk page reads as normal
 * rather than as a mistake.
 *
 * Change these and every page, the OG card, the favicon and the metadata
 * follow.
 */

/** The product name. Shown in the wordmark, nav, title template and OG card. */
export const BRAND_NAME = "Linwick";

/** The company behind the product. Named as data controller on /privacy. */
export const LEGAL_ENTITY = "Stepe Digital SIA";

/**
 * The canonical public origin. No trailing slash.
 *
 * Which domain the site is indexed under is a brand fact, not a deployment
 * detail, so it lives here rather than only in `NEXT_PUBLIC_SITE_URL`. It used
 * to live only in that variable, which is how production ended up publishing a
 * canonical tag and an `og:url` pointing at a preview deployment: the variable
 * was set once, to whatever host existed at the time, and nothing on the site
 * could tell that it was wrong.
 *
 * **This must be the host that answers 200, not the one that redirects.** The
 * Vercel project serves `www` and 308s the bare apex to it. Naming the apex
 * here would point every canonical tag, every sitemap entry and the `og:image`
 * at a redirect: search engines merely follow those, but several social
 * scrapers do not follow redirects on image URLs, so the link preview would
 * quietly stop rendering. If the apex and `www` are ever swapped in Vercel,
 * this line has to move with them.
 *
 * `resolveSiteUrl()` in `lib/env.ts` uses this for production and leaves
 * preview deployments on their own hostname, so a preview never claims to be
 * the canonical site.
 */
export const CANONICAL_ORIGIN = "https://www.linwick.co.uk";

/**
 * Monitored mailbox for all public contact and fallback routes.
 *
 * Deliberately a stepedigital.com address for now: there is no Workspace
 * domain alias on linwick.co.uk yet. Once there is, this one line flips to
 * adrians@linwick.co.uk and every mailto, the footer, the privacy notice and
 * the terms follow it. Do not hardcode an address anywhere else.
 */
export const CONTACT_EMAIL = "adrians@stepedigital.com";

export const BRAND = {
  /** Shown in the wordmark, nav and title template. */
  name: BRAND_NAME,
  /**
   * The two-beat line. First beat is the benefit, second is the boundary, and
   * the boundary is the reason a sceptical director trusts it.
   *
   * It is a slogan, not an explanation: read cold it is two negatives in a row
   * and takes about a second to resolve. Wherever it appears, `oneLiner` or
   * `descriptor` must sit immediately underneath. See `lib/marketing/hero.ts`.
   */
  tagline: "Never miss an enquiry. Never quote a price.",
  /**
   * What the product is, in one phrase. Used wherever the tagline needs
   * resolving but there is no room for a full sentence: the OG card's second
   * line, the footer.
   */
  descriptor: "Enquiry handling for UK commercial cleaning companies",
  contactEmail: CONTACT_EMAIL,
  /**
   * Registered company. Used in the footer legal block and named as the data
   * controller on the privacy page.
   */
  legalEntity: LEGAL_ENTITY,
  /** Country of establishment. Determines the lead supervisory authority. */
  jurisdiction: "Latvia",
  /**
   * Registered address and company registration number.
   *
   * Both are legally required in a GDPR privacy notice (Art. 13(1)(a)) and
   * expected in terms of business. The privacy and terms pages render a visible
   * "to be confirmed" marker whenever either is blank, so an incomplete notice
   * cannot go unnoticed. Do not empty these again without meaning to.
   *
   * Widened to `string` so that "is this filled in?" stays a real runtime
   * question. Under `as const` the literal types make the check below provably
   * true, and the incomplete-notice banner would be compiled away rather than
   * coming back if either value were ever cleared.
   */
  registeredAddress:
    "Līča iela 12, Lejasciems, Lejasciema pag., Gulbenes nov., Latvia" as string,
  registrationNumber: "40203711274" as string,
} as const;

/** True once the company details required by the legal pages are filled in. */
export const HAS_REGISTRATION_DETAILS =
  BRAND.registeredAddress !== "" && BRAND.registrationNumber !== "";

/**
 * How the product and the company relate, in one line.
 *
 * Carried in the footer on every page. This is the sentence that makes the
 * two names on this site read as one business.
 */
export const ATTRIBUTION = `${BRAND_NAME} is a product of ${LEGAL_ENTITY}`;

export interface NavLink {
  href: string;
  label: string;
}

/** In-page anchors, in the order they appear on the landing page. */
export const NAV_LINKS: readonly NavLink[] = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#preview", label: "See it work" },
  { href: "/#who-its-for", label: "Who it’s for" },
  { href: "/pricing", label: "Pricing" },
];

export const FOOTER_LINKS: readonly NavLink[] = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/demo", label: "Demo" },
  { href: "/pricing", label: "Pricing" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];
