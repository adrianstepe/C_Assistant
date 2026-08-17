import { BOUNDARY } from "@/lib/marketing/hero";
import { Container } from "./primitives";

/**
 * The boundary: what the product refuses to do.
 *
 * Placed straight after the worked example on the landing page, and again
 * above the price. Both are the moment the "what if it quotes something daft"
 * objection actually forms, and answering it there is worth more than any
 * feature claim on the page.
 *
 * Deliberately not amber. The palette reserves amber for the things a visitor
 * can act on and `clear` green for settled status, and this is a statement of
 * where responsibility sits, not a call to action. It is also the one section
 * with no link in it at all: nothing here should look clickable.
 */
export function BoundarySection({
  className = "",
}: {
  /** Lets `/pricing` tighten the vertical rhythm; the landing page uses the default. */
  className?: string;
}) {
  return (
    <section className={`bg-mist ${className}`}>
      <Container className="py-20 sm:py-24">
        <div className="border-clear border-l-4 pl-6 sm:pl-8">
          <p className="text-slate-body font-mono text-xs font-medium tracking-[0.14em] uppercase">
            {BOUNDARY.eyebrow}
          </p>
          {/*
            A real heading, not a styled paragraph: it is set at heading scale,
            it is the section's subject, and every other section on the page
            contributes an h2 to the outline. Leaving this one out would make
            the page's most important claim invisible to anyone navigating by
            headings.
          */}
          <h2 className="font-display mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
            {BOUNDARY.claim}
          </h2>
          <p className="text-slate-body mt-5 max-w-2xl text-base leading-relaxed text-pretty sm:text-lg">
            {BOUNDARY.detail}
          </p>
        </div>
      </Container>
    </section>
  );
}
