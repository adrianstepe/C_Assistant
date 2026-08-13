import Link from "next/link";
import { Container, primaryButton, secondaryButton } from "./primitives";
import { LeadCard } from "./LeadCard";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        aria-hidden="true"
        className="hero-grid pointer-events-none absolute inset-0"
      />

      <Container className="relative pt-14 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="border-hairline text-slate-body inline-flex items-center rounded-full border bg-white/70 px-3 py-1 text-xs font-medium">
              For UK commercial cleaning companies
            </p>

            <h1 className="mt-5 text-[2.5rem] leading-[1.06] font-semibold tracking-[-0.03em] text-balance text-ink sm:text-5xl lg:text-[3.5rem]">
              Every cleaning enquiry answered in seconds, not on Monday.
            </h1>

            <p className="text-slate-body mt-6 max-w-xl text-lg leading-relaxed text-pretty">
              The assistant replies to enquiries from your website, asks the
              questions a price actually depends on, and passes your team a
              structured lead they can quote from.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/demo" className={`${primaryButton} w-full sm:w-auto`}>
                See the demo
              </Link>
              <Link
                href="/#how-it-works"
                className={`${secondaryButton} w-full sm:w-auto`}
              >
                How it works
              </Link>
            </div>

            <p className="text-slate-body mt-6 text-sm">
              No sales call to see it. Watch a real enquiry get qualified in
              under a minute.
            </p>
          </div>

          <div className="lg:pl-4">
            <LeadCard />
          </div>
        </div>
      </Container>
    </section>
  );
}
