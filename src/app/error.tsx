"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AppError } from "@/lib/errors";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const appError = error instanceof AppError ? error : undefined;
  const detail = appError
    ? [appError.message, appError.recovery].filter(Boolean).join(" ")
    : undefined;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-md rounded-xl border border-border bg-surface-1 p-6">
        <p className="text-[11px] font-medium text-brand">
          {appError ? "Workspace error" : "Unexpected error"}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
          The workspace stopped responding.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {detail ??
            "Your local data is still on this device. Reload the workspace to continue. If the error returns, export a backup before clearing site data."}
        </p>
        <Button className="mt-5" onClick={reset}>
          Reload workspace
        </Button>
      </div>
    </div>
  );
}
