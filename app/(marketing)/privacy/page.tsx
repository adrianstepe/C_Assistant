import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, HAS_REGISTRATION_DETAILS } from "@/lib/marketing/brand";
import { isAssistantModelEnabled } from "@/lib/ai/deepseek";
import { Container } from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: `How ${BRAND.legalEntity} handles personal data collected through this website and the AI Quote Assistant.`,
};

// The notice states which processors are actually in use, which depends on
// server configuration.
export const dynamic = "force-dynamic";

/**
 * GDPR privacy notice.
 *
 * Written against Articles 13 and 14: controller identity, purposes, legal
 * bases, recipients, transfers, retention, rights and the right to complain.
 * It describes only what the application actually does — nothing here asserts
 * a certification, an audit, or a compliance status.
 *
 * REVIEW BEFORE LAUNCH — factual details only the operator can supply:
 *  - Registered address and registration number (`lib/marketing/brand.ts`).
 *    While blank, a visible notice appears on the page.
 *  - Whether a Data Protection Officer is required (Art. 37). Assumed not.
 *  - Confirmed retention periods once anything is stored server-side.
 *  - The transfer safeguard for DeepSeek (Art. 46). See the transfers section:
 *    this is the single biggest open compliance item and is flagged in-page
 *    while unresolved.
 */

const LAST_REVIEWED = "August 2026";

function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="border-hairline mt-10 border-t pt-8">
      <h2 className="text-xl font-semibold tracking-tight text-ink">{heading}</h2>
      <div className="text-slate-body mt-4 space-y-4 leading-relaxed">{children}</div>
    </section>
  );
}

function Mail() {
  return (
    <a
      href={`mailto:${BRAND.contactEmail}`}
      className="rounded-md font-medium text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {BRAND.contactEmail}
    </a>
  );
}

