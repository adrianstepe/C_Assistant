import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { QuoteAssistantDemo } from "@/components/demo/QuoteAssistantDemo";
import { loadTenantConfig } from "@/lib/tenants/config";
import { BRAND_NAME } from "@/lib/marketing/brand";
import { isAssistantModelEnabled } from "@/lib/ai/deepseek";

/**
 * The hosted capture page: a paying customer's own enquiry assistant, served
 * from a path on this domain (`/c/{slug}`).
 *
 * Path routing only, by decision: no subdomains, no customer logins, and no
 * customer-editable anything. The page is the existing demo experience driven
 * by the tenant's config, loaded server-side; an unknown slug (or a disabled
 * one) is a plain 404 with nothing about the tenant in it.
 *
 * The model flag is resolved here on the server exactly as the demo page does,
 * so no credential or its absence is inferable from the client bundle.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await loadTenantConfig(slug);

  if (!tenant) {
    // Same metadata for unknown and disabled slugs: no config leak.
    return { title: "Page not found", robots: { index: false, follow: false } };
  }

  return {
    title: `${tenant.companyName} enquiries`,
    description: `Tell ${tenant.companyName} what you need cleaned and they will come back to you with a quote.`,
    // Deliberately noindex by default (fulfilment plan, phase 2): these pages
    // exist for people who were given the link, not for search results. A
    // customer who wants to be findable gets that decision made per tenant.
    robots: { index: false, follow: false },
  };
}

export default async function CapturePage({ params }: PageProps) {
  const { slug } = await params;
  const tenant = await loadTenantConfig(slug);
  if (!tenant) notFound();

  const useModel = isAssistantModelEnabled();
  const accent = tenant.brandAccent ?? "#f0b429";
  const accentDark = shadeAccent(accent);

  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-paper text-ink"
      // Per-tenant accent, injected as the same CSS custom properties the
      // Tailwind theme defines, so every brand-coloured element inside this
      // subtree follows the tenant without any component knowing about it.
      style={
        {
          "--color-brand": accent,
          "--color-brand-dark": accentDark,
          "--color-brand-tint": `${accent}1f`,
        } as CSSProperties
      }
    >
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <header className="max-w-2xl">
          <p className="inline-flex items-center gap-2 font-mono text-xs font-medium tracking-[0.14em] uppercase">
            <span className="inline-block size-2 bg-brand" aria-hidden="true" />
            Enquiries
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Tell {tenant.companyName} what you need cleaned.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-pretty">
            Answer a few short questions and everything reaches their team
            ready to quote. No account, no phone call, no waiting on hold.
          </p>
          {tenant.serviceAreas.length > 0 || tenant.services.length > 0 ? (
            <p className="mt-4 text-sm">
              {tenant.serviceAreas.length > 0 ? (
                <span className="mr-4">
                  <strong className="font-semibold">Areas:</strong>{" "}
                  {tenant.serviceAreas.join(", ")}
                </span>
              ) : null}
              {tenant.services.length > 0 ? (
                <span>
                  <strong className="font-semibold">Services:</strong>{" "}
                  {tenant.services.join(", ")}
                </span>
              ) : null}
            </p>
          ) : null}
        </header>

        <div className="mt-10">
          <QuoteAssistantDemo
            useModel={useModel}
            companyName={tenant.companyName}
            capture={{ slug: tenant.slug }}
            showSalesOutro={false}
          />
        </div>
      </main>

      <footer className="border-hairline px-4 py-6 text-center text-xs sm:px-6">
        <p>
          Handled by {BRAND_NAME} on behalf of {tenant.companyName}. Your
          enquiry goes only to {tenant.companyName}, and replies come from them.
        </p>
      </footer>
    </div>
  );
}

/**
 * A darker step of the accent for hover states, derived rather than
 * configured: tenants give one colour, not a palette.
 */
function shadeAccent(hex: string): string {
  const channel = (offset: number) =>
    Math.max(
      0,
      Math.round(Number.parseInt(hex.slice(offset, offset + 2), 16) * 0.82),
    );
  const part = (value: number) => value.toString(16).padStart(2, "0");
  return `#${part(channel(1))}${part(channel(3))}${part(channel(5))}`;
}
