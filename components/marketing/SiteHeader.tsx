import Link from "next/link";
import { BRAND, NAV_LINKS } from "@/lib/marketing/brand";
import { Container, primaryButtonSm } from "./primitives";
import { Wordmark } from "./Wordmark";

const navLinkClass =
  "rounded-md px-2 py-1 text-sm font-medium text-slate-body transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/**
 * Sticky header.
 *
 * The mobile menu is a native <details>, so the entire header ships as a Server
 * Component with no JavaScript: `summary` is focusable and toggles on Enter,
 * and screen readers announce the expanded state for free.
 */
export function SiteHeader() {
  return (
    <header className="border-hairline/80 sticky top-0 z-50 border-b bg-white/85 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            aria-label={`${BRAND.name} home`}
          >
            <Wordmark />
          </Link>

          <nav
            aria-label="Main"
            className="hidden items-center gap-1 md:flex lg:gap-2"
          >
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={navLinkClass}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:block">
            <Link href="/demo" className={primaryButtonSm}>
              See demo
            </Link>
          </div>

          <details className="relative md:hidden [&[open]_.menu-open]:hidden [&[open]_.menu-close]:block">
            <summary
              className="border-hairline flex size-11 cursor-pointer list-none items-center justify-center rounded-lg border text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink [&::-webkit-details-marker]:hidden"
              aria-label="Toggle navigation menu"
            >
              <svg
                className="menu-open"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  d="M3 6h14M3 10h14M3 14h14"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
              <svg
                className="menu-close hidden"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </summary>

            <div className="border-hairline absolute right-0 z-50 mt-3 w-64 rounded-lg border bg-white p-2 shadow-lg shadow-ink/5">
              <nav aria-label="Mobile" className="flex flex-col">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-3 text-sm font-medium text-ink hover:bg-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <Link
                href="/demo"
                className={`${primaryButtonSm} mt-2 w-full py-3`}
              >
                See demo
              </Link>
            </div>
          </details>
        </div>
      </Container>
    </header>
  );
}
