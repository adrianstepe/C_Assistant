"use client";

import type {
  IsoDate,
  Prospect,
  ProspectPatch,
  ProspectStatus,
  UrgencyLevel,
} from "@/types/prospect";
import { formatDate, formatRelativeDays } from "@/lib/date";
import { COMPANY_TYPE_LABELS } from "@/lib/prospects/constants";
import { deriveAction, lastTouchDate } from "@/lib/prospects/urgency";
import { UrgencyDot } from "./UrgencyDot";
import { StatusSelect } from "./StatusSelect";

/** Tailwind text colour per urgency level, for the action column. */
const ACTION_TEXT_CLASS: Record<UrgencyLevel, string> = {
  overdue: "text-rose-700 dark:text-rose-400 font-medium",
  due: "text-amber-700 dark:text-amber-400 font-medium",
  soon: "text-sky-700 dark:text-sky-400",
  waiting: "text-muted",
  done: "text-muted",
};

interface ProspectTableProps {
  prospects: Prospect[];
  today: IsoDate;
  selectedId: string | null;
  activeIndex: number;
  onSelect: (id: string, index: number) => void;
  onPatch: (id: string, patch: ProspectPatch) => void;
}

export function ProspectTable({
  prospects,
  today,
  selectedId,
  activeIndex,
  onSelect,
  onPatch,
}: ProspectTableProps) {
  if (prospects.length === 0) {
    return (
      <p className="border-border text-muted rounded-lg border border-dashed px-4 py-10 text-center text-sm">
        No prospects match these filters.
      </p>
    );
  }

  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Prospects, sorted by how urgently they need attention. Use J and K to
          move, Enter to open.
        </caption>
        <thead className="bg-surface text-muted text-xs tracking-wide uppercase">
          <tr>
            <th scope="col" className="w-8 px-2 py-2">
              <span className="sr-only">Urgency</span>
            </th>
            <th scope="col" className="px-2 py-2 text-left font-medium">
              Company
            </th>
            <th scope="col" className="px-2 py-2 text-left font-medium">
              Status
            </th>
            <th
              scope="col"
              className="hidden px-2 py-2 text-left font-medium lg:table-cell"
            >
              Contact
            </th>
            <th
              scope="col"
              className="hidden px-2 py-2 text-left font-medium md:table-cell"
            >
              Last touch
            </th>
            <th scope="col" className="px-2 py-2 text-left font-medium">
              Next action
            </th>
          </tr>
        </thead>
        <tbody>
          {prospects.map((prospect, index) => {
            const action = deriveAction(prospect, today);
            const touched = lastTouchDate(prospect);
            const isSelected = prospect.id === selectedId;
            const isActive = index === activeIndex;

            return (
              <tr
                key={prospect.id}
                data-row-index={index}
                onClick={() => onSelect(prospect.id, index)}
                className={`border-border cursor-pointer border-t transition-colors ${
                  isSelected
                    ? "bg-accent/10"
                    : isActive
                      ? "bg-surface-hover"
                      : "hover:bg-surface-hover"
                }`}
              >
                <td className="px-2 py-1.5 align-middle">
                  <UrgencyDot level={action.level} />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(prospect.id, index);
                    }}
                    className="text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {prospect.companyName}
                  </button>
                  <div className="text-muted text-xs">
                    {prospect.city} · {COMPANY_TYPE_LABELS[prospect.companyType]}
                  </div>
                </td>
                <td
                  className="px-2 py-1.5"
                  onClick={(event) => event.stopPropagation()}
                >
                  <StatusSelect
                    id={`status-${prospect.id}`}
                    value={prospect.status}
                    compact
                    aria-label={`Status for ${prospect.companyName}`}
                    onChange={(status: ProspectStatus) =>
                      onPatch(prospect.id, { status })
                    }
                  />
                </td>
                <td className="text-muted hidden max-w-44 truncate px-2 py-1.5 lg:table-cell">
                  {prospect.contactName ?? prospect.contactEmail ?? "—"}
                </td>
                <td
                  className="text-muted hidden px-2 py-1.5 whitespace-nowrap md:table-cell"
                  title={formatDate(touched)}
                >
                  {formatRelativeDays(touched, today)}
                </td>
                <td
                  className={`px-2 py-1.5 ${ACTION_TEXT_CLASS[action.level]}`}
                >
                  {action.label}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
