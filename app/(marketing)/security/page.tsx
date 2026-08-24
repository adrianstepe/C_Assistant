import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/marketing/brand";
import {
  DATABASE_VENDOR_LABEL,
  EMAIL_DELIVERY_VENDOR_LABEL,
  RETENTION_DAYS_AFTER_DELIVERY,
  RETENTION_HARD_CEILING_DAYS,
} from "@/lib/marketing/legal";
import { readLeadsDatabaseConfig } from "@/lib/db/config";
import { serverFlagEnabled } from "@/lib/env";
import { isAssistantModelEnabled } from "@/lib/ai/deepseek";
import { Container } from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "Security",
  description: `How ${BRAND.legalEntity} protects the data it holds: hosting, storage, access and retention.`,
};

// Like the privacy notice's processor bullets, the statements here depend on
// live configuration and are therefore resolved per request.
export const dynamic = "force-dynamic";

/**
 * The security page.
 *
 * Stated honestly and proportionately: what is actually done, and no
 * invented certifications, audits or badges. Every claim here must stay
 * consistent with the privacy notice (sections 4 to 6 in particular) — the
 * vendor names come from the same constants file (`lib/marketing/legal.ts`)
 * precisely so the two pages cannot contradict each other.
 *
 * REVIEW BEFORE LAUNCH — same list as the privacy notice header: fill in the
 * vendor labels once provisioned; re-read this page against reality before
 * real traffic (the plan's phase-4 item "a proper security review against
 * reality" covers a deeper pass).
 */

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-hairline mt-6 border-t pt-6">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{label}</h2>
      <div className="text-slate-body mt-3 space-y-3 leading-relaxed">{children}</div>
    </div>
  );
}

function VendorName({ label }: { label: string }) {
  if (label !== "") return <>{label}</>;
  return (
    <span className="text-amber-700">
      not named yet &mdash; stated here before any customer goes live
    </span>
  );
}

export default function SecurityPage() {
  const databaseLive = readLeadsDatabaseConfig() !== null;
  const leadEmailLive = serverFlagEnabled("EMAIL_SENDING_ENABLED");
  const modelEnabled = isAssistantModelEnabled();

  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Security
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-pretty">
          What we do to look after the data we hold. Deliberately plain: what
          we actually do, and nothing we cannot point at in our own systems. We
          hold no certifications and make no audit claims.
        </p>
        <p className="mt-4 text-sm">
          Questions about anything on this page go to{" "}
          <a
            href={`mailto:${BRAND.contactEmail}`}
            className="rounded-md font-medium text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {BRAND.contactEmail}
          </a>
          .
        </p>
      </div>

      <div className="max-w-2xl">
        <Fact label="Where the service runs">
          <p>
            On Vercel&rsquo;s platform, served over HTTPS only. Vercel also
            terminates connections and absorbs abusive traffic before it
            reaches the application.
          </p>
          <p>
            Customer enquiry pages load no third-party scripts, fonts included;
            everything renders from first-party code. There is nothing on an
            enquiry page for anyone else to track through.
          </p>
        </Fact>

        <Fact label="Where data is stored">
          <p>
            Setup details and completed enquiries live in one database created
            in an EU region, so that data does not leave the EEA during its
            lifecycle. The provider is <VendorName label={DATABASE_VENDOR_LABEL} />.
          </p>
          {!databaseLive ? (
            <p className="bg-mist border-hairline rounded-lg border px-4 py-3 text-sm">
              Right now nothing is stored anywhere: the datastore is not yet
              switched on for this deployment. This statement updates itself
              when it is.
            </p>
          ) : null}
        </Fact>

        <Fact label="How access is controlled">
          <p>
            Secrets (payment keys, database credentials, mail credentials) live
            only in deployment environment configuration, never in code or
            repositories. The internal admin area sits behind HTTP basic
            authentication over HTTPS and fails closed: unconfigured, it stays
            locked rather than falling open.
          </p>
          <p>
            There are deliberately no customer accounts. A cleaning company
            never logs in, so there are no customer passwords to leak; their
            enquiries go straight to the mailbox they nominate.
          </p>
        </Fact>

        <Fact label="Enquiry handling">
          <p>
            Completed enquiries are stored only so they can be delivered
            reliably to the cleaning company concerned, and are deleted{" "}
            {RETENTION_DAYS_AFTER_DELIVERY} days after delivery, with a hard
            ceiling of {RETENTION_HARD_CEILING_DAYS} days from receipt whatever
            their status. Deletion runs as scheduled code, not as intention.
          </p>
          {leadEmailLive ? (
            <p>
              Enquiry emails are sent from linwick.co.uk by{" "}
              <VendorName label={EMAIL_DELIVERY_VENDOR_LABEL} />, transactional
              delivery only, with replies addressed directly to the cleaning
              company. If a lead cannot be delivered, it is flagged and a human
              is told rather than it disappearing quietly.
            </p>
          ) : (
            <p className="bg-mist border-hairline rounded-lg border px-4 py-3 text-sm">
              Automated email delivery is not yet switched on; enquiries are
              checked and forwarded by hand while it is off.
            </p>
          )}
        </Fact>

        <Fact label="AI processing">
          <p>
            {modelEnabled
              ? "The optional AI wording feature is currently enabled."
              : "The optional AI wording feature is switched off."}{" "}
            It stays off until a lawful transfer mechanism exists for sending
            enquiry content outside the EEA, because that safeguard is not in
            place today &mdash; the same position, in detail,{" "}
            <Link
              href="/privacy"
              className="rounded-md font-medium text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              our privacy notice
            </Link>{" "}
            explains in section 5.
          </p>
        </Fact>

        <Fact label="If something goes wrong">
          <p>
            Failures are built to be visible: an enquiry that cannot be
            delivered is marked as such and escalates to a person, and payment
            failures alert us directly. If a personal data breach ever affects
            your data, we tell you without undue delay, as GDPR Article 33(2)
            requires of a processor.
          </p>
        </Fact>
      </div>
    </Container>
  );
}
