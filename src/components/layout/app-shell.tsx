import type { ReactNode } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <div className="md:grid md:min-h-dvh md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-sidebar-border bg-sidebar md:sticky md:top-0 md:block md:h-dvh">
          <SidebarNav />
        </aside>
        <div className="flex min-w-0 flex-col">
          <Topbar />
          <main id="main-content" className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
