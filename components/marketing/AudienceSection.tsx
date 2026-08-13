import { AUDIENCE_FITS, AUDIENCE_MISFITS } from "@/lib/marketing/content";
import { Container, SectionHeading } from "./primitives";

const tickIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m5 13 4 4L19 7" />
  </svg>
);

const dashIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M6 12h12" />
  </svg>
);

export function AudienceSection() {
  return (
    <section id="who-its-for" className="bg-mist">
      <Container className="py-20 sm:py-28">
        <SectionHeading
          eyebrow="Who it’s for"
          title="Built for commercial cleaning, not adapted from something generic."
          lead="The questions, the vocabulary and the lead format assume a cleaning business. That makes it sharper here — and a poor fit elsewhere."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="border-hairline rounded-xl border bg-white p-6 sm:p-8">
            <h3 className="text-base font-semibold text-ink">
              A good fit if you’re
            </h3>
            <ul className="mt-5 space-y-3.5">
              {AUDIENCE_FITS.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 text-brand">{tickIcon}</span>
                  <span className="text-slate-body text-sm leading-relaxed sm:text-base">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-hairline rounded-xl border border-dashed bg-white/50 p-6 sm:p-8">
            <h3 className="text-base font-semibold text-ink">
              Probably not worth it if
            </h3>
            <ul className="mt-5 space-y-3.5">
              {AUDIENCE_MISFITS.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-slate-body mt-0.5 shrink-0">
                    {dashIcon}
                  </span>
                  <span className="text-slate-body text-sm leading-relaxed sm:text-base">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-slate-body mt-6 text-sm">
              We’d rather tell you now than after you’ve paid for a month.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
