// biome-ignore-all lint/a11y/noLabelWithoutControl: labels wrap the project Input controls
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createTemplateRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import type { VideoProject } from "@/features/studio/scene/scene.types";
import { templateFromProject } from "@/features/templates/custom";
import { toErrorMessage } from "@/lib/errors";

interface SaveTemplateDialogProps {
  project: VideoProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function SaveTemplateDialog({
  project,
  open,
  onOpenChange,
  onSaved,
}: SaveTemplateDialogProps) {
  const [name, setName] = useState(
    `${project.template?.name ?? "Project"} copy`,
  );
  const [description, setDescription] = useState(
    project.template?.description ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const template = templateFromProject({ project, name, description });
      if (!template) {
        throw new Error("Apply a template before saving this project as one.");
      }
      const db = await openChessForgeDatabase();
      await createTemplateRepository(db).save(template);
      onSaved?.();
      onOpenChange(false);
    } catch (saveError) {
      setError(toErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
          <DialogDescription>
            Saves the current style and scene rules. Moves and scene IDs are not
            included.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="grid gap-1 text-[11px]">
            Name
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-[11px]">
            Description
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
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
          <Button
            type="button"
            disabled={saving || !name.trim()}
            onClick={() => void save()}
          >
            Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
