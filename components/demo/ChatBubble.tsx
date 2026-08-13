import type { ReactNode } from "react";
import type { ChatRole } from "@/lib/ai/types";

interface ChatBubbleProps {
  role: ChatRole;
  children: ReactNode;
  /** Suppresses the role label on consecutive bubbles from the same speaker. */
  showRole?: boolean;
  assistantName: string;
}

export function ChatBubble({
  role,
  children,
  showRole = true,
  assistantName,
}: ChatBubbleProps) {
  const isCustomer = role === "customer";

  return (
    <div
      className={`animate-message-in flex ${isCustomer ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[88%] sm:max-w-[80%] ${isCustomer ? "text-right" : ""}`}>
        {showRole ? (
          <p className="text-slate-body mb-1 px-1 text-[0.6875rem] font-semibold tracking-wide uppercase">
            {isCustomer ? "You" : assistantName}
          </p>
        ) : null}
        <div
          className={`rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed sm:text-[0.9375rem] ${
            isCustomer
              ? "bg-ink rounded-br-md text-white"
              : "border-hairline bg-mist text-ink rounded-bl-md border"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
