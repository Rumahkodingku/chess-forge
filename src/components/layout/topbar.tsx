"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { flatNavigation, titleForPath } from "@/lib/navigation";

export function Topbar() {
  const pathname = usePathname();
  const title = titleForPath(pathname);

  return (
    <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border/70 bg-background px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-foreground">
            {title}
          </p>
          <p className="hidden text-[11px] text-muted-foreground sm:block">
            Local-first chess analysis and video studio
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-md border border-border/80 px-2.5 py-1.5 text-[11px] text-muted-foreground sm:flex">
          <span className="size-1.5 rounded-full bg-brand" aria-hidden />
          Local only
        </span>
        <span className="hidden rounded-md border border-border/80 px-2.5 py-1.5 text-[11px] text-muted-foreground md:inline">
          R5 video studio
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 gap-1.5 border-border/80 bg-transparent px-3 text-[12px]"
              aria-label="Jump to a workspace page"
            >
              Jump to
              <ChevronDown aria-hidden className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">
              Workspace
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {flatNavigation.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} className="min-h-9">
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
