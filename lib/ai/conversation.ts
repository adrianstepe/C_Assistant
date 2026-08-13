import type {
  AssistantReply,
  ChatMessage,
  InputMode,
  LeadDraft,
} from "./types";
import { EMPTY_LEAD } from "./types";

/**
 * Conversation state, kept as a pure reducer so the flow can be reasoned about
 * (and eventually tested) without React or a provider.
 */

export type ConversationStatus =
  | "awaiting" // waiting for the customer
  | "thinking" // provider call in flight
  | "complete" // everything collected
  | "error"; // provider call failed; retry offered

export interface ConversationState {
  messages: ChatMessage[];
  lead: LeadDraft;
  status: ConversationStatus;
  inputMode: InputMode;
  suggestions: string[];
  /** Recoverable problem with the last input, e.g. a malformed email. */
  validationError?: string;
  /** Provider or network failure. */
  errorMessage?: string;
  nextId: number;
}

export type ConversationAction =
  | { type: "customer-message"; text: string }
  | { type: "assistant-reply"; reply: AssistantReply }
  | { type: "failed"; message: string }
  | { type: "reset"; reply: AssistantReply };

function appendAssistant(
  state: ConversationState,
  reply: AssistantReply,
): ConversationState {
  const messages = [...state.messages];
  let nextId = state.nextId;
  for (const text of reply.messages) {
    messages.push({ id: `m${nextId}`, role: "assistant", text });
    nextId += 1;
  }
  return {
    ...state,
    messages,
    nextId,
    lead: reply.lead,
    status: reply.complete ? "complete" : "awaiting",
    inputMode: reply.inputMode,
    suggestions: reply.suggestions,
    validationError: reply.validationError,
    errorMessage: undefined,
  };
}

export function initialState(greeting: AssistantReply): ConversationState {
  return appendAssistant(
    {
      messages: [],
      lead: EMPTY_LEAD,
      status: "awaiting",
      inputMode: "text",
      suggestions: [],
      nextId: 0,
    },
    greeting,
  );
}

export function conversationReducer(
  state: ConversationState,
  action: ConversationAction,
): ConversationState {
  switch (action.type) {
    case "customer-message":
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: `m${state.nextId}`, role: "customer", text: action.text },
        ],
        nextId: state.nextId + 1,
        status: "thinking",
        // Suggestions belong to the question just answered.
        suggestions: [],
        validationError: undefined,
        errorMessage: undefined,
      };

    case "assistant-reply":
      return appendAssistant(state, action.reply);

    case "failed":
      return { ...state, status: "error", errorMessage: action.message };

    case "reset":
      return initialState(action.reply);
  }
}
