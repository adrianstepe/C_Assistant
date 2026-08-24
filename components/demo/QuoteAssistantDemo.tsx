"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ContactDetails, LeadDraft } from "@/lib/ai/types";
import { computeProgress } from "@/lib/ai/types";
import { getAssistantProvider } from "@/lib/ai/provider";
import { DEMO_COMPANY } from "@/lib/ai/demo-engine";
import {
  conversationReducer,
  initialState,
} from "@/lib/ai/conversation";
import { track } from "@/lib/analytics";
import { ChatBubble } from "./ChatBubble";
import { Composer } from "./Composer";
import { ContactForm } from "./ContactForm";
import { CollectedPanel } from "./CollectedPanel";
import { LeadSummaryCard } from "./LeadSummaryCard";
import { ProgressMeter } from "./ProgressMeter";
import { DemoOutro } from "./DemoOutro";
import { TypingDots } from "@/components/ui/TypingDots";

/** What was last sent, so a failed turn can be retried verbatim. */
interface LastRequest {
  text: string;
  contact?: ContactDetails;
}

/**
 * Delivery state of the capture-page submission, from the enquirer's point of
 * view. Before this existed, a failed POST was logged in the console while the
 * visitor read a finished conversation: the business lost the lead and nobody
 * on either side knew.
 */
interface CaptureOutcome {
  status: "idle" | "sending" | "sent" | "failed";
  /** The enquiry reference echoed back by `/api/leads` on success. */
  reference?: string;
}

export interface CaptureTarget {
  /** The tenant slug every completed enquiry is attributed to. */
  slug: string;
}

interface QuoteAssistantDemoProps {
  useModel?: boolean;
  /**
   * Who the assistant answers on behalf of. Defaults to the fictional public
   * demo company; hosted capture pages pass the tenant's own name.
   */
  companyName?: string;
  /**
   * Set on hosted capture pages: once a conversation completes, the finished
   * lead is posted to `/api/leads` against this slug. The public demo leaves
   * it unset and stays exactly what its footnote says it is.
   */
  capture?: CaptureTarget;
  /**
   * The public demo closes with Linwick's own sales pitch. A capture page
   * belongs to a cleaning company and is read by their prospective customers,
   * so there is nothing to sell them here.
   */
  showSalesOutro?: boolean;
}

