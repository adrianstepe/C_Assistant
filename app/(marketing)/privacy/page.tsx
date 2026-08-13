import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/marketing/brand";
import { Container } from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${BRAND.name} handles personal data collected through this website.`,
};

/**
 * Starter privacy notice.
 *
 * Written to describe only what the application actually does today. Nothing
 * here asserts a certification, a registration, a retention period that is not
 * enforced by code, or a compliance status.
 *
 * REVIEW BEFORE LAUNCH — factual details still required:
 *  - Full registered entity name, registered address and company number, if
 *    the business trades through a registered company.
 *  - Whether an ICO registration is required and, if so, the reference.
 *  - Confirmed retention periods once anything is actually stored.
 *  - Re-write the "What we store" section the moment a database, analytics
 *    provider or email sending service is introduced — every one of those
 *    changes the answers below.
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

export default function PrivacyPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Privacy
        </h1>
        <p className="text-slate-body mt-4 text-sm">
          Last reviewed: {LAST_REVIEWED}
        </p>
        <p className="text-slate-body mt-5 text-lg leading-relaxed text-pretty">
          This notice explains what this website collects, why, and what happens
          to it. It describes the service as it currently works, and will be
          updated as the service changes.
        </p>
      </div>

      <div className="max-w-2xl">
        <Section heading="Who is responsible">
          <p>
            This website and the AI Quote Assistant service are operated by{" "}
            {BRAND.legalEntity}. For anything relating to your personal data,
            contact{" "}
            <a
              href={`mailto:${BRAND.contactEmail}`}
              className="rounded-md font-medium text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {BRAND.contactEmail}
            </a>
            .
          </p>
        </Section>

        <Section heading="The demo on this site">
          <p>
            The quote assistant demo runs entirely in your browser. The
            conversation is not sent to a server, is not recorded, and is not
            visible to us. Anything you type into it — including any name or
            email you enter in the demo&rsquo;s contact step — stays on your
            device and is discarded when you close or refresh the page.
          </p>
          <p>
            The demo exists to show how the product behaves. It is not connected
            to a live cleaning company and no enquiry is created from it.
          </p>
        </Section>

        <Section heading="If you contact us">
          <p>
            Every contact route on this site opens an email to{" "}
            {BRAND.contactEmail}. If you email us, we hold that correspondence
            in our mailbox in order to reply to you and to keep a record of what
            was agreed. That is ordinary business correspondence, kept for as
            long as it is useful for that purpose.
          </p>
        </Section>

        <Section heading="If you buy the service">
          <p>
            Payment is taken through Stripe. You enter your card and billing
            details on Stripe&rsquo;s own checkout page, not on this site. We
            never see or handle your card number. Stripe processes that
            information as a separate controller under its own privacy policy,
            and passes back to us only the fact that a payment succeeded, along
            with the billing name and email you gave it.
          </p>
          <p>
            After payment, we ask you for setup details — your company name,
            website, a contact name, email and phone number, the areas you
            cover, and the services you offer. At present that form does not
            save anywhere automatically: it prepares the answers for you to send
            to us by email, and you choose whether to send them. Once sent, they
            sit in our mailbox and are used to configure your assistant.
          </p>
        </Section>

        <Section heading="What we do not do">
          <p>
            We do not use advertising or tracking cookies, and there is no
            analytics or tracking provider on this website. We do not sell or
            share personal data with third parties for their own marketing. We
            do not currently operate a customer database — there is no account,
            no login and no stored profile for visitors or customers.
          </p>
        </Section>

        <Section heading="Technical logs">
          <p>
            This site is hosted on Vercel. Like any web host, Vercel records
            technical information about requests — such as IP address, browser
            type and the page requested — for the purposes of serving the site
            and protecting it from abuse. That logging is performed by Vercel
            under its own terms and retention schedule; we do not maintain a
            separate log of visitors.
          </p>
        </Section>

        <Section heading="Third parties actually used">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-ink">Vercel</strong> —
              hosting and delivery of this website.
            </li>
            <li>
              <strong className="font-medium text-ink">Stripe</strong> —
              payment processing and subscription billing, if you buy.
            </li>
          </ul>
          <p>
            No other third-party service receives data from this website. If
            that changes, this section changes with it.
          </p>
        </Section>

        <Section heading="Your rights">
          <p>
            You can ask what personal data we hold about you, ask for it to be
            corrected or deleted, ask us to restrict how it is used, or object
            to its use. Because the only personal data we currently hold is
            email correspondence and setup details you have sent us, requests
            are handled by hand.
          </p>
          <p>
            Email{" "}
            <a
              href={`mailto:${BRAND.contactEmail}`}
              className="rounded-md font-medium text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {BRAND.contactEmail}
            </a>{" "}
            and we will respond. If you are in the UK or the EU and you are not
            satisfied with our response, you have the right to complain to your
            national data protection authority — in the UK, that is the
            Information Commissioner&rsquo;s Office.
          </p>
        </Section>

        <Section heading="Changes">
          <p>
            This notice will be updated as the service develops, particularly
            when data starts being stored rather than emailed. The date at the
            top shows when it was last reviewed.
          </p>
          <p className="text-sm">
            Related:{" "}
            <Link
              href="/terms"
              className="rounded-md font-medium text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Terms
            </Link>
          </p>
        </Section>
      </div>
    </Container>
  );
}
