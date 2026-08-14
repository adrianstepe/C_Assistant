import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, HAS_REGISTRATION_DETAILS } from "@/lib/marketing/brand";
import {
  MONTHLY_FEE_LABEL,
  PRODUCT_NAME,
  SETUP_FEE_LABEL,
} from "@/lib/pricing";
import { Container } from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "Terms",
  description: `Terms of service for the ${PRODUCT_NAME} from ${BRAND.name}.`,
};

/**
 * Starter terms of service.
 *
 * Describes only what is actually offered and configured. No warranty,
 * uptime commitment, certification or refund guarantee is asserted.
 *
 * Settled: the refund position is a full refund of the setup fee within 30 days
 * where the assistant is not live on the customer's site, and the registered
 * address and registration number are filled in (`lib/marketing/brand.ts`).
 *
 * REVIEW BEFORE LAUNCH — decisions still needed:
 *  - VAT treatment of these sales (see `lib/pricing.ts`), which affects whether
 *    the stated prices are the amount a customer actually pays.
 *  - Whether a formal cancellation notice period applies.
 *
 * Governing law is stated as Latvia, matching the country of establishment.
 * Confirm this is what you want for UK business customers before trading.
 */

const LAST_REVIEWED = "August 2026";

function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="border-hairline mt-10 border-t pt-8">
      <h2 className="text-xl font-semibold tracking-tight text-ink">{heading}</h2>
      <div className="text-slate-body mt-4 space-y-4 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Terms
        </h1>
        <p className="text-slate-body mt-4 text-sm">
          Last reviewed: {LAST_REVIEWED}
        </p>
        <p className="text-slate-body mt-5 text-lg leading-relaxed text-pretty">
          These terms cover the {PRODUCT_NAME} supplied by {BRAND.legalEntity}, a
          company registered in {BRAND.jurisdiction}. They describe the service
          as it is actually offered today.
        </p>

        {HAS_REGISTRATION_DETAILS ? (
          <p className="text-slate-body mt-4 text-sm">
            {BRAND.legalEntity}, registration number {BRAND.registrationNumber},
            registered address {BRAND.registeredAddress}.
          </p>
        ) : null}

        {!HAS_REGISTRATION_DETAILS ? (
          <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">Incomplete.</strong> Our registered
            address and company registration number are still to be added here.
            Email {BRAND.contactEmail} for our full company details.
          </p>
        ) : null}
      </div>

      <div className="max-w-2xl">
        <Section heading="What the service is">
          <p>
            The {PRODUCT_NAME} is an assistant that responds to cleaning
            enquiries submitted through your website, asks follow-up questions
            to establish the details a quote depends on, and sends your team a
            structured summary of each enquiry.
          </p>
          <p>
            It prepares and qualifies enquiries. It does not produce prices, and
            it does not commit you to any work. Every quote remains yours to
            make.
          </p>
        </Section>

        <Section heading="The demo is a demonstration">
          <p>
            The demo on this website is a scripted demonstration running in your
            browser. It shows how the assistant behaves and what the resulting
            lead looks like. It is not connected to a live cleaning company, it
            does not create real enquiries, and the example conversation, company
            and contact details in it are fictional.
          </p>
          <p>
            The demo is provided as an illustration of the product. It is not a
            representation that any particular result will be achieved for your
            business.
          </p>
        </Section>

        <Section heading="Price and payment">
          <p>
            The service is offered at {SETUP_FEE_LABEL} as a one-off setup
            charge, plus {MONTHLY_FEE_LABEL} per month. The setup charge and
            your first month are billed together on the first invoice. The
            monthly charge then recurs each month until cancelled.
          </p>
          <p>
            Payment and subscription billing are handled by Stripe. Prices shown
            are subject to any applicable taxes.
          </p>
        </Section>

        <Section heading="Setup and going live">
          <p>
            After payment we ask you for the details needed to configure the
            assistant: your services, the areas you cover, and the questions you
            want asked. We configure it from those answers and provide it for you
            to add to your website.
          </p>
          <p>
            Going live depends on receiving that information from you, and on
            the assistant being added to your site. Until both have happened,
            the service is in setup rather than in use.
          </p>
        </Section>

        <Section heading="Cancelling">
          <p>
            The subscription is monthly and rolling. There is no minimum term
            and no cancellation fee. You can cancel at any time, and the
            assistant continues to run until the end of the month you have
            already paid for. After that, no further payments are taken.
          </p>
          <p className="border-hairline bg-mist rounded-lg border px-4 py-3 text-sm">
            <strong className="font-semibold text-ink">Refunds.</strong> If the
            assistant is not live on your site, you can have the{" "}
            {SETUP_FEE_LABEL} setup fee back in full, provided you ask within 30
            days of paying it. Email{" "}
            <a
              href={`mailto:${BRAND.contactEmail}`}
              className="rounded-md font-medium text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {BRAND.contactEmail}
            </a>{" "}
            and say so — you do not have to give a reason. Nothing here removes
            any statutory right you may have.
          </p>
        </Section>

        <Section heading="What we do not promise">
          <p>
            We do not guarantee any particular number of enquiries, conversion
            rate or level of new business. The assistant handles the enquiries
            your website receives; how many of those there are, and whether they
            become work, depends on your market and your prices.
          </p>
          <p>
            We do not currently offer a service level agreement or an uptime
            guarantee. The service depends on third-party hosting and on
            services outside our control.
          </p>
        </Section>

        <Section heading="Your responsibilities">
          <p>
            You are responsible for the accuracy of the information you give us
            for setup, for the content of the answers the assistant is
            configured to give on your behalf, and for how you use the enquiries
            it passes to you, including complying with data protection law when
            you contact the people who made them.
          </p>
        </Section>

        <Section heading="Data protection">
          <p>
            Enquiries the assistant collects on your website are your data. You
            are the controller and we act as your processor. Article 28 of the
            GDPR requires a written data processing agreement between us before
            that processing begins. Ask for ours at{" "}
            <a
              href={`mailto:${BRAND.contactEmail}`}
              className="rounded-md font-medium text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {BRAND.contactEmail}
            </a>
            .
          </p>
          <p>
            How we handle personal data, including processing outside the EEA,
            is set out in our{" "}
            <Link
              href="/privacy"
              className="rounded-md font-medium text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              privacy notice
            </Link>
            . Read section 5 before going live.
          </p>
        </Section>

        <Section heading="Governing law">
          <p>
            These terms are governed by the law of {BRAND.jurisdiction}, and the
            courts of {BRAND.jurisdiction} have jurisdiction over any dispute.
            Nothing in these terms removes any mandatory legal protection
            available to you in your own country.
          </p>
        </Section>

        <Section heading="Contact and changes">
          <p>
            Questions about these terms go to{" "}
            <a
              href={`mailto:${BRAND.contactEmail}`}
              className="rounded-md font-medium text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {BRAND.contactEmail}
            </a>
            . These terms will be updated as the service develops; the date at
            the top shows when they were last reviewed.
          </p>
          <p className="text-sm">
            Related:{" "}
            <Link
              href="/privacy"
              className="rounded-md font-medium text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Privacy
            </Link>
          </p>
        </Section>
      </div>
    </Container>
  );
}
