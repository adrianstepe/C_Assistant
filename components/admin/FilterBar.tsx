"use client";

import type { RefObject } from "react";
import type {
  ProspectFilters,
  ProspectSortKey,
  ProspectStatus,
} from "@/types/prospect";
import {
  PROSPECT_STATUSES,
  SORT_LABELS,
  STATUS_META,
} from "@/lib/prospects/constants";
import { controlClass } from "@/components/ui/Field";

const SORT_KEYS = ["urgency", "company", "added", "lastTouch"] as const satisfies
  readonly ProspectSortKey[];

interface FilterBarProps {
  filters: ProspectFilters;
  onChange: (filters: ProspectFilters) => void;
  /** Counts for the current search, before the status filter is applied. */
  statusCounts: Record<ProspectStatus, number>;
  resultCount: number;
  searchRef: RefObject<HTMLInputElement | null>;
}

export function FilterBar({
  filters,
  onChange,
  statusCounts,
  resultCount,
  searchRef,
}: FilterBarProps) {
  function toggleStatus(status: ProspectStatus) {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((value) => value !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: next });
  }

  const hasFilters =
    filters.query !== "" || filters.statuses.length > 0 || filters.needsActionOnly;

  return (
    <section aria-label="Filters" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <label htmlFor="prospect-search" className="sr-only">
            Search prospects
          </label>
          <input
            id="prospect-search"
            ref={searchRef}
            type="search"
            value={filters.query}
            onChange={(event) =>
              onChange({ ...filters, query: event.target.value })
            }
            placeholder="Search company, city, contact, notes…  ( / )"
            className={controlClass}
          />
        </div>

        <div>
          <label htmlFor="prospect-sort" className="sr-only">
            Sort by
          </label>
          <select
            id="prospect-sort"
            value={filters.sort}
            onChange={(event) => {
              const value = event.target.value;
              const next = SORT_KEYS.find((key) => key === value);
              if (next) onChange({ ...filters, sort: next });
            }}
            className={`${controlClass} w-auto cursor-pointer`}
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <label className="border-border bg-surface flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
          <input
            type="checkbox"
            checked={filters.needsActionOnly}
            onChange={(event) =>
              onChange({ ...filters, needsActionOnly: event.target.checked })
            }
            className="size-4 cursor-pointer"
          />
          Needs action only
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {PROSPECT_STATUSES.map((status) => {
          const active = filters.statuses.includes(status);
          return (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              aria-pressed={active}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:bg-surface-hover"
              }`}
            >
              {STATUS_META[status].label}
              <span className="ml-1.5 tabular-nums opacity-70">
                {statusCounts[status]}
              </span>
            </button>
          );
        })}

        {hasFilters ? (
          <button
            type="button"
            onClick={() =>
              onChange({ ...filters, query: "", statuses: [], needsActionOnly: false })
            }
            className="text-muted hover:text-foreground ml-1 text-xs underline underline-offset-2"
          >
            Clear filters
          </button>
        ) : null}

        <span aria-live="polite" className="text-muted ml-auto text-xs tabular-nums">
          {resultCount} shown
        </span>
      </div>
    </section>
  );
}
