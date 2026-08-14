import type { Prospect, ProspectPatch } from "@/types/prospect";
import {
  clearStoredProspects,
  loadProspects,
  saveProspects,
} from "./storage";

/**
 * A tiny external store backing the tracker, read through `useSyncExternalStore`.
 *
 * Why not `useState` + an effect: the data lives in `localStorage`, which the
 * server cannot see. `useSyncExternalStore` renders the file-backed list on the
 * server and during hydration, then swaps in the stored list — no cascading
 * effects and no hydration mismatch.
 *
 * The baseline list comes from `data/prospects.csv`, read on the server and
 * handed in by the page. The store cannot read it itself: this module runs in
 * the browser too, where there is no filesystem.
 */

let baseline: Prospect[] = [];
let snapshot: Prospect[] | null = null;
const listeners = new Set<() => void>();

/**
 * Seeds the store with the list parsed from the CSV.
 *
 * Called during render, before the first snapshot is read, so the server render
 * and the hydration pass agree. Re-setting it discards the cached snapshot so a
 * changed file is picked up rather than masked by the previous request's list.
 */
export function setBaselineProspects(prospects: Prospect[]): void {
  if (baseline === prospects) return;
  baseline = prospects;
  snapshot = null;
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Replaces the list, persists it, and notifies subscribers. */
function commit(next: Prospect[]): void {
  snapshot = next;
  saveProspects(next);
  emit();
}

export function subscribeToProspects(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProspectsSnapshot(): Prospect[] {
  snapshot ??= loadProspects() ?? baseline;
  return snapshot;
}

/** Server render and the hydration pass both use the list from the file. */
export function getProspectsServerSnapshot(): Prospect[] {
  return baseline;
}

export function patchProspect(id: string, patch: ProspectPatch): void {
  commit(
    getProspectsSnapshot().map((prospect) =>
      prospect.id === id ? { ...prospect, ...patch } : prospect,
    ),
  );
}

export function addProspect(prospect: Prospect): void {
  commit([prospect, ...getProspectsSnapshot()]);
}

export function removeProspect(id: string): void {
  commit(getProspectsSnapshot().filter((prospect) => prospect.id !== id));
}

/** Throws away local edits and goes back to the list in `data/prospects.csv`. */
export function resetProspects(): void {
  clearStoredProspects();
  snapshot = baseline;
  emit();
}
