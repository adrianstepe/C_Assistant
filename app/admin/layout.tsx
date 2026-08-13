import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | Admin",
  },
  // Internal tooling: keep it out of search results even if the path leaks.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    // `theme-auto` opts this subtree into OS dark mode; see globals.css.
    <div className="theme-auto bg-background text-foreground flex min-h-full flex-1 flex-col">
      <header className="border-border bg-surface border-b px-4 py-2">
        <p className="text-muted text-xs font-medium tracking-wide uppercase">
          Internal · not part of the public site
        </p>
      </header>
      <main id="main" className="w-full flex-1 px-4 py-5">
        {children}
      </main>
    </div>
  );
}
