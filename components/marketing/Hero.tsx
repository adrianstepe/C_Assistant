import Link from "next/link";
import {
  HERO_EYEBROW,
  HERO_REASSURANCE,
  HERO_SUBHEAD,
} from "@/lib/marketing/hero";
import { Container, primaryButton, secondaryButton } from "./primitives";
import { LeadCard } from "./LeadCard";

export function Hero() {
  return (
    <section className="bg-paper relative overflow-hidden">
      <div
        aria-hidden="true"
        className="hero-grid pointer-events-none absolute inset-0"
      />

      <Container className="relative pt-14 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="border-hairline text-slate-body inline-flex items-center gap-2 border bg-white px-3 py-1 text-xs font-medium">
              <span className="bg-brand inline-block size-2" aria-hidden="true" />
              {HERO_EYEBROW}
            </p>

            {/*
              Two sentences, deliberately set on two lines: the benefit and the
              boundary get a beat each rather than running together. The
              sub-head immediately below is load-bearing, not decoration - read
              cold, "never quote a price" is two negatives in a row and needs
              resolving inside a second. Nothing goes between them.
            */}
            {/*
              Sized so each sentence holds one line at every breakpoint. The
              two-line shape is the point; a sentence wrapping mid-phrase on a
              narrow screen turns a clean pair of beats into four ragged lines.
            */}
            <h1 className="font-display mt-5 text-[2rem] leading-[1.08] font-semibold tracking-[-0.015em] text-ink sm:text-[3.25rem] lg:text-[3.5rem]">
              {/*
                The space between the spans is deliberate. Both are block, so
                it collapses visually, but without it the accessible name
                concatenates to "...enquiry.Never quote..." and a screen reader
                runs the two sentences together.
              */}
              <span className="block">Never miss an enquiry.</span>{" "}
              <span className="block">Never quote a price.</span>
            </h1>

            <p className="text-slate-body mt-6 max-w-lg text-lg leading-relaxed text-pretty">
              {HERO_SUBHEAD}
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

            <p className="text-slate-body mt-6 text-sm">{HERO_REASSURANCE}</p>
          </div>

          <div className="lg:pl-4">
            <LeadCard />
          </div>
        </div>
      </Container>
    </section>
  );
}
