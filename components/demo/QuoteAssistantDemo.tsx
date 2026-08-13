"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import type { ContactDetails } from "@/lib/ai/types";
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

export function QuoteAssistantDemo() {
  // One provider for the life of the component. Swapping engines happens in
  // `getAssistantProvider`, not here.
  const provider = useMemo(() => getAssistantProvider(), []);

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
    // `state.messages.length` is read at completion; it does not need to
    // re-fire this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, provider]);

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
        message: "The assistant didn't respond. That's on us — try again.",
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
                  {DEMO_COMPANY}
                </p>
                <p className="text-slate-body flex items-center gap-1.5 text-xs">
                  <span
                    className="size-1.5 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  Quote assistant
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={restart}
              className="border-hairline text-slate-body hover:text-ink inline-flex min-h-9 shrink-0 items-center rounded-md border bg-white px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Start again
            </button>
          </header>

          <div
            ref={transcriptRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation with the quote assistant"
            className="h-[24rem] space-y-3 overflow-y-auto px-3 py-4 sm:h-[30rem] sm:px-4"
          >
            {state.messages.map((message, index) => (
              <ChatBubble
                key={message.id}
                role={message.role}
                assistantName={DEMO_COMPANY}
                showRole={state.messages[index - 1]?.role !== message.role}
              >
                {message.text}
              </ChatBubble>
            ))}

            {isBusy ? (
              <div className="flex justify-start">
                <div className="border-hairline bg-mist rounded-2xl rounded-bl-md border px-4 py-3">
                  <TypingDots />
                  <span className="sr-only">The assistant is typing</span>
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
                    className="mt-2 rounded-md border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
              <p className="text-slate-body text-xs">
                Conversation finished — the lead is ready.
              </p>
              <button
                type="button"
                onClick={restart}
                className="border-hairline text-ink hover:bg-mist inline-flex min-h-9 items-center rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Try another enquiry
              </button>
            </div>
          ) : state.inputMode === "contact" ? (
            <ContactForm disabled={isBusy} onSubmit={submitContact} />
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
            <LeadSummaryCard lead={state.lead} />
          ) : (
            <CollectedPanel lead={state.lead} />
          )}
        </aside>
      </div>

      {isComplete ? <DemoOutro onRestart={restart} /> : null}
    </div>
  );
}
