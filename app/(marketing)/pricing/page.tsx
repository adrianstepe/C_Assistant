import type { Metadata } from "next";
import Link from "next/link";
import { getCheckoutAvailability } from "@/lib/stripe/config";
import { MONTHLY_FEE_LABEL, PRODUCT_NAME, SETUP_FEE_LABEL } from "@/lib/pricing";
import { PricingPanel } from "@/components/checkout/PricingPanel";
import { BoundarySection } from "@/components/marketing/BoundarySection";
import { Container, secondaryButton } from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "Pricing",
  description: `${PRODUCT_NAME} for UK commercial cleaning companies. ${SETUP_FEE_LABEL} setup, then ${MONTHLY_FEE_LABEL} a month. Monthly rolling, cancel any time.`,
  // Metadata merges shallowly: without this the root layout's homepage
  // canonical wins and the page declares itself to be the homepage.
  alternates: { canonical: "/pricing" },
};

// Availability depends on server environment variables, so this must not be
// baked in at build time.
export const dynamic = "force-dynamic";

export default function PricingPage() {
  const mode = getCheckoutAvailability().kind;

  return (
    <>
      <Container className="pt-12 pb-4 sm:pt-16">
        <div className="max-w-2xl">
          <p className="text-slate-body inline-flex items-center gap-2 font-mono text-xs font-medium tracking-[0.14em] uppercase">
            <span className="bg-brand inline-block size-2" aria-hidden="true" />
            Pricing
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl lg:text-[2.75rem]">
            {SETUP_FEE_LABEL} to set up, {MONTHLY_FEE_LABEL} a month to run.
          </h1>
          <p className="text-slate-body mt-5 text-lg leading-relaxed text-pretty">
            One setup, configured around your services and your patch. No
            contract, no charge per enquiry, and no charge for the enquiries{" "}
            {PRODUCT_NAME} handles.
          </p>
        </div>
      </Container>

      {/*
        Sits above the price rather than below it. A director reading a monthly
        figure is at their most sceptical on this page, and the thing that
        settles it is knowing the software has no opinion about what their work
        is worth.
      */}
      <BoundarySection className="mt-8 sm:mt-10" />

      <Container className="pt-12 pb-12 sm:pb-16">
        <PricingPanel mode={mode} />

        <div className="border-hairline mt-12 rounded-lg border border-dashed bg-white/50 p-6 sm:p-8">
          <h2 className="text-base font-semibold text-ink">Not sure yet?</h2>
          <p className="text-slate-body mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">
            Run the demo first. It takes about a minute and shows exactly what
            your team would receive at the end of an enquiry.
          </p>
          <Link href="/demo" className={`${secondaryButton} mt-5`}>
            Try the demo
          </Link>
        </div>
      </Container>
    </>
  );
}
