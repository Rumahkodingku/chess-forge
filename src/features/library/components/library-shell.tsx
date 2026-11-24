"use client";

import { BookOpen, Brain, Library, Swords, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/library/openings", label: "Openings", Icon: Library },
  { href: "/library/repertoire", label: "Repertoire", Icon: BookOpen },
  { href: "/library/practice", label: "Practice", Icon: Brain },
  { href: "/library/games", label: "My Games", Icon: UserRound },
  { href: "/library/reference", label: "Reference", Icon: Swords },
] as const;

interface LibraryShellProps {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function LibraryShell({
  title,
  description,
  actions,
  children,
}: LibraryShellProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} actions={actions} />
      <nav
        aria-label="Chess Library"
        className="flex gap-1 overflow-x-auto rounded-xl border border-border/80 bg-surface-1 p-1"
      >
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-9 flex-none items-center gap-2 rounded-lg px-3 text-[12px] font-medium transition-colors",
                active
                  ? "bg-brand/15 text-brand"
                  : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <Icon aria-hidden className="size-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
