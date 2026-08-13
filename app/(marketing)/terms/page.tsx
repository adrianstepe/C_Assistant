import type { Metadata } from "next";
import { BRAND } from "@/lib/marketing/brand";
import { Container } from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "Terms",
  description: `Terms of service for ${BRAND.name}.`,
  robots: { index: false, follow: true },
};

/** Placeholder. Must be replaced with reviewed terms before launch. */
export default function TermsPage() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Terms
        </h1>
        <p className="text-slate-body mt-5 text-lg leading-relaxed">
          This page is a placeholder. Terms of service — covering the scope of
          the service, availability, payment, liability and cancellation — will
          be published here before the service is offered commercially.
        </p>
        <p className="text-slate-body mt-4 text-lg leading-relaxed">
          Questions in the meantime can go to{" "}
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
