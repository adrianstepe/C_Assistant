/**
 * Single source of truth for brand-level facts used across the site.
 *
 * The product is sold under the operator's own name rather than a separate
 * product brand. Change these and every page, the OG card and the metadata
 * follow.
 */
export const BRAND = {
  /** Shown in the wordmark, nav and title template. */
  name: "Stepe Digital",
  /** What is being sold. Used in the <title> and the OG card. */
  tagline: "AI Quote Assistant for Commercial Cleaning Companies",
  /** Monitored mailbox for all public contact and fallback routes. */
  contactEmail: "adrians@stepedigital.com",
  /**
   * Registered company. Used in the footer copyright and named as the data
   * controller on the privacy page.
   */
  legalEntity: "Stepe Digital SIA",
  /** Country of establishment. Determines the lead supervisory authority. */
  jurisdiction: "Latvia",
  /**
   * Registered address and company registration number.
   *
   * Both are legally required in a GDPR privacy notice (Art. 13(1)(a)) and
   * expected in terms of business. The privacy and terms pages render a visible
   * "to be confirmed" marker whenever either is blank, so an incomplete notice
   * cannot go unnoticed — do not empty these again without meaning to.
   *
   * Widened to `string` so that "is this filled in?" stays a real runtime
   * question. Under `as const` the literal types make the check below provably
   * true, and the incomplete-notice banner would be compiled away rather than
   * coming back if either value were ever cleared.
   */
  registeredAddress: "Gulbene, Latvia" as string,
  registrationNumber: "40203711274" as string,
} as const;

/** True once the company details required by the legal pages are filled in. */
export const HAS_REGISTRATION_DETAILS =
  BRAND.registeredAddress !== "" && BRAND.registrationNumber !== "";

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
