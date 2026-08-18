import type { ReactNode } from "react";

/**
 * Shared styling for native inputs, selects and textareas.
 *
 * `text-base` below `sm` is deliberate: iOS Safari zooms the page in whenever a
 * focused input's font size is under 16px, and never zooms back out. The
 * contact card at the end of the demo is four such inputs on a phone.
 */
export const controlClass =
  "border-border bg-background text-foreground w-full rounded-md border px-2.5 py-1.5 text-base outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 sm:text-sm";

interface FieldProps {
  label: string;
  /** Must match the `id` of the control passed as `children`. */
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}

/** Label + control pairing. Every control in the tracker uses this. */
export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-muted text-xs font-medium tracking-wide uppercase"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-muted text-xs">{hint}</p> : null}
    </div>
  );
}