export default function PrivacyPage() {
  const modelEnabled = isAssistantModelEnabled();

  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Privacy notice
        </h1>
        <p className="text-slate-body mt-4 text-sm">Last reviewed: {LAST_REVIEWED}</p>
        <p className="text-slate-body mt-5 text-lg leading-relaxed text-pretty">
          This notice explains what personal data {BRAND.legalEntity} collects
          through this website and the AI Quote Assistant, why we collect it,
          who it is shared with, and what rights you have. It describes the
          service as it currently works.
        </p>

        {!HAS_REGISTRATION_DETAILS ? (
          <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">Incomplete.</strong> Our registered
            address and company registration number are still to be added to
            this notice. Until then, contact us at {BRAND.contactEmail} for our
            full company details.
          </p>
        ) : null}
      </div>

      <div className="max-w-2xl">
        <Section id="controller" heading="1. Who we are">
          <p>
            The data controller is <strong className="font-medium text-ink">{BRAND.legalEntity}</strong>,
            a company registered in {BRAND.jurisdiction}.
          </p>
          {HAS_REGISTRATION_DETAILS ? (
            <p>
              Registration number {BRAND.registrationNumber}. Registered address:{" "}
              {BRAND.registeredAddress}.
            </p>
          ) : null}
          <p>
            For anything in this notice, including any request about your data,
            contact <Mail />. We have not appointed a Data Protection Officer;
            data protection questions go to the same address.
          </p>
        </Section>

        <Section id="what-we-collect" heading="2. What we collect, and why">
          <p>
            <strong className="font-medium text-ink">The demo on this website.</strong>{" "}
            {modelEnabled ? (
              <>
                Messages you type into the demo are sent to our server and to our
                AI provider so a reply can be generated. We do not store the
                conversation: it is processed to produce the reply and then
                discarded. If you enter a name or email in the demo&rsquo;s
                contact step, that is held in your browser only and is not sent
                to us.
              </>
            ) : (
              <>
                The demo currently runs entirely in your browser. The
                conversation is not sent to a server, is not recorded, and is not
                visible to us. Anything you type, including any name or email
                entered at the demo&rsquo;s contact step, stays on your device
                and is discarded when you close or refresh the page.
              </>
            )}
          </p>
          <p>
            <strong className="font-medium text-ink">If you email us.</strong> Your
            name, email address and whatever you write. We use it to reply and to
            keep a record of what was discussed and agreed. Legal basis:
            legitimate interests (Art. 6(1)(f)), responding to someone who has
            contacted us, or, where you become a customer, performance of a
            contract (Art. 6(1)(b)).
          </p>
          <p>
            <strong className="font-medium text-ink">If you buy.</strong> Your
            billing name, email and payment details are collected by Stripe on
            its own checkout page. We never see or handle your card number.
            Stripe passes back the fact of payment, your billing name and email.
            Legal basis: performance of a contract (Art. 6(1)(b)) and compliance
            with our accounting obligations (Art. 6(1)(c)).
          </p>
          <p>
            <strong className="font-medium text-ink">Setup details.</strong> After
            purchase we ask for your company name, website, a contact name, email
            and phone number, the areas you cover and the services you offer. At
            present the setup form does not submit anywhere automatically: it
            prepares your answers for you to send us by email, and you choose
            whether to send them. Legal basis: performance of a contract.
          </p>
          <p>
            <strong className="font-medium text-ink">
              Enquiries from your customers, if you are a customer of ours.
            </strong>{" "}
            When the assistant runs on your website, it processes what the person
            enquiring types in order to produce a structured lead for you. For
            that data <em>you</em> are the controller and we act as your
            processor. See section 7.
          </p>
        </Section>

        <Section id="cookies" heading="3. Cookies and tracking">
          <p>
            This website sets no cookies and uses no analytics, advertising or
            tracking service. There is no consent banner because there is nothing
            to consent to.
          </p>
          <p>
            Our internal admin tool stores data in the browser&rsquo;s local
            storage, but that is not accessible to site visitors and holds no
            visitor data.
          </p>
        </Section>

        <Section id="recipients" heading="4. Who we share data with">
          <p>We use the following providers. No one else receives your data.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-ink">Vercel Inc.:</strong>{" "}
              hosting. Processes request data (including IP address) to serve and
              protect the site.
            </li>
            <li>
              <strong className="font-medium text-ink">Stripe:</strong> payment
              processing. Stripe acts as an independent controller for payment
              data under its own privacy policy.
            </li>
            {modelEnabled ? (
              <li>
                <strong className="font-medium text-ink">DeepSeek:</strong> the AI
                model that generates assistant replies. Message content typed into
                the assistant is sent to DeepSeek for processing.
              </li>
            ) : null}
            <li>
              <strong className="font-medium text-ink">Our email provider:</strong>{" "}
              correspondence sent to {BRAND.contactEmail}.
            </li>
          </ul>
          <p>
            We do not sell personal data, and we do not share it with third
            parties for their own marketing.
          </p>
        </Section>

        <Section id="transfers" heading="5. Transfers outside the EEA">
          <p>
            We are established in {BRAND.jurisdiction}, in the EU. Some of our
            providers process data outside the European Economic Area: Vercel
            in the United States, and, where the AI assistant is enabled,
            DeepSeek in China.
          </p>
          <p>
            Transfers to countries without an adequacy decision require
            appropriate safeguards under Chapter V of the GDPR, such as Standard
            Contractual Clauses together with an assessment of the destination
            country.
          </p>
          <p className="border-hairline bg-mist rounded-lg border px-4 py-3 text-sm">
            <strong className="font-semibold text-ink">
              Being straight with you:
            </strong>{" "}
            our transfer safeguards for AI processing are not yet finalised.
            Until they are, do not type personal data about identifiable people
            into the assistant. If this affects a decision you are making about
            using us, email <Mail /> and ask. We will tell you exactly where
            things stand rather than give you a reassuring non-answer.
          </p>
        </Section>

        <Section id="retention" heading="6. How long we keep it">
          <p>
            Email correspondence is kept for as long as it is useful for the
            relationship, and afterwards only where we need it for accounting or
            to defend a legal claim. Records relating to payments are kept for
            the period our accounting obligations require.
          </p>
          <p>
            Demo conversations are not retained. We do not currently operate a
            customer database: there is no account, no login and no stored
            profile for visitors.
          </p>
          <p>
            We have not yet set fixed retention periods in days, because there is
            not yet an automated store to enforce them against. When that
            changes, this section will state the periods.
          </p>
        </Section>

        <Section id="processor" heading="7. When we act as your processor">
          <p>
            If you buy the assistant, the enquiries it collects on your website
            are your data. You decide why and how they are processed; we process
            them on your instructions in order to provide the service. That makes
            you the controller and us your processor under Art. 28.
          </p>
          <p>
            Art. 28 requires a written data processing agreement between us
            before that processing starts. Ask for ours at <Mail />, and if you
            are buying, ask before you go live rather than after.
          </p>
        </Section>

        <Section id="automated" heading="8. Automated processing">
          <p>
            The assistant processes enquiries automatically to sort answers into
            structured fields. It does not make decisions producing legal or
            similarly significant effects about anyone, and it does not carry out
            profiling in that sense. A person always decides whether to quote and
            at what price.
          </p>
        </Section>

        <Section id="rights" heading="9. Your rights">
          <p>Under the GDPR you have the right to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>ask what personal data we hold about you, and get a copy (Art. 15);</li>
            <li>have inaccurate data corrected (Art. 16);</li>
            <li>have data erased in certain circumstances (Art. 17);</li>
            <li>restrict how we use it (Art. 18);</li>
            <li>receive it in a portable format (Art. 20);</li>
            <li>
              object to processing based on legitimate interests (Art. 21),
              including any direct marketing, at any time;
            </li>
            <li>withdraw consent where processing relies on it (Art. 7(3)).</li>
          </ul>
          <p>
            Email <Mail />. Because the personal data we hold is correspondence
            and setup details you have sent us, requests are handled by hand. We
            will respond within one month.
          </p>
          <p>
            If you are unhappy with our response you can complain to a
            supervisory authority. Ours is the Latvian{" "}
            <span className="text-ink">Datu valsts inspekcija</span> (State Data
            Inspectorate). You may also complain to the authority where you live
            or work: in the United Kingdom, the Information
            Commissioner&rsquo;s Office.
          </p>
        </Section>

        <Section id="changes" heading="10. Changes to this notice">
          <p>
            This notice will be updated as the service develops, particularly
            when data begins to be stored rather than emailed, and when the
            transfer safeguards in section 5 are settled. The date at the top
            shows when it was last reviewed.
          </p>
          <p className="text-sm">
            Related:{" "}
            <Link
              href="/terms"
              className="rounded-md font-medium text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Terms
            </Link>
          </p>
        </Section>
      </div>
    </Container>
  );
}
