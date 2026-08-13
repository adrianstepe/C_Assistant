import type { Metadata } from "next";
import { QuoteAssistantDemo } from "@/components/demo/QuoteAssistantDemo";
import { Container } from "@/components/marketing/primitives";
import { isAssistantModelEnabled } from "@/lib/ai/deepseek";

export const metadata: Metadata = {
  title: "Try the quote assistant",
  description:
    "Send a cleaning enquiry the way one of your customers would, and watch it turn into a structured, qualified lead.",
};

// Whether the model is configured is a server-side fact, so this page cannot
// be baked at build time.
export const dynamic = "force-dynamic";

export default function DemoPage() {
  const useModel = isAssistantModelEnabled();

  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="text-slate-body inline-flex items-center gap-2 font-mono text-xs font-medium tracking-[0.14em] uppercase">
          <span className="bg-brand inline-block size-2" aria-hidden="true" />
          Live demo
        </p>
        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl lg:text-[2.75rem]">
          Try it as if you were the customer.
        </h1>
        <p className="text-slate-body mt-5 text-lg leading-relaxed text-pretty">
          You are playing the part of someone enquiring about cleaning. The
          assistant is answering on behalf of a cleaning company. In real use,
          that would be yours. Answer however you like; it copes with whatever
          you type.
        </p>
      </div>

      <div className="mt-10">
        <QuoteAssistantDemo useModel={useModel} />
      </div>
    </Container>
  );
}
