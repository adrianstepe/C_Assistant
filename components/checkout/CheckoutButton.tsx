"use client";

import { useActionState } from "react";
import type { CheckoutState } from "@/app/(marketing)/pricing/actions";
import { startCheckout } from "@/app/(marketing)/pricing/actions";
import { BRAND } from "@/lib/marketing/brand";
import { track } from "@/lib/analytics";
import { primaryButton, secondaryButton } from "@/components/marketing/primitives";

/** Mirrors `CheckoutAvailability["kind"]`; the config itself stays server-side. */
export type CheckoutMode = "live" | "dev-preview" | "unavailable";

const initialState: CheckoutState = {};

export function CheckoutButton({ mode }: { mode: CheckoutMode }) {
  const [state, formAction, isPending] = useActionState(
    startCheckout,
    initialState,
  );

  if (mode === "unavailable") {
    return (
      <div>
        <a
          href={`mailto:${BRAND.contactEmail}?subject=${encodeURIComponent(`${BRAND.name}: I'd like to get set up`)}`}
          onClick={() =>
            track({
              name: "cta_clicked",
              properties: { id: "checkout_unavailable_email", location: "pricing" },
            })
          }
          className={`${primaryButton} w-full justify-center`}
        >
          Email us to get started
        </a>
        <p className="text-slate-body mt-3 text-sm">
          Card payment isn&rsquo;t switched on yet. Send us a line and we&rsquo;ll
          set you up directly.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={isPending}
        onClick={() =>
          track({
            name: "cta_clicked",
            properties: { id: "start_checkout", location: "pricing" },
          })
        }
        className={`${primaryButton} w-full justify-center disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isPending ? "Taking you to checkout…" : "Get set up"}
      </button>

      <p className="text-slate-body mt-3 text-center text-xs">
        Secure payment handled by Stripe. We never see your card details.
      </p>

      {mode === "dev-preview" ? (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <strong className="font-semibold">Development mode.</strong> Stripe
          keys are not configured, so this skips payment entirely and goes
          straight to the success page. No money moves.
        </p>
      ) : null}

      {state.error ? (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5"
        >
          <p className="text-sm text-rose-800">{state.error}</p>
          <a
            href={`mailto:${BRAND.contactEmail}?subject=${encodeURIComponent("Trouble with checkout")}`}
            className={`${secondaryButton} mt-2 px-3 py-1.5 text-xs`}
          >
            Email us instead
          </a>
        </div>
      ) : null}
    </form>
  );
}
