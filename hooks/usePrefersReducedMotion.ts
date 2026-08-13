"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/** Server render assumes motion is allowed; the client corrects on hydration. */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Tracks the user's reduced-motion preference.
 *
 * Read through `useSyncExternalStore` rather than an effect so it never
 * triggers a cascading render, matching the pattern used by the prospect store.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
