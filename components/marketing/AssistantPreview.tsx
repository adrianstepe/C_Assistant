"use client";

import { useEffect, useRef, useState } from "react";
import {
  LOOP_PAUSE_MS,
  PREVIEW_COMPANY,
  PREVIEW_STEPS,
  STEP_DURATION_MS,
} from "@/lib/marketing/preview-script";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { TypingDots } from "@/components/ui/TypingDots";

const TOTAL = PREVIEW_STEPS.length;

/**
 * Scripted product preview: the conversation on the left, the enquiry being
 * assembled on the right.
 *
 * The animated view is `aria-hidden` and paired with a complete static
 * transcript for assistive tech, so screen readers get the whole exchange at
 * once instead of a stream of timed updates. A pause control is provided
 * because the content auto-advances (WCAG 2.2.2), and the whole thing renders
 * finished when the user prefers reduced motion.
 */
export function AssistantPreview() {
  const reducedMotion = usePrefersReducedMotion();
  const [step, setStep] = useState(1);
  const [playing, setPlaying] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const shown = reducedMotion ? TOTAL : step;
  const revealed = PREVIEW_STEPS.slice(0, shown);
  const fields = revealed.flatMap((entry) => entry.fields ?? []);
  const latestLabels = new Set(
    (revealed.at(-1)?.fields ?? []).map((field) => field.label),
  );
  const nextRole = PREVIEW_STEPS[shown]?.message.role;
  const showTyping = !reducedMotion && playing && nextRole === "assistant";

  useEffect(() => {
    if (reducedMotion || !playing) return;
    const finished = step >= TOTAL;
    const timer = setTimeout(
      () => setStep(finished ? 1 : step + 1),
      finished ? LOOP_PAUSE_MS : STEP_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [step, playing, reducedMotion]);

  // Keep the newest message in view inside the transcript pane only.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [shown, showTyping]);

  return (
    <div className="border-hairline overflow-hidden rounded-lg border bg-white shadow-xl shadow-ink/[0.07]">
      <header className="border-hairline bg-mist/70 flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="size-2 shrink-0 rounded-full bg-brand"
            aria-hidden="true"
          />
          <p className="text-slate-body truncate text-xs font-medium sm:text-sm">
            Enquiry from your website
          </p>
        </div>

        {reducedMotion ? null : (
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-pressed={!playing}
            className="border-hairline text-slate-body inline-flex min-h-8 shrink-0 items-center rounded-md border bg-white px-3 text-xs font-medium transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {playing ? "Pause" : "Play"}
            <span className="sr-only"> the example conversation</span>
          </button>
        )}
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Animated view — hidden from assistive tech, mirrored below. */}
        <div
          aria-hidden="true"
          className="border-hairline border-b lg:border-r lg:border-b-0"
        >
          <div
            ref={scrollRef}
            className="h-[22rem] space-y-3 overflow-y-auto px-4 py-4 sm:h-[26rem] sm:px-5"
          >
            {revealed.map((entry, index) => {
              const isCustomer = entry.message.role === "customer";
              return (
                <div
                  key={index}
                  className={`animate-message-in flex ${isCustomer ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isCustomer
                        ? "bg-mist text-ink rounded-bl-md"
                        : "bg-ink rounded-br-md text-white"
                    }`}
                  >
                    <p
                      className={`mb-1 text-[0.6875rem] font-semibold tracking-wide uppercase ${
                        isCustomer ? "text-slate-body" : "text-white/55"
                      }`}
                    >
                      {isCustomer ? "Customer" : PREVIEW_COMPANY}
                    </p>
                    {entry.message.text}
                  </div>
                </div>
              );
            })}

            {showTyping ? (
              <div className="flex justify-end">
                <div className="bg-mist rounded-2xl rounded-br-md px-3.5 py-3">
                  <TypingDots />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* The fields extracted so far. */}
        <div aria-hidden="true" className="bg-mist/40 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold tracking-[0.12em] text-ink uppercase">
              Ready to price
            </h3>
            <span className="text-slate-body font-mono text-xs tabular-nums">
              {fields.length} fields
            </span>
          </div>

          {fields.length === 0 ? (
            <p className="text-slate-body mt-4 text-sm">
              Waiting for the first message…
            </p>
          ) : (
            <dl className="mt-3">
              {fields.map((field) => (
                <div
                  key={field.label}
                  className={`border-hairline/70 border-t py-2 first:border-t-0 ${
                    latestLabels.has(field.label) ? "animate-field-in" : ""
                  }`}
                >
                  <dt className="text-slate-body text-[0.6875rem] font-medium tracking-wide uppercase">
                    {field.label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium break-words text-ink">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {shown >= TOTAL ? (
            <p className="bg-clear-tint text-clear mt-4 rounded-lg px-3 py-2 text-xs font-medium">
              Sent to your team · ready to price
            </p>
          ) : null}
        </div>
      </div>

      {/* Complete, untimed version for assistive technology. */}
      <div className="sr-only">
        <h3>Example conversation</h3>
        <ol>
          {PREVIEW_STEPS.map((entry, index) => (
            <li key={index}>
              <strong>
                {entry.message.role === "customer"
                  ? "Customer"
                  : PREVIEW_COMPANY}
                :
              </strong>{" "}
              {entry.message.text}
            </li>
          ))}
        </ol>
        <h3>Details captured from this conversation</h3>
        <dl>
          {PREVIEW_STEPS.flatMap((entry) => entry.fields ?? []).map((field) => (
            <div key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
