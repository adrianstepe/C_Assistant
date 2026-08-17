import Link from "next/link";
import { BRAND } from "@/lib/marketing/brand";
import { Container, ghostButtonOnDark, primaryButton } from "./primitives";

export function FinalCta() {
  return (
    <section id="see-how-it-works" className="relative overflow-hidden bg-ink">
      <div
        aria-hidden="true"
        className="ink-grid pointer-events-none absolute inset-0"
      />

      <Container className="relative py-20 text-center sm:py-28">
        <h2 className="font-display mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl lg:text-[2.75rem]">
          See how it works before you talk to anyone.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-white/70 sm:text-lg">
          Send it an enquiry the way one of your customers would, and read what
          it hands over. No form, no call, no commitment.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/demo" className={`${primaryButton} w-full sm:w-auto`}>
            See how it works
          </Link>
          <a
            href={`mailto:${BRAND.contactEmail}`}
            className={`${ghostButtonOnDark} w-full sm:w-auto`}
          >
            Email us a question
          </a>
        </div>
      </Container>
    </section>
  );
}
