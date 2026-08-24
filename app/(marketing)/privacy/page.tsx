import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, HAS_REGISTRATION_DETAILS } from "@/lib/marketing/brand";
import {
  DATABASE_VENDOR_LABEL,
  EMAIL_DELIVERY_VENDOR_LABEL,
  RETENTION_DAYS_AFTER_DELIVERY,
  RETENTION_HARD_CEILING_DAYS,
} from "@/lib/marketing/legal";
import { isAssistantModelEnabled } from "@/lib/ai/deepseek";
import { readLeadsDatabaseConfig } from "@/lib/db/config";
import { serverFlagEnabled } from "@/lib/env";
import { Container } from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: `How ${BRAND.legalEntity} handles personal data collected through this website and ${BRAND.name}.`,
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
 * a certification, an audit, or a compliance status. Like the model bullet,
 * the database and lead-email bullets render from live server configuration,
 * so this notice cannot claim a processor that is not actually switched on —
 * and stops claiming one the moment it is disabled.
 *
 * Settled: the registered address and registration number are filled in
 * (`lib/marketing/brand.ts`); retention periods for stored enquiries are
 * stated in section 6 and enforced by `/api/retention`.
 *
 * REVIEW BEFORE LAUNCH — factual details only the operator can supply:
 *  - Whether a Data Protection Officer is required (Art. 37). Assumed not.
 *  - The database vendor's name once provisioned
 *    (`DATABASE_VENDOR_LABEL` in `lib/marketing/legal.ts`).
 *  - The lead email vendor's name once that account exists
 *    (`EMAIL_DELIVERY_VENDOR_LABEL`).
 *  - The transfer safeguard for DeepSeek (Art. 46). See the transfers section:
 *    this is the single biggest open compliance item and is flagged in-page
 *    while unresolved. The model is switched off by default until it is
 *    resolved — see `ASSISTANT_MODEL_ENABLED` in `lib/ai/deepseek.ts`.
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
  // Which processors are actually in use is a server-side fact, so these are
  // resolved per request rather than baked into the page.
  const databaseLive = readLeadsDatabaseConfig() !== null;
  const leadEmailLive = serverFlagEnabled("EMAIL_SENDING_ENABLED");

  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Privacy notice
        </h1>
        <p className="text-slate-body mt-4 text-sm">Last reviewed: {LAST_REVIEWED}</p>
        <p className="text-slate-body mt-5 text-lg leading-relaxed text-pretty">
          This notice explains what personal data {BRAND.legalEntity} collects
          through this website and {BRAND.name}, why we collect it,
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
            and phone number, the areas you cover and the services you offer.
            Submitting the form stores those answers so we can configure your
            assistant; until a person has checked them against your subscription
            they are inactive, and nothing runs on your behalf. Legal basis:
            performance of a contract.
          </p>
          <p>
            <strong className="font-medium text-ink">
              Enquiries from your customers, if you are a customer of ours.
            </strong>{" "}
            When {BRAND.name} runs on your hosted enquiry page, it processes what
            the person enquiring types in order to produce a structured enquiry
            for you. The completed enquiry is stored only so it can be delivered
            to you reliably, and is deleted on the schedule in section 6. For
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
                {BRAND.name} is sent to DeepSeek for processing.
              </li>
            ) : null}
            {databaseLive ? (
              DATABASE_VENDOR_LABEL ? (
                <li>
                  <strong className="font-medium text-ink">
                    {DATABASE_VENDOR_LABEL}:
                  </strong>{" "}
                  our EU-region database. Stores customer setup details and
                  completed enquiries on behalf of our customers, until they are
                  delivered and deleted (section 6).
                </li>
              ) : (
                <li>
                  <strong className="font-medium text-ink">
                    Our database provider:
                  </strong>{" "}
                  an EU-region database storing customer setup details and
                  completed enquiries.{" "}
                  <span className="text-amber-700">
                    The provider&rsquo;s name will be stated here before live
                    traffic; it is not yet confirmed.
                  </span>
                </li>
              )
            ) : null}
            {leadEmailLive ? (
              EMAIL_DELIVERY_VENDOR_LABEL ? (
                <li>
                  <strong className="font-medium text-ink">
                    {EMAIL_DELIVERY_VENDOR_LABEL}:
                  </strong>{" "}
                  transactional delivery of completed enquiries to our
                  customers, sent from linwick.co.uk with replies addressed
                  straight back to the customer concerned.
                </li>
              ) : (
                <li>
                  <strong className="font-medium text-ink">
                    Our email delivery provider:
                  </strong>{" "}
                  transactional delivery of completed enquiries.{" "}
                  <span className="text-amber-700">
                    The provider&rsquo;s name will be stated here before live
                    traffic; it is not yet confirmed.
                  </span>
                </li>
              )
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
            in the United States, and, where the optional AI model behind{" "}
            {BRAND.name} is enabled, DeepSeek in China.
          </p>
          <p>
            The database holding customer setup details and completed enquiries
            is created in an EU region on purpose, so that data does not leave
            the EEA at any point of its lifecycle. Enquiry emails are sent from
            within the EEA to our customer&rsquo;s nominated mailbox; where that
            mailbox itself sits outside the EEA, that is our customer&rsquo;s
            arrangement as controller.
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
            into {BRAND.name}. If this affects a decision you are making about
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
            Demo conversations are not retained. There is no account, no login
            and no stored profile for visitors to this website.
          </p>
          <p>
            Completed enquiries from customers&rsquo; enquiry pages are stored
            only until they are delivered, and are deleted{" "}
            {RETENTION_DAYS_AFTER_DELIVERY} days after successful delivery. No
            enquiry is kept longer than {RETENTION_HARD_CEILING_DAYS} days after
            it was received, whatever its status. Both limits are enforced by a
            scheduled deletion job in our code, not by good intentions.
          </p>
          <p>
            Setup details for an active customer are kept while the subscription
            lasts, and afterwards only where we need them for accounting or to
            defend a legal claim.
          </p>
        </Section>

        <Section id="processor" heading="7. When we act as your processor">
          <p>
            If you buy {BRAND.name}, the enquiries it collects on your hosted
            enquiry page are your data. You decide why and how they are
            processed; we process them on your instructions in order to provide
            the service. That makes you the controller and us your processor
            under Art. 28.
          </p>
          <p>
            Art. 28 requires a written data processing agreement between us
            before that processing starts. Our standard one-page agreement,
            which states what we process, the retention schedule in section 6,
            the sub-processors listed in section 4, and how we help with data
            subject requests, is available on request at <Mail />. If you are
            buying, ask before you go live rather than after. You will be told
            in advance before new sub-processors are added, and may object.
          </p>
          <p>
            The security measures we apply while holding that data &mdash;
            EU-region storage, TLS, environment-held secrets, no third-party
            scripts on enquiry pages &mdash; are described on our{" "}
            <Link
              href="/security"
              className="rounded-md font-medium text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              security page
            </Link>
            .
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
            Email <Mail />. What we hold is correspondence, setup details, and
            &mdash; for active customers &mdash; enquiries still inside their
            retention window. All of it sits in one queryable store and one
            mailbox, so a request is answered by direct search rather than by
            guesswork. Requests are handled by hand and we will respond within
            one month.
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
