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
   * Name used in the footer copyright and as the data controller on the
   * privacy page.
   *
   * REVIEW BEFORE LAUNCH: if the business trades through a registered company,
   * this should be the full registered name, and the privacy and terms pages
   * need the registered address and company number adding. Left as the trading
   * name here rather than guessing at registration details.
   */
  legalEntity: "Stepe Digital",
} as const;

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
