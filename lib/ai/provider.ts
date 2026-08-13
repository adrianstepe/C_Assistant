import type { AssistantProvider } from "./types";
import { createDemoEngine } from "./demo-engine";

/**
 * The single place the assistant implementation is chosen.
 *
 * To move the demo onto a real model: write a provider that calls a route
 * handler (which in turn calls Anthropic server-side, reading the key through
 * `lib/env.ts`), then return it from here. Nothing in `components/demo`
 * imports a concrete engine, so the UI does not change.
 */
export function getAssistantProvider(): AssistantProvider {
  return createDemoEngine();
}
