import {
  MONTHLY_FEE_LABEL,
  PLAN_FEATURES,
  PLAN_TERMS,
  PRODUCT_NAME,
  SETUP_FEE_LABEL,
} from "@/lib/pricing";
import { CheckoutButton } from "./CheckoutButton";
import type { CheckoutMode } from "./CheckoutButton";

const tick = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m5 13 4 4L19 7" />
  </svg>
);

/**
 * The offer, priced and itemised.
 *
 * Both charges are stated at the same size — the monthly commitment is not
 * shrunk to make the headline look smaller.
 */
export function PricingPanel({ mode }: { mode: CheckoutMode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
      <div className="border-hairline rounded-2xl border bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-ink">
          What&rsquo;s included
        </h2>
        <ul className="mt-5 space-y-4">
          {PLAN_FEATURES.map((feature) => (
            <li key={feature.title} className="flex gap-3">
              <span className="bg-brand-tint mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-brand-dark">
                {tick}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink sm:text-base">
                  {feature.title}
                </h3>
                <p className="text-slate-body mt-1 text-sm leading-relaxed text-pretty">
                  {feature.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-hairline rounded-2xl border bg-white p-6 shadow-xl shadow-ink/[0.07] sm:p-8 lg:sticky lg:top-24">
        <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
          {PRODUCT_NAME}
        </p>

        <dl className="mt-5 space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-slate-body text-sm">One-off setup</dt>
            <dd className="text-2xl font-semibold tracking-tight text-ink tabular-nums">
              {SETUP_FEE_LABEL}
            </dd>
          </div>
          <div className="border-hairline flex items-baseline justify-between gap-4 border-t pt-4">
            <dt className="text-slate-body text-sm">Then every month</dt>
            <dd className="text-2xl font-semibold tracking-tight text-ink tabular-nums">
              {MONTHLY_FEE_LABEL}
              <span className="text-slate-body text-sm font-normal"> /mo</span>
            </dd>
          </div>
        </dl>

        <div className="bg-mist mt-5 rounded-lg px-4 py-3">
          <p className="text-sm text-ink">
            Due today:{" "}
            <strong className="font-semibold tabular-nums">
              {SETUP_FEE_LABEL} + {MONTHLY_FEE_LABEL}
            </strong>
          </p>
          <p className="text-slate-body mt-1 text-xs">
            Setup and your first month are charged together on the first
            invoice.
          </p>
        </div>

        <div className="mt-6">
          <CheckoutButton mode={mode} />
        </div>

        <h3 className="text-slate-body mt-6 text-xs font-semibold tracking-wide uppercase">
          Terms in plain English
        </h3>
        <ul className="mt-2 space-y-2">
          {PLAN_TERMS.map((term) => (
            <li key={term} className="text-slate-body flex gap-2 text-xs leading-relaxed">
              <span aria-hidden="true" className="text-brand">
                •
              </span>
              {term}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
