"use client";

import { useEffect, useState } from "react";
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
  createTemplateRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import type { VideoProject } from "@/features/studio/scene/scene.types";
import {
  applyTemplateStyle,
  regenerateScenes,
} from "@/features/templates/apply";
import { BUILT_IN_TEMPLATES } from "@/features/templates/builtins";
import type { Template } from "@/features/templates/types";
import { toErrorMessage } from "@/lib/errors";

interface ApplyTemplateDialogProps {
  project: VideoProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (project: VideoProject) => void;
}

export function ApplyTemplateDialog({
  project,
  open,
  onOpenChange,
  onChange,
}: ApplyTemplateDialogProps) {
  const [templates, setTemplates] = useState<Template[]>(BUILT_IN_TEMPLATES);
  const [templateId, setTemplateId] = useState(
    project.templateId || BUILT_IN_TEMPLATES[0]?.id || "",
  );
  const [mode, setMode] = useState<"style" | "regenerate">("style");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const custom = await createTemplateRepository(db).list();
        if (!cancelled) setTemplates([...BUILT_IN_TEMPLATES, ...custom]);
      } catch {
        if (!cancelled) setTemplates(BUILT_IN_TEMPLATES);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function apply() {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    try {
      if (
        mode === "regenerate" &&
        !window.confirm(
          "Regenerate scenes? Scene edits in this project will be replaced. Undo is available.",
        )
      ) {
        return;
      }
      const next =
        mode === "regenerate"
          ? regenerateScenes(project, template)
          : applyTemplateStyle(project, template);
      onChange(next);
      onOpenChange(false);
    } catch (applyError) {
      setError(toErrorMessage(applyError));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply template</DialogTitle>
          <DialogDescription>
            Apply style non-destructively or rebuild scenes from the saved
            source selection.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="grid gap-1 text-[11px]">
            Template
            <select
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              className="h-9 rounded border border-border/70 bg-background px-2 text-[12px]"
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-1 text-[11px]">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "style"}
                onChange={() => setMode("style")}
              />
              Apply style only
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "regenerate"}
                onChange={() => setMode("regenerate")}
              />
              Regenerate scenes
            </label>
          </div>
          {error ? (
            <p role="alert" className="text-[11px] text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={apply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
