import Link from "next/link";
import { Container, SectionHeading, secondaryButton } from "./primitives";
import { AssistantPreview } from "./AssistantPreview";

export function PreviewSection() {
  return (
    <section id="preview" className="bg-white">
      <Container className="py-20 sm:py-28">
        <SectionHeading
          eyebrow="See it work"
          title="A real enquiry, qualified in eight messages."
          lead="Watch free text on the left turn into fields on the right. This is the same information your estimator would have to chase by phone."
        />

        <div className="mt-12">
          <AssistantPreview />
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link href="/demo" className={secondaryButton}>
            Try it with your own enquiry
          </Link>
          <p className="text-slate-body text-sm">
            Example conversation. Your assistant asks the questions you tell it
            to ask.
          </p>
        </div>
      </Container>
    </section>
  );
}
