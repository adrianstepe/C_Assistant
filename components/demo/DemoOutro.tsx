"use client";

import Link from "next/link";
import { MONTHLY_FEE_LABEL, SETUP_FEE_LABEL } from "@/lib/pricing";
import { track } from "@/lib/analytics";
import { ghostButtonOnDark, primaryButton } from "@/components/marketing/primitives";

/**
 * Sales close, shown only once the visitor has watched a lead get qualified.
 *
 * The price is stated here rather than hidden behind the click: someone who
 * has just seen the product work deserves to know what it costs before they
 * commit to another page.
 */
export function DemoOutro({ onRestart }: { onRestart: () => void }) {
  return (
    <section
      aria-labelledby="demo-outro-heading"
      className="bg-ink relative overflow-hidden rounded-2xl px-6 py-10 text-center sm:px-10 sm:py-12"
    >
      <div aria-hidden="true" className="ink-grid pointer-events-none absolute inset-0" />

      <div className="relative">
        <h2
          id="demo-outro-heading"
          className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-balance text-white sm:text-3xl"
        >
          Imagine every quote enquiry being handled like this automatically.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-pretty text-white/70">
          Same questions, same structure, every time — at two in the morning or
          halfway through a Friday site visit.
        </p>

        <p className="mt-6 text-sm font-medium text-white/90">
          {SETUP_FEE_LABEL} setup, then {MONTHLY_FEE_LABEL} a month · cancel any
          time
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/pricing"
            onClick={() =>
              track({
                name: "cta_clicked",
                properties: { id: "get_this_for_your_business", location: "demo_outro" },
              })
            }
            className={`${primaryButton} w-full sm:w-auto`}
          >
            Get this for your business
          </Link>
          <button
            type="button"
            onClick={onRestart}
            className={`${ghostButtonOnDark} w-full sm:w-auto`}
          >
            Run the demo again
          </button>
        </div>
      </div>
    </section>
  );
}
