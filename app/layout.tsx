import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { BRAND } from "@/lib/marketing/brand";
import { MONTHLY_FEE_LABEL, SETUP_FEE_LABEL } from "@/lib/pricing";
import { publicEnv } from "@/lib/env";
import "./globals.css";

/**
 * Three roles, not one face doing everything: a condensed display face with a
 * signage heritage for headlines, an operational sans for body copy, and a
 * mono face for reference numbers and timestamps - see globals.css for how
 * these bind to `font-sans` / `font-display` / `font-mono`.
 *
 * Self-hosted from `app/fonts` rather than fetched via `next/font/google`.
 * That loader downloads the font binaries from fonts.gstatic.com *at build
 * time*, so a URL Google has rotated away takes the whole deployment down with
 * an unresolvable module - which is exactly what happened once with IBM Plex
 * Sans. These are the same latin-subset files, committed, so the build depends
 * on nothing outside the repository.
 */
const display = localFont({
  variable: "--font-display",
  display: "swap",
  // Weight 600 is the only display weight any component uses (`font-semibold`
  // on every heading and the wordmark). A 700 face was shipped until it was
  // found preloaded and unreferenced - roughly 23 KB of every cold load.
  src: [
    { path: "./fonts/barlow-semi-condensed-600.woff2", weight: "600", style: "normal" },
  ],
});

const body = localFont({
  variable: "--font-body",
  display: "swap",
  src: [
    { path: "./fonts/ibm-plex-sans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-600.woff2", weight: "600", style: "normal" },
  ],
});

const data = localFont({
  variable: "--font-data",
  display: "swap",
  src: [
    { path: "./fonts/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-500.woff2", weight: "500", style: "normal" },
  ],
});

const description = `${BRAND.name} answers new enquiries on your website instantly and asks what your estimator needs. It never gives a price. ${SETUP_FEE_LABEL} setup, ${MONTHLY_FEE_LABEL} a month.`;

const { siteUrl } = publicEnv;

/**
 * Absolute-URL metadata is emitted only when the site URL is actually known.
 *
 * Without `metadataBase`, Next resolves relative values like `canonical: "/"`
 * against `http://localhost:3000` — so leaving them in while omitting the base
 * would publish a localhost canonical rather than none at all. Both are
 * therefore gated on the same condition.
 */
const absoluteUrlMetadata: Metadata = siteUrl
  ? {
      metadataBase: new URL(siteUrl),
      alternates: { canonical: "/" },
      openGraph: { url: "/" },
    }
  : {};

export const metadata: Metadata = {
  ...absoluteUrlMetadata,
  title: {
    default: `${BRAND.name}: ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description,
  applicationName: BRAND.name,
  keywords: [
    "commercial cleaning software",
    "cleaning quote software",
    "cleaning enquiry management",
    "UK commercial cleaning",
  ],
  openGraph: {
    ...absoluteUrlMetadata.openGraph,
    type: "website",
    siteName: BRAND.name,
    locale: "en_GB",
    title: `${BRAND.name}: ${BRAND.tagline}`,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name}: ${BRAND.tagline}`,
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f1f3ee",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en-GB"
      className={`${display.variable} ${body.variable} ${data.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
