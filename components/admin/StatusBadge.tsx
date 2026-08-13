import type { ProspectStatus } from "@/types/prospect";
import { STATUS_META } from "@/lib/prospects/constants";

export function StatusBadge({ status }: { status: ProspectStatus }) {
  const { label, badgeClass } = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${badgeClass}`}
    >
      {label}
    </span>
  );
}