export function QuoteAssistantDemo({
  useModel = false,
  companyName,
  capture,
  showSalesOutro = true,
}: QuoteAssistantDemoProps) {
  const company = companyName ?? DEMO_COMPANY;

  // One provider for the life of the component. Swapping engines happens in
  // `getAssistantProvider`, not here. `useModel` is resolved on the server so
  // no credential or its absence is inferable from the client bundle.
  const provider = useMemo(
    () => getAssistantProvider({ useModel, companyName }),
    [useModel, companyName],
  );

  // Greeting is synchronous, so the first render is already a conversation —
  // no effect, no empty state, nothing to hydrate around.
  const [state, dispatch] = useReducer(
    conversationReducer,
    provider,
    (p) => initialState(p.greeting()),
  );

  const inFlight = useRef(false);
  const lastRequest = useRef<LastRequest | null>(null);
  // Set on mount rather than during render: `Date.now()` is impure.
  const startedAt = useRef(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const leadRef = useRef<HTMLDivElement>(null);
  // Capture-mode bookkeeping: one submission per completed conversation, a
  // stable event id across retries of that submission, and the honeypot
  // field real users never see or fill.
  const captureSubmitted = useRef(false);
  const captureEventId = useRef<string>("");
  const honeypotRef = useRef<HTMLInputElement>(null);
  // Visible to the enquirer on hosted pages: sending / sent / failed.
  const [captureOutcome, setCaptureOutcome] = useState<CaptureOutcome>({
    status: "idle",
  });

  const progress = computeProgress(state.lead);
  const isBusy = state.status === "thinking";
  const isComplete = state.status === "complete";

  useEffect(() => {
    startedAt.current = Date.now();
    track({ name: "demo_started", properties: { provider: provider.id } });
  }, [provider]);

  // Keep the newest message in view, inside the transcript only.
  useEffect(() => {
    const node = transcriptRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [state.messages, state.status]);

  // Return focus to the message box once the assistant has replied.
  useEffect(() => {
    if (state.status === "awaiting" && state.inputMode === "text") {
      inputRef.current?.focus();
    }
  }, [state.status, state.inputMode]);

  async function submitCapture(lead: LeadDraft, messageCount: number) {
    if (!capture) return;
    if (!captureEventId.current) {
      captureEventId.current = `enq_${crypto.randomUUID()}`;
    }
    setCaptureOutcome({ status: "sending" });
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: capture.slug,
          eventId: captureEventId.current,
          lead,
          meta: {
            startedAtMs: startedAt.current,
            elapsedMs: Date.now() - startedAt.current,
            messageCount,
          },
          // Honeypot: a real person cannot see or fill this field.
          companyWebsite: honeypotRef.current?.value ?? "",
        }),
      });
      if (!response.ok) throw new Error(`capture POST returned ${response.status}`);
      // The stored enquiry's reference, so the enquirer has something to
      // quote if they contact the business about their enquiry.
      let reference: string | undefined;
      try {
        const body = (await response.json()) as { reference?: string };
        reference = typeof body.reference === "string" ? body.reference : undefined;
      } catch {
        // A 201 with an unreadable body is still a stored enquiry.
      }
      setCaptureOutcome({ status: "sent", reference });
      track({ name: "lead_captured", properties: { stored: true } });
    } catch (error) {
      console.warn("[capture] enquiry could not be delivered", error);
      setCaptureOutcome({ status: "failed" });
      track({ name: "lead_capture_failed", properties: {} });
    }
  }

  useEffect(() => {
    if (!isComplete) return;
    track({
      name: "demo_completed",
      properties: {
        provider: provider.id,
        messageCount: state.messages.length,
        durationMs: Date.now() - startedAt.current,
      },
    });
    leadRef.current?.scrollIntoView({ block: "nearest" });

    // The hosted-capture success branch: a finished conversation becomes a
    // stored enquiry against the tenant. One attempt per completion; the
    // event id is stable so a retry of the same submission cannot store it
    // twice (the server de-duplicates on it).
    if (capture && !captureSubmitted.current) {
      captureSubmitted.current = true;
      void submitCapture(state.lead, state.messages.length);
    }
    // `state.messages.length` is read at completion; it does not need to
    // re-fire this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, provider, capture]);

  async function send(text: string, contact?: ContactDetails) {
    if (inFlight.current || isBusy || isComplete) return;
    inFlight.current = true;
    lastRequest.current = contact ? { text, contact } : { text };

    const lead = state.lead;
    const history = state.messages;
    dispatch({ type: "customer-message", text });

    try {
      const reply = await provider.respond(
        contact ? { lead, history, contact } : { lead, history, message: text },
      );
      if (contact && !reply.validationError) {
        track({
          name: "lead_submitted",
          properties: {
            hasPhone: Boolean(contact.phone),
            hasCompany: Boolean(contact.company),
          },
        });
      }
      dispatch({ type: "assistant-reply", reply });
    } catch {
      dispatch({
        type: "failed",
        message: "Nothing came back. That's on us. Try again.",
      });
    } finally {
      inFlight.current = false;
    }
  }

  async function retry() {
    const last = lastRequest.current;
    if (!last || inFlight.current) return;
    inFlight.current = true;

    try {
      const reply = await provider.respond(
        last.contact
          ? { lead: state.lead, history: state.messages, contact: last.contact }
          : { lead: state.lead, history: state.messages, message: last.text },
      );
      dispatch({ type: "assistant-reply", reply });
    } catch {
      dispatch({
        type: "failed",
        message: "Still no response. Try starting the conversation again.",
      });
    } finally {
      inFlight.current = false;
    }
  }

  function restart() {
    inFlight.current = false;
    lastRequest.current = null;
    startedAt.current = Date.now();
    captureSubmitted.current = false;
    captureEventId.current = "";
    setCaptureOutcome({ status: "idle" });
    track({ name: "demo_restarted", properties: {} });
    dispatch({ type: "reset", reply: provider.greeting() });
    inputRef.current?.focus();
  }

  function submitContact(contact: ContactDetails) {
    const summary = [contact.name, contact.company, contact.email]
      .filter(Boolean)
      .join(" · ");
    void send(summary, contact);
  }

  return (
    <div className="space-y-6">
      <ProgressMeter progress={progress} complete={isComplete} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        {/* `min-w-0` stops wide children (long words, the JSON block) from
            widening the grid track instead of scrolling inside it. */}
        <div className="border-hairline flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
          <header className="border-hairline bg-mist/60 flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="bg-ink flex size-9 shrink-0 items-center justify-center rounded-full"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M5 12.5 10 17.5 19 7"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {company}
                </p>
                <p className="text-slate-body flex items-center gap-1.5 text-xs">
                  <span
                    className="size-1.5 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  Enquiries
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={restart}
              className="border-hairline text-slate-body hover:text-ink active:scale-95 inline-flex min-h-9 shrink-0 items-center rounded-md border bg-white px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Start again
            </button>
          </header>

          <div
            ref={transcriptRef}
            role="log"
            aria-live="polite"
            aria-label={`Conversation with ${company}`}
            className="h-[24rem] space-y-3 overflow-y-auto px-3 py-4 sm:h-[30rem] sm:px-4"
          >
            {state.messages.map((message, index) => (
              <ChatBubble
                key={message.id}
                role={message.role}
                assistantName={company}
                showRole={state.messages[index - 1]?.role !== message.role}
              >
                {message.text}
              </ChatBubble>
            ))}

            {isBusy ? (
              <div className="animate-message-in flex justify-start">
                <div className="border-hairline bg-mist rounded-2xl rounded-bl-md border px-4 py-3">
                  <TypingDots />
                  <span className="sr-only">{company} is typing</span>
                </div>
              </div>
            ) : null}

            {state.status === "error" ? (
              <div role="alert" className="flex justify-start">
                <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-sm text-rose-800">{state.errorMessage}</p>
                  <button
                    type="button"
                    onClick={() => void retry()}
                    className="mt-2 rounded-md border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {state.validationError ? (
            <p
              role="alert"
              className="border-hairline border-t bg-rose-50 px-4 py-2 text-xs font-medium text-rose-800"
            >
              {state.validationError}
            </p>
          ) : null}

          {isComplete ? (
            <div className="border-hairline flex flex-wrap items-center justify-between gap-3 border-t bg-white px-4 py-3">
              {capture ? (
                // Hosted capture page: the enquirer needs to know whether the
                // enquiry actually reached the business, not just that the
                // conversation finished.
                captureOutcome.status === "sent" ? (
                  <p className="bg-clear-tint text-clear inline-flex flex-wrap items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium">
                    <span className="inline-block size-1.5 rounded-full bg-current" aria-hidden="true" />
                    Sent to {company}.
                    {captureOutcome.reference ? (
                      <span className="font-mono tabular-nums opacity-80">
                        Ref {captureOutcome.reference}
                      </span>
                    ) : null}
                  </p>
                ) : captureOutcome.status === "failed" ? (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <p className="text-fault text-xs font-medium">
                      Couldn&rsquo;t reach the server — your enquiry has
                      <strong className="font-semibold"> not</strong> been sent
                      yet.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void submitCapture(state.lead, state.messages.length)
                      }
                      className="border-fault text-fault hover:bg-fault-tint inline-flex min-h-9 items-center rounded-md border bg-white px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      Send it now
                    </button>
                  </div>
                ) : (
                  <p className="text-slate-body text-xs">
                    {captureOutcome.status === "sending"
                      ? "Sending your enquiry…"
                      : "Conversation finished."}
                  </p>
                )
              ) : (
                <p className="text-slate-body text-xs">
                  Conversation finished. The enquiry is ready to price.
                </p>
              )}
              <button
                type="button"
                onClick={restart}
                className="border-hairline text-ink hover:bg-mist inline-flex min-h-9 items-center rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Try another enquiry
              </button>
            </div>
          ) : state.inputMode === "contact" ? (
            <>
              <ContactForm disabled={isBusy} onSubmit={submitContact} />
              {capture ? (
                // Honeypot field, one layer of the capture page's abuse
                // control alongside the submit-interval check and the rate
                // limits. Hidden from people; some form-filling bots fill it,
                // and a filled honeypot means the submission is dropped
                // server-side without storing anything.
                <div aria-hidden="true" className="hidden">
                  <label htmlFor="capture-company-website">
                    Leave this field empty
                  </label>
                  <input
                    ref={honeypotRef}
                    id="capture-company-website"
                    type="text"
                    name="companyWebsite"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
              ) : null}
            </>
          ) : (
            <Composer
              disabled={isBusy || state.status === "error"}
              suggestions={state.suggestions}
              onSend={(text) => void send(text)}
              inputRef={inputRef}
            />
          )}
        </div>

        <aside
          ref={leadRef}
          className={
            isComplete
              ? "min-w-0 lg:sticky lg:top-24"
              : "hidden min-w-0 lg:sticky lg:top-24 lg:block"
          }
        >
          {isComplete ? (
            <LeadSummaryCard
              lead={state.lead}
              audience={capture ? "enquirer" : "business"}
            />
          ) : (
            <CollectedPanel lead={state.lead} />
          )}
        </aside>
      </div>

      {isComplete && showSalesOutro ? <DemoOutro onRestart={restart} /> : null}
    </div>
  );
}
