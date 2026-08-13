import type { UrgencyLevel } from "@/types/prospect";
import { URGENCY_META } from "@/lib/prospects/constants";

/**
 * The scanning cue: one dot per row, colour-coded by urgency. Colour alone is
 * never the only signal — the action label sits next to it in the table.
 */
export function UrgencyDot({ level }: { level: UrgencyLevel }) {
  const { label, dotClass } = URGENCY_META[level];
  return (
    <span
      className={`inline-block size-2.5 shrink-0 rounded-full ${dotClass}`}
      title={label}
      role="img"
      aria-label={label}
    />
  );
}
