"use client";

import { HardDrive } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  formatBytes,
  useStorageStatus,
} from "@/features/storage/use-storage-status";

export function StoragePanel({ compact = false }: { compact?: boolean }) {
  const { status } = useStorageStatus();
  const percent =
    status.quota > 0 ? Math.min((status.usage / status.quota) * 100, 100) : 0;

  return (
    <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-surface-2 text-brand">
            <HardDrive aria-hidden className="size-4" />
          </span>
          <div>
            <p className="text-[13px] font-medium text-foreground">
              On this device
            </p>
            <p className="text-[11px] text-muted-foreground">
              IndexedDB local storage
            </p>
          </div>
        </div>
        {!compact ? (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[11px]"
          >
            <Link href="/settings#storage">Manage</Link>
          </Button>
        ) : null}
      </div>

      {status.state === "ready" ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-medium tabular-nums text-foreground">
              {formatBytes(status.usage)}
            </p>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              of {formatBytes(status.quota)}
            </p>
          </div>
          <Progress value={percent} className="mt-2 h-1.5" />
          <p className="mt-2 text-[11px] text-muted-foreground">
            {status.persisted
              ? "Persistent storage granted by the browser."
              : "The browser may clear this storage. Export backups."}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {status.state === "loading"
            ? "Reading browser storage."
            : (status.message ?? "Storage estimation is unavailable.")}
        </p>
      )}
    </div>
  );
}
