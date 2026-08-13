import type { AssistantProvider, AssistantReply, RespondInput } from "./types";
import { createDemoEngine } from "./demo-engine";

/**
 * Provider that talks to `/api/assistant` instead of running locally.
 *
 * The greeting is still produced offline: it is fixed text, and making the
 * first paint wait on a network call would be a worse demo for no benefit.
 *
 * On a failed or rate-limited request this falls back to the offline engine
 * for that turn rather than surfacing an error. A prospect evaluating the
 * product should never see the machinery — and the offline reply is a
 * perfectly good one, just less naturally worded.
 */
export function createRemoteProvider(): AssistantProvider {
  const offline = createDemoEngine({ latency: false });

  return {
    id: "deepseek-remote",

    greeting() {
      return offline.greeting();
    },

    async respond(input: RespondInput): Promise<AssistantReply> {
      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead: input.lead,
            history: input.history,
            ...(input.message ? { message: input.message } : {}),
            ...(input.contact ? { contact: input.contact } : {}),
          }),
        });

        if (!response.ok) {
          return offline.respond(input);
        }

        const payload: unknown = await response.json();
        return isAssistantReply(payload) ? payload : offline.respond(input);
      } catch {
        return offline.respond(input);
      }
    },
  };
}

/** The response crosses a network boundary, so its shape is not assumed. */
function isAssistantReply(value: unknown): value is AssistantReply {
  if (typeof value !== "object" || value === null) return false;
  const reply = value as Record<string, unknown>;
  return (
    Array.isArray(reply.messages) &&
    reply.messages.every((entry) => typeof entry === "string") &&
    Array.isArray(reply.suggestions) &&
    typeof reply.complete === "boolean" &&
    (reply.inputMode === "text" ||
      reply.inputMode === "contact" ||
      reply.inputMode === "none") &&
    typeof reply.lead === "object" &&
    reply.lead !== null
  );
}
