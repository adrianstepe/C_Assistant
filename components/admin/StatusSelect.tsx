"use client";

import type { ProspectStatus } from "@/types/prospect";
import { PROSPECT_STATUSES, STATUS_META } from "@/lib/prospects/constants";
import { toProspectStatus } from "@/lib/prospects/storage";
import { controlClass } from "@/components/ui/Field";

interface StatusSelectProps {
  id: string;
  value: ProspectStatus;
  onChange: (status: ProspectStatus) => void;
  /** Compact variant for use inside table rows. */
  compact?: boolean;
  "aria-label"?: string;
}

export function StatusSelect({
  id,
  value,
  onChange,
  compact = false,
  "aria-label": ariaLabel,
}: StatusSelectProps) {
  return (
    <select
      id={id}
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => {
        const next = toProspectStatus(event.target.value);
        if (next) onChange(next);
      }}
      className={
        compact
          ? `${controlClass} w-auto cursor-pointer px-1.5 py-0.5 text-xs`
          : `${controlClass} cursor-pointer`
      }
    >
      {PROSPECT_STATUSES.map((status) => (
        <option key={status} value={status}>
          {STATUS_META[status].label}
        </option>
      ))}
    </select>
  );
}
