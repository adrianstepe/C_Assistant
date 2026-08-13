import type { ReactNode } from "react";
import { WORKFLOW_STEPS } from "@/lib/marketing/content";
import { Container, SectionHeading } from "./primitives";

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** One icon per workflow step, in order. Plain strokes — no mascots. */
const STEP_ICONS: readonly ReactNode[] = [
  <svg key="inbox" {...iconProps}>
    <path d="M3 12h5l1.5 3h5L16 12h5" />
    <path d="M4.5 6h15l1.5 6v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Z" />
  </svg>,
  <svg key="reply" {...iconProps}>
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.9-.9L3 20.5l1.6-4.6A8.4 8.4 0 0 1 12 3.5a8.4 8.4 0 0 1 9 8Z" />
  </svg>,
  <svg key="ask" {...iconProps}>
    <path d="M9.2 9a2.8 2.8 0 1 1 3.6 2.7c-.5.2-.8.7-.8 1.3v.5" />
    <path d="M12 17h.01" />
    <circle cx="12" cy="12" r="9" />
  </svg>,
  <svg key="structure" {...iconProps}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9.5h18M9.5 9.5V20" />
  </svg>,
  <svg key="delivered" {...iconProps}>
    <path d="M4 6.5h16v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" />
    <path d="m4.6 7 7.4 6 7.4-6" />
    <path d="m15.5 15.5 1.7 1.7 3.3-3.4" />
  </svg>,
];

export function WorkflowSection() {
  return (
    <section id="workflow" className="bg-mist">
      <Container className="py-20 sm:py-28">
        <SectionHeading
          eyebrow="The solution"
          title="One path, from “can you quote this?” to a lead your team can price."
          lead="No new inbox to watch. No process for your supervisors to remember. It runs on the enquiries your website already receives."
        />

        <ol className="mt-14 grid gap-4 sm:gap-5 lg:grid-cols-5">
          {WORKFLOW_STEPS.map((step, index) => (
            <li key={step.title} className="relative flex lg:block">
              {/* Rail: vertical on small screens, horizontal from lg. */}
              <div
                aria-hidden="true"
                className="flex flex-col items-center lg:hidden"
              >
                <span className="border-hairline flex size-10 shrink-0 items-center justify-center rounded-full border bg-white text-brand">
                  {STEP_ICONS[index]}
                </span>
                {index < WORKFLOW_STEPS.length - 1 ? (
                  <span className="bg-hairline w-px flex-1" />
                ) : null}
              </div>

              <div className="border-hairline ml-4 flex-1 rounded-xl border bg-white p-5 shadow-sm shadow-ink/[0.03] lg:ml-0 lg:h-full">
                <div
                  aria-hidden="true"
                  className="mb-4 hidden size-10 items-center justify-center rounded-full border border-hairline bg-mist text-brand lg:flex"
                >
                  {STEP_ICONS[index]}
                </div>
                <p className="text-slate-body font-mono text-xs">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1.5 text-base font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="text-slate-body mt-2 text-sm leading-relaxed text-pretty">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
