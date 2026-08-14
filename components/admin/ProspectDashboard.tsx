"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { IsoDate, Prospect, ProspectFilters } from "@/types/prospect";
import {
  DEFAULT_FILTERS,
  filterAndSortProspects,
  narrowForStatusCounts,
} from "@/lib/prospects/filter";
import { computeStats, countByStatus } from "@/lib/prospects/stats";
import {
  addProspect,
  getProspectsServerSnapshot,
  getProspectsSnapshot,
  patchProspect,
  removeProspect,
  resetProspects,
  setBaselineProspects,
  subscribeToProspects,
} from "@/lib/prospects/store";
import { StatsBar } from "./StatsBar";
import { FilterBar } from "./FilterBar";
import { ProspectTable } from "./ProspectTable";
import { ProspectDetail } from "./ProspectDetail";

function createProspect(today: IsoDate): Prospect {
  return {
    id: crypto.randomUUID(),
    companyName: "",
    city: "",
    country: "United Kingdom",
    companyType: "commercial_cleaning",
    contactSource: "google_maps",
    status: "new",
    dateAdded: today,
  };
}

/** True when the keystroke belongs to a field the user is typing in. */
function isTypingTarget(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT" ||
    element.isContentEditable
  );
}

interface ProspectDashboardProps {
  today: IsoDate;
  /** The list parsed from `data/prospects.csv` on the server. */
  initialProspects: Prospect[];
  /** Rows the CSV parser could not read, reported rather than hidden. */
  loadErrors: string[];
}

export function ProspectDashboard({
  today,
  initialProspects,
  loadErrors,
}: ProspectDashboardProps) {
  // Before the first snapshot is read, so the server render and the hydration
  // pass see the same list.
  setBaselineProspects(initialProspects);

  const prospects = useSyncExternalStore(
    subscribeToProspects,
    getProspectsSnapshot,
    getProspectsServerSnapshot,
  );

  const [filters, setFilters] = useState<ProspectFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(
    () => filterAndSortProspects(prospects, filters, today),
    [prospects, filters, today],
  );
  const stats = useMemo(
    () => computeStats(prospects, today),
    [prospects, today],
  );
  const statusCounts = useMemo(
    () => countByStatus(narrowForStatusCounts(prospects, filters, today)),
    [prospects, filters, today],
  );

  const selected = useMemo(
    () => prospects.find((prospect) => prospect.id === selectedId) ?? null,
    [prospects, selectedId],
  );

  // Clamped on read rather than stored, so filtering never leaves a stale index.
  const activeIndex = Math.min(cursor, Math.max(visible.length - 1, 0));

  function handleAdd() {
    const prospect = createProspect(today);
    addProspect(prospect);
    setSelectedId(prospect.id);
  }

  function handleDelete(id: string) {
    removeProspect(id);
    setSelectedId(null);
  }

  function handleReset() {
    if (
      !window.confirm(
        "Discard all edits made in this browser and reload the list from data/prospects.csv?",
      )
    ) {
      return;
    }
    resetProspects();
    setSelectedId(null);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const typing = isTypingTarget(target);

      if (event.key === "Escape") {
        if (typing) target.blur();
        else setSelectedId(null);
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case "/":
          event.preventDefault();
          searchRef.current?.focus();
          searchRef.current?.select();
          break;
        case "j":
        case "ArrowDown":
          event.preventDefault();
          setCursor(Math.min(activeIndex + 1, visible.length - 1));
          break;
        case "k":
        case "ArrowUp":
          event.preventDefault();
          setCursor(Math.max(activeIndex - 1, 0));
          break;
        case "Enter": {
          const prospect = visible[activeIndex];
          if (prospect) {
            event.preventDefault();
            setSelectedId(prospect.id);
          }
          break;
        }
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, activeIndex]);

  // Follow the keyboard cursor when it moves outside the viewport.
  useEffect(() => {
    document
      .querySelector(`[data-row-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Prospect tracker
          </h1>
          <p className="text-muted mt-0.5 text-sm">
            UK commercial cleaning outreach, loaded from{" "}
            <code className="font-mono text-xs">data/prospects.csv</code>. Edits
            are saved in this browser only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="border-border hover:bg-surface-hover rounded-md border px-2.5 py-1.5 text-xs font-medium"
          >
            Reload from file
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="bg-accent rounded-md px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Add prospect
          </button>
        </div>
      </div>

      {loadErrors.length > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">
            {loadErrors.length === 1
              ? "One row could not be read from data/prospects.csv:"
              : `${loadErrors.length} rows could not be read from data/prospects.csv:`}
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {loadErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {initialProspects.length === 0 && loadErrors.length === 0 ? (
        <div className="border-border text-muted rounded-lg border border-dashed px-4 py-6 text-sm">
          <p className="text-ink font-medium">No prospects yet.</p>
          <p className="mt-1">
            Drop your outreach list into{" "}
            <code className="font-mono text-xs">data/prospects.csv</code>{" "}
            (keeping the header row) and reload this page. See{" "}
            <code className="font-mono text-xs">data/README.md</code> for the
            columns.
          </p>
        </div>
      ) : null}

      <StatsBar stats={stats} />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        statusCounts={statusCounts}
        resultCount={visible.length}
        searchRef={searchRef}
      />

      <ProspectTable
        prospects={visible}
        today={today}
        selectedId={selectedId}
        activeIndex={activeIndex}
        onSelect={(id, index) => {
          setSelectedId(id);
          setCursor(index);
        }}
        onPatch={patchProspect}
      />

      <p className="text-muted text-xs">
        <kbd className="border-border rounded border px-1">/</kbd> search ·{" "}
        <kbd className="border-border rounded border px-1">J</kbd>
        <kbd className="border-border ml-1 rounded border px-1">K</kbd> move ·{" "}
        <kbd className="border-border rounded border px-1">Enter</kbd> open ·{" "}
        <kbd className="border-border rounded border px-1">Esc</kbd> close
      </p>

      {selected ? (
        <ProspectDetail
          prospect={selected}
          today={today}
          onPatch={patchProspect}
          onDelete={handleDelete}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}
