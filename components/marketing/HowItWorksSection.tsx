import { HOW_IT_WORKS } from "@/lib/marketing/content";
import { Container, SectionHeading } from "./primitives";

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-white">
      <Container className="py-20 sm:py-28">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps to set up. Then it runs on its own."
          lead="Built to sit on the website you already have, using the questions you already ask."
        />

        <ol className="mt-12 grid gap-6 sm:gap-8 md:grid-cols-3">
          {HOW_IT_WORKS.map((step) => (
            <li key={step.number} className="border-hairline border-t pt-6">
              <p className="font-mono text-sm font-medium text-brand">
                {step.number}
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-ink">
                {step.title}
              </h3>
              <p className="text-slate-body mt-3 text-base leading-relaxed text-pretty">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
