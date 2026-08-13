import { optionalServerEnv } from "@/lib/env";

/**
 * DeepSeek configuration and the single HTTP call to it.
 *
 * Server-only: the API key is read here and never leaves the server. The
 * browser talks to `/api/assistant`, which talks to DeepSeek.
 *
 * The model id is required rather than defaulted on purpose — model names
 * change, and silently calling a model that does not exist produces a
 * confusing 400 rather than an obvious misconfiguration. Paste the exact id
 * from DeepSeek's own documentation into `DEEPSEEK_MODEL`.
 */

function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "lib/ai/deepseek is server-only and must not be imported from a client component.",
    );
  }
}

/** DeepSeek exposes an OpenAI-compatible API at this origin. */
const DEFAULT_BASE_URL = "https://api.deepseek.com";

export interface DeepSeekConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export function readDeepSeekConfig(): DeepSeekConfig | null {
  assertServer();
  const apiKey = optionalServerEnv("DEEPSEEK_API_KEY");
  const model = optionalServerEnv("DEEPSEEK_MODEL");
  if (!apiKey || !model) return null;
  return {
    apiKey,
    model,
    baseUrl: (optionalServerEnv("DEEPSEEK_BASE_URL") ?? DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    ),
  };
}

export function isAssistantModelEnabled(): boolean {
  return readDeepSeekConfig() !== null;
}

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

/** How long we wait before giving up and letting the caller fall back. */
const TIMEOUT_MS = 12_000;

/** Caps the cost of any single call regardless of what the model wants to say. */
const MAX_OUTPUT_TOKENS = 400;

export interface CompletionResult {
  ok: boolean;
  content?: string;
  /** Set when the call failed, for server-side logging only. */
  error?: string;
}

/**
 * One chat completion, returning raw text.
 *
 * Never throws: the caller always has a deterministic fallback, so a failure
 * here should degrade the wording of a reply, not break the conversation.
 */
export async function complete(
  config: DeepSeekConfig,
  messages: ChatTurn[],
): Promise<CompletionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.3,
        max_tokens: MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      // Body may contain the key in an echoed request on some gateways, so
      // only the status is recorded.
      return { ok: false, error: `DeepSeek returned ${response.status}` };
    }

    const payload: unknown = await response.json();
    const content = extractContent(payload);
    return content
      ? { ok: true, content }
      : { ok: false, error: "DeepSeek response had no message content" };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `timed out after ${TIMEOUT_MS}ms`
        : "network error";
    return { ok: false, error: `DeepSeek call failed: ${reason}` };
  } finally {
    clearTimeout(timeout);
  }
}

/** Narrow the OpenAI-shaped response without trusting its shape. */
function extractContent(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = (choices[0] as { message?: unknown }).message;
  if (typeof message !== "object" || message === null) return null;
  const content = (message as { content?: unknown }).content;
  return typeof content === "string" && content.trim() !== "" ? content : null;
}
