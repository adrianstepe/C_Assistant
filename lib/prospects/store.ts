import type { Prospect, ProspectPatch } from "@/types/prospect";
import { SEED_PROSPECTS } from "./seed-data";
import {
  clearStoredProspects,
  loadProspects,
  saveProspects,
} from "./storage";

/**
 * A tiny external store backing the tracker, read through `useSyncExternalStore`.
 *
 * Why not `useState` + an effect: the data lives in `localStorage`, which the
 * server cannot see. `useSyncExternalStore` renders the seed list on the server
 * and during hydration, then swaps in the stored list — no cascading effects
 * and no hydration mismatch.
 */

let snapshot: Prospect[] | null = null;
const listeners = new Set<() => void>();

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
  snapshot ??= loadProspects() ?? SEED_PROSPECTS;
  return snapshot;
}

/** Server render and the hydration pass both use the seed list. */
export function getProspectsServerSnapshot(): Prospect[] {
  return SEED_PROSPECTS;
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

/** Throws away local edits and goes back to the seed list. */
export function resetProspects(): void {
  clearStoredProspects();
  snapshot = SEED_PROSPECTS;
  emit();
}
