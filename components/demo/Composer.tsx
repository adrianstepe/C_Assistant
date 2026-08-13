"use client";

import { useRef, useState } from "react";
import type { FormEvent, RefObject } from "react";

const MAX_LENGTH = 300;

interface ComposerProps {
  disabled: boolean;
  suggestions: readonly string[];
  onSend: (text: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

/**
 * Message box plus tappable suggested answers.
 *
 * Suggestions matter more than they look: they let a prospect run the whole
 * demo with four taps on a phone, which is the difference between them seeing
 * the lead card and abandoning halfway.
 */
export function Composer({
  disabled,
  suggestions,
  onSend,
  inputRef,
}: ComposerProps) {
  const [value, setValue] = useState("");
  // Guards against a double-tap firing two sends before React re-renders.
  const sending = useRef(false);

  function submit(text: string) {
    const trimmed = text.trim();
    if (trimmed === "" || disabled || sending.current) return;
    sending.current = true;
    setValue("");
    onSend(trimmed);
    // Released on the next tick; `disabled` takes over from here.
    window.setTimeout(() => {
      sending.current = false;
    }, 0);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(value);
  }

  const canSend = value.trim() !== "" && !disabled;

  return (
    <div className="border-hairline border-t bg-white px-3 py-3 sm:px-4">
      {suggestions.length > 0 ? (
        <div className="mb-2.5 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={disabled}
              onClick={() => submit(suggestion)}
              className="border-hairline text-slate-body rounded-full border bg-white px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <label htmlFor="demo-message" className="sr-only">
          Your message to the quote assistant
        </label>
        <input
          id="demo-message"
          ref={inputRef}
          type="text"
          value={value}
          maxLength={MAX_LENGTH}
          autoComplete="off"
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Type your reply…"
          className="border-hairline text-ink min-h-11 w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-body/70 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 disabled:opacity-60 sm:text-[0.9375rem]"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="bg-brand inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </div>
  );
}
