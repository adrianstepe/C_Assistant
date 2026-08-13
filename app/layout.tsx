import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BRAND } from "@/lib/marketing/brand";
import { publicEnv } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const description =
  "A quote assistant for UK commercial cleaning companies. It answers website enquiries in seconds, asks the questions a price depends on, and sends your team a structured, qualified lead.";

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
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description,
  applicationName: BRAND.name,
  keywords: [
    "commercial cleaning software",
    "cleaning quote software",
    "cleaning enquiry management",
    "lead qualification for cleaning companies",
    "UK commercial cleaning",
  ],
  openGraph: {
    ...absoluteUrlMetadata.openGraph,
    type: "website",
    siteName: BRAND.name,
    locale: "en_GB",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${inter.variable} h-full antialiased`}>
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-brand"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
