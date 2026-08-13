import { PROBLEM_TIMELINE } from "@/lib/marketing/content";
import { Container, SectionHeading } from "./primitives";

export function ProblemSection() {
  return (
    <section id="problem" className="relative overflow-hidden bg-ink">
      <div
        aria-hidden="true"
        className="ink-grid pointer-events-none absolute inset-0"
      />

      <Container className="relative py-20 sm:py-28">
        <SectionHeading
          onDark
          eyebrow="The problem"
          title="Enquiries don’t arrive when you’re at a desk."
          lead="They arrive on site, mid-job, at ten to five on a Friday. Here’s how a real one goes cold."
        />

        <ol className="mt-12 space-y-0">
          {PROBLEM_TIMELINE.map((entry, index) => {
            const isLast = index === PROBLEM_TIMELINE.length - 1;
            return (
              <li key={entry.time} className="relative flex gap-5 sm:gap-8">
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                      entry.lost ? "bg-fault" : "bg-white/35"
                    }`}
                    aria-hidden="true"
                  />
                  {!isLast ? (
                    <span
                      className="w-px flex-1 bg-white/15"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>

                <div className={isLast ? "pb-0" : "pb-8"}>
                  <p className="font-mono text-xs tracking-wide text-white/60">
                    {entry.time}
                  </p>
                  <p
                    className={`mt-1.5 text-base leading-relaxed text-pretty sm:text-lg ${
                      entry.lost
                        ? "font-medium text-[#e2957f]"
                        : "text-white/85"
                    }`}
                  >
                    {entry.event}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-10 max-w-2xl border-l-2 border-white/20 pl-5 text-base text-white/60 sm:text-lg">
          Nothing went wrong. Nobody was careless. Everyone was just busy, and
          the enquiry still went to whoever answered first.
        </p>
      </Container>
    </section>
  );
}
