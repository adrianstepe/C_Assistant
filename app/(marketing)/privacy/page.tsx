import type { Metadata } from "next";
import { BRAND } from "@/lib/marketing/brand";
import { Container } from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${BRAND.name} handles personal data.`,
  robots: { index: false, follow: true },
};

/** Placeholder. Must be replaced with a reviewed policy before launch. */
export default function PrivacyPage() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Privacy
        </h1>
        <p className="text-slate-body mt-5 text-lg leading-relaxed">
          This page is a placeholder. A full privacy notice — covering what
          personal data is collected, the lawful basis for processing it, how
          long it is kept and how to request its deletion — will be published
          here before the service is offered commercially.
        </p>
        <p className="text-slate-body mt-4 text-lg leading-relaxed">
          In the meantime, questions about data handling can go to{" "}
          <a
            href={`mailto:${BRAND.contactEmail}`}
            className="rounded-md font-medium text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {BRAND.contactEmail}
          </a>
          .
        </p>
      </div>
    </Container>
  );
}
