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

export function ProspectDashboard({ today }: { today: IsoDate }) {
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
    if (!window.confirm("Discard all local edits and restore the seed list?")) {
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
            UK commercial cleaning outreach. Edits are saved in this browser
            only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="border-border hover:bg-surface-hover rounded-md border px-2.5 py-1.5 text-xs font-medium"
          >
            Reset data
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
