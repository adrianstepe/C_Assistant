import Link from "next/link";
import { ATTRIBUTION, BRAND, FOOTER_LINKS } from "@/lib/marketing/brand";
import { Container } from "./primitives";
import { Wordmark } from "./Wordmark";

/**
 * The footer carries the company disclosure, in text, on every page.
 *
 * Two names appear on this site: the product is Linwick, the seller is a
 * Latvian company, and the contact address is on a third domain again. Stated
 * plainly and together, that reads as an ordinary trading arrangement. Left
 * implicit, it reads as a mistake, which is expensive on a page asking a
 * stranger for a card number. It is also roughly what UK distance-selling
 * disclosure expects to be findable before purchase: trading name, legal
 * identity, geographic address, working contact route.
 *
 * Not behind a link, and not only on /terms.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-hairline border-t bg-white">
      <Container className="py-12 sm:py-16">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Wordmark />
            <p className="text-slate-body mt-4 text-sm leading-relaxed">
              {BRAND.name} answers new enquiries on your website and asks the
              questions a price depends on. It never gives a price.
            </p>
          </div>

          <div className="flex flex-col gap-10 sm:flex-row sm:gap-16">
            <nav aria-label="Footer">
              <h2 className="text-xs font-semibold tracking-[0.14em] text-ink uppercase">
                Site
              </h2>
              {/* Generous vertical padding keeps these above the 24px
                  minimum target size on touch screens. */}
              <ul className="mt-2 space-y-0.5">
                {FOOTER_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-slate-body inline-block rounded-md py-2 text-sm transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="max-w-xs">
              <h2 className="text-xs font-semibold tracking-[0.14em] text-ink uppercase">
                Company
              </h2>
              <address className="text-slate-body mt-2 text-sm leading-relaxed not-italic">
                <span className="block font-medium text-ink">
                  {ATTRIBUTION}
                </span>
                <span className="mt-1 block">{BRAND.registeredAddress}</span>
                <span className="block">
                  Reg. no. {BRAND.registrationNumber}
                </span>
                <a
                  href={`mailto:${BRAND.contactEmail}`}
                  className="mt-1 inline-block rounded-md py-1 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  {BRAND.contactEmail}
                </a>
              </address>
            </div>
          </div>
        </div>

        <div className="border-hairline mt-12 flex flex-col gap-2 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-slate-body text-xs">
            © {year} {BRAND.legalEntity}. All rights reserved.
          </p>
          <p className="text-slate-body text-xs">
            Conversation examples on this site are illustrative.
          </p>
        </div>
      </Container>
    </footer>
  );
}
