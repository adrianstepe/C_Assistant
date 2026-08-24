import type { AssistantProvider } from "./types";
import { createDemoEngine } from "./demo-engine";
import { createRemoteProvider } from "./remote-provider";

/**
 * The single place the assistant implementation is chosen.
 *
 * `useModel` is decided on the server (see `isAssistantModelEnabled` in
 * `lib/ai/deepseek.ts`) and passed down as a boolean, because the component
 * calling this runs in the browser and must never see the API key or its
 * absence inferred from anything sensitive.
 */
export function getAssistantProvider(
  options: { useModel?: boolean; companyName?: string } = {},
): AssistantProvider {
  // `companyName` only reaches the deterministic engine. A remote provider
  // would receive tenant context through its own configuration, not through
  // this option, which exists for the hosted capture pages.
  return options.useModel
    ? createRemoteProvider()
    : createDemoEngine({ companyName: options.companyName });
}
