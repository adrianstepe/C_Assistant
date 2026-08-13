/**
 * Single source of truth for brand-level facts used across the marketing site.
 *
 * `name` and `contactEmail` are placeholders chosen during the build — change
 * them here and every page, the OG image and the metadata follow.
 */
export const BRAND = {
  name: "Quoteline",
  /** Used in the <title> template and the OG card. */
  tagline: "Quote assistant for commercial cleaning companies",
  /** TODO: point at a real, monitored mailbox before launch. */
  contactEmail: "hello@quoteline.co.uk",
  legalEntity: "Quoteline",
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
