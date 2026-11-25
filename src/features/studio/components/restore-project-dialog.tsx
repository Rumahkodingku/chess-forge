"use client";

import { Loader2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  inspectProjectBackup,
  type ProjectBackupInspection,
  type ProjectRestoreMode,
  restoreProjectBackup,
} from "@/features/storage/project-backup";
import { toErrorMessage } from "@/lib/errors";

type RestoreState = "choose" | "inspecting" | "ready" | "restoring";

interface RestoreProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: () => void;
}

export function RestoreProjectDialog({
  open,
  onOpenChange,
  onRestored,
}: RestoreProjectDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [inspection, setInspection] = useState<ProjectBackupInspection | null>(
    null,
  );
  const [state, setState] = useState<RestoreState>("choose");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setInspection(null);
    setState("choose");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [open]);

  async function choose(fileToInspect: File) {
    setFile(fileToInspect);
    setInspection(null);
    setError(null);
    setState("inspecting");
    try {
      setInspection(await inspectProjectBackup(fileToInspect));
      setState("ready");
    } catch (inspectError) {
      setError(toErrorMessage(inspectError));
      setState("choose");
    }
  }

  async function restore(mode: ProjectRestoreMode) {
    if (!file) return;
    if (
      mode === "overwrite" &&
      !window.confirm(
        `Overwrite the saved project${inspection ? ` "${inspection.project.name}"` : ""}? The backup replaces it and its audio. This cannot be undone.`,
      )
    ) {
      return;
    }
    setState("restoring");
    setError(null);
    try {
      const result = await restoreProjectBackup(file, mode);
      toast.success(
        result.mode === "copy"
          ? "Project restored as a copy."
          : "Project restored and overwritten.",
      );
      onRestored();
      onOpenChange(false);
    } catch (restoreError) {
      setError(toErrorMessage(restoreError));
      setState("ready");
    }
  }

  const busy = state === "inspecting" || state === "restoring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import project backup</DialogTitle>
          <DialogDescription>
            Choose a .chessforge project archive. ChessForge checks the archive,
            its assets, and the checksums before it writes anything.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept=".chessforge,.zip,application/zip"
            className="sr-only"
            aria-label="Choose a project backup file"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) void choose(selected);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full border-border/80 bg-transparent"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload aria-hidden className="size-4" />
            {state === "inspecting" ? "Checking archive" : "Choose backup file"}
          </Button>

          {inspection ? (
            <div className="space-y-1 rounded-lg border border-border/80 bg-surface-2 p-3 text-[12px]">
              <p className="font-medium text-foreground">
                {inspection.project.name}
              </p>
              <p className="text-muted-foreground">
                {inspection.assetCount} audio asset
                {inspection.assetCount === 1 ? "" : "s"} · Created{" "}
                {new Date(inspection.manifest.createdAt).toLocaleString()}
              </p>
              {inspection.exists ? (
                <p className="text-destructive">
                  A project with this ID already exists in this browser. Restore
                  it as a copy or confirm an overwrite.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  This project is not in this browser yet.
                </p>
              )}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-[12px] text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {inspection ? (
            inspection.exists ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-9"
                  disabled={busy}
                  onClick={() => void restore("overwrite")}
                >
                  Overwrite
                </Button>
                <Button
                  type="button"
                  className="h-9"
                  disabled={busy}
                  onClick={() => void restore("copy")}
                >
                  {state === "restoring" ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : null}
                  Restore as copy
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="h-9"
                disabled={busy}
                onClick={() => void restore("copy")}
              >
                {state === "restoring" ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : null}
                Restore project
              </Button>
            )
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
