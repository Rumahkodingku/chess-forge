"use client";

import { HardDrive, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/layout/brand-mark";
import { NavIcon } from "@/components/layout/nav-icon";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  formatBytes,
  useStorageStatus,
} from "@/features/storage/use-storage-status";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  onNavigate?: () => void;
}

function StorageMeter() {
  const { status } = useStorageStatus();
  const label =
    status.state === "ready"
      ? `${formatBytes(status.usage)} used`
      : status.state === "loading"
        ? "Reading storage"
        : "Storage unavailable";

  return (
    <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <HardDrive aria-hidden className="size-3.5" />
        <span>Local workspace</span>
      </div>
      <p className="mt-2 text-[12px] font-medium text-sidebar-foreground">
        {label}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Browser storage. Export a backup before clearing site data.
      </p>
    </div>
  );
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pt-5 pb-6">
        <BrandMark />
      </div>

      <nav aria-label="Primary" className="min-h-0 flex-1 overflow-y-auto px-3">
        <div className="flex flex-col gap-7">
          {navigation.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-2 text-[11px] font-medium text-muted-foreground">
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        title={item.description}
                        className={cn(
                          "group relative flex min-h-11 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                        )}
                      >
                        {active ? (
                          <span className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand" />
                        ) : null}
                        <NavIcon
                          name={item.icon}
                          className={cn(
                            "shrink-0 transition-colors",
                            active
                              ? "text-brand"
                              : "text-muted-foreground group-hover:text-sidebar-foreground",
                          )}
                        />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="mt-6 space-y-3 p-3">
        <StorageMeter />
        <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-brand" aria-hidden />
          <span>R3 full analysis</span>
        </div>
      </div>
    </div>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 md:hidden"
          aria-label="Open navigation"
        >
          <Menu aria-hidden className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] bg-sidebar p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
