import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/marketing/brand";
import { Container, primaryButton, secondaryButton } from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "Checkout cancelled",
  robots: { index: false, follow: false },
};

/**
 * Where Stripe sends someone who backed out.
 *
 * No guilt, no countdown, no "are you sure you want to miss out". They left
 * checkout on purpose; the job here is to confirm nothing was charged and get
 * out of the way.
 */
export default function CheckoutCancelledPage() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="max-w-xl">
        <p className="text-xs font-semibold tracking-[0.14em] text-slate-body uppercase">
          Checkout cancelled
        </p>
        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
          No payment was taken.
        </h1>
        <p className="text-slate-body mt-5 text-lg leading-relaxed text-pretty">
          You stopped before the payment went through, so nothing has been
          charged and no subscription has started. Your card details were never
          shared with us.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/pricing" className={`${primaryButton} w-full sm:w-auto`}>
            Back to pricing
          </Link>
          <Link href="/demo" className={`${secondaryButton} w-full sm:w-auto`}>
            Run the demo again
          </Link>
        </div>

        <p className="text-slate-body mt-8 text-sm">
          Something not working, or a question before you commit? Email{" "}
          <a
            href={`mailto:${BRAND.contactEmail}`}
            className="rounded-md font-medium text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {BRAND.contactEmail}
          </a>
          .
        </p>
      </div>
    </Container>
  );
}
