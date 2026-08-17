import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/marketing/brand";
import { MONTHLY_FEE_LABEL, SETUP_FEE_LABEL } from "@/lib/pricing";
import { readStripeConfig } from "@/lib/stripe/config";
import { retrieveCheckoutSession } from "@/lib/stripe/checkout";
import type { CheckoutSummary } from "@/lib/stripe/checkout";
import { OnboardingForm } from "@/components/checkout/OnboardingForm";
import { Container, primaryButton, secondaryButton } from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "You're set up",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sessionId = firstParam(params.session_id);
  const isPreview = firstParam(params.preview) === "1";

  // Confirm the payment server-side rather than trusting the redirect. No
  // webhook exists yet, so this is the only verification point.
  let summary: CheckoutSummary | null = null;
  if (sessionId) {
    const config = readStripeConfig();
    if (config) summary = await retrieveCheckoutSession(config, sessionId);
  }

  // A session id that Stripe does not recognise, or one that never completed.
  const paymentUnconfirmed = Boolean(sessionId) && (!summary || !summary.paid);

  if (paymentUnconfirmed) {
    return (
      <Container className="py-16 sm:py-24">
        <div className="max-w-xl">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
            We couldn&rsquo;t confirm that payment.
          </h1>
          <p className="text-slate-body mt-5 text-lg leading-relaxed text-pretty">
            The checkout didn&rsquo;t complete, or the link has expired. Nothing
            has been set up. If money has left your account, don&rsquo;t pay
            again. Email us and we&rsquo;ll sort it out.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/pricing" className={`${primaryButton} w-full sm:w-auto`}>
              Try checkout again
            </Link>
            <a
              href={`mailto:${BRAND.contactEmail}?subject=${encodeURIComponent("Payment problem")}`}
              className={`${secondaryButton} w-full sm:w-auto`}
            >
              Email us
            </a>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <span className="bg-clear-tint text-clear inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
          <span className="bg-clear size-1.5 rounded-full" aria-hidden="true" />
          {isPreview ? "Development preview" : "Payment received"}
        </span>

        <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl lg:text-[2.75rem]">
          You&rsquo;re set up. Here&rsquo;s what happens next.
        </h1>

        {isPreview ? (
          <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">No payment was taken.</strong>{" "}
            Stripe is not configured in this environment, so checkout was
            skipped to keep the rest of the site usable. This page is what a
            real customer would see.
          </p>
        ) : (
          <p className="text-slate-body mt-5 text-lg leading-relaxed text-pretty">
            {summary?.amountTotal && summary.currency ? (
              <>
                We&rsquo;ve taken{" "}
                <strong className="font-semibold text-ink">
                  {formatAmount(summary.amountTotal, summary.currency)}:
                </strong>{" "}
                {SETUP_FEE_LABEL} setup and your first month. Your next
                payment of {MONTHLY_FEE_LABEL} is a month from today.
              </>
            ) : (
              <>
                Your subscription is active. Stripe has emailed your receipt
                {summary?.customerEmail ? ` to ${summary.customerEmail}` : ""}.
              </>
            )}
          </p>
        )}
      </div>

      <ol className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            step: "01",
            title: "Tell us about your business",
            body: "Fill in the form below. It's the only thing we need from you.",
          },
          {
            step: "02",
            title: `We configure ${BRAND.name}`,
            body: "We set up your services, areas and questions, then send you a link to review it.",
          },
          {
            step: "03",
            title: "It goes live on your site",
            body: "We give you a snippet to paste in, or do it with your web person.",
          },
        ].map((item) => (
          <li key={item.step} className="border-hairline border-t-brand rounded-lg border border-t-2 bg-white p-5">
            <p className="text-slate-body font-mono text-xs font-medium">{item.step}</p>
            <h2 className="mt-2 text-base font-semibold text-ink">{item.title}</h2>
            <p className="text-slate-body mt-1.5 text-sm leading-relaxed text-pretty">
              {item.body}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <OnboardingForm />
      </div>

      <p className="text-slate-body mt-8 text-sm">
        Questions in the meantime? Email{" "}
        <a
          href={`mailto:${BRAND.contactEmail}`}
          className="rounded-md font-medium text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {BRAND.contactEmail}
        </a>
        . You can cancel any time from the link in your Stripe receipt.
      </p>
    </Container>
  );
}
