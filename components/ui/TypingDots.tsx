/**
 * Three-dot "typing" animation. Shared by the marketing preview and the live
 * demo so both read as the same product. Motion is removed automatically by
 * the reduced-motion rules in `globals.css`.
 */
export function TypingDots({ tone = "muted" }: { tone?: "muted" | "light" }) {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className={`animate-typing-dot size-1.5 rounded-full ${
            tone === "light" ? "bg-white/70" : "bg-slate-body"
          }`}
          style={{ animationDelay: `${dot * 160}ms` }}
        />
      ))}
    </span>
  );
}
