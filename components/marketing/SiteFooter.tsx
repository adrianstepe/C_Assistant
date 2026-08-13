import Link from "next/link";
import { BRAND, FOOTER_LINKS } from "@/lib/marketing/brand";
import { Container } from "./primitives";
import { Wordmark } from "./Wordmark";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-hairline border-t bg-white">
      <Container className="py-12 sm:py-16">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Wordmark />
            <p className="text-slate-body mt-4 text-sm leading-relaxed">
              A quote assistant for UK commercial cleaning companies. It answers
              enquiries, asks the right questions and passes your team a lead
              they can price.
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
                      className="text-slate-body inline-block rounded-md py-2 text-sm transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <h2 className="text-xs font-semibold tracking-[0.14em] text-ink uppercase">
                Contact
              </h2>
              <ul className="mt-2 space-y-0.5">
                <li>
                  <a
                    href={`mailto:${BRAND.contactEmail}`}
                    className="text-slate-body inline-block rounded-md py-2 text-sm transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {BRAND.contactEmail}
                  </a>
                </li>
                <li className="text-slate-body py-2 text-sm">United Kingdom</li>
              </ul>
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
