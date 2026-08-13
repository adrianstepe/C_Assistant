import { BENEFITS } from "@/lib/marketing/content";
import { Container, SectionHeading } from "./primitives";

export function BenefitsSection() {
  return (
    <section id="benefits" className="bg-mist">
      <Container className="py-20 sm:py-28">
        <SectionHeading
          eyebrow="What changes"
          title="Less chasing, better briefs, fewer enquiries that quietly die."
          lead="No promises about your conversion rate. That depends on your prices and your patch. These are the things the assistant actually does."
        />

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit.title}
              className="border-hairline rounded-lg border bg-white p-6 transition-shadow hover:shadow-md hover:shadow-ink/[0.05]"
            >
              <span
                aria-hidden="true"
                className="bg-clear-tint text-clear flex size-9 items-center justify-center rounded-lg"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 13 4 4L19 7" />
                </svg>
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">
                {benefit.title}
              </h3>
              <p className="text-slate-body mt-2 text-sm leading-relaxed text-pretty">
                {benefit.description}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
