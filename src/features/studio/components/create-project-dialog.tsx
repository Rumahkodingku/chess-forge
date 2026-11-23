"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GameSummary } from "@/features/analysis/types";
import type { Game } from "@/features/games/types";
import {
  createProjectRepository,
  createTemplateRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import {
  buildSourceSelection,
  type CreateProjectFormState,
  initialFormState,
  type ProjectSourceMode,
} from "@/features/studio/creation/create-project-form";
import { generateProject } from "@/features/studio/creation/generate-project";
import type { VideoProject } from "@/features/studio/scene/scene.types";
import { BUILT_IN_TEMPLATES } from "@/features/templates/builtins";
import type { Template } from "@/features/templates/types";
import { toErrorMessage } from "@/lib/errors";

const SOURCE_LABELS: Record<ProjectSourceMode, string> = {
  full: "Full game",
  moments: "Critical moments",
  range: "Manual range",
};

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: Game;
  summary: GameSummary | null;
  onCreated: (project: VideoProject) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  game,
  summary,
  onCreated,
}: CreateProjectDialogProps) {
  const [templates, setTemplates] = useState<Template[]>(BUILT_IN_TEMPLATES);
  const [templateId, setTemplateId] = useState(
    BUILT_IN_TEMPLATES[0]?.id ?? "cinematic-chess",
  );
  const [form, setForm] = useState<CreateProjectFormState>(() =>
    initialFormState(summary, game.moves.length, {
      sourceMode: "full",
      leadInPlies: 2,
      trailInPlies: 2,
    }),
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = useMemo(
    () => templates.find((item) => item.id === templateId) ?? templates[0],
    [templateId, templates],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const custom = await createTemplateRepository(db).list();
        if (!cancelled) {
          setTemplates([...BUILT_IN_TEMPLATES, ...custom]);
        }
      } catch {
        if (!cancelled) setTemplates(BUILT_IN_TEMPLATES);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!template) return;
    setForm(
      initialFormState(summary, game.moves.length, {
        sourceMode: template.sceneRules.defaultSourceMode,
        leadInPlies: template.sceneRules.leadInPlies,
        trailInPlies: template.sceneRules.trailInPlies,
      }),
    );
  }, [game.moves.length, summary, template]);

  const moments = summary?.criticalMoments ?? [];

  async function create() {
    if (!template) return;
    setCreating(true);
    setError(null);
    try {
      const selection = buildSourceSelection(form, game);
      const project = generateProject({
        game,
        summary,
        template,
        selection,
      });
      const db = await openChessForgeDatabase();
      await createProjectRepository(db).save(project);
      onCreated(project);
    } catch (createError) {
      setError(toErrorMessage(createError));
    } finally {
      setCreating(false);
    }
  }

  function toggleMoment(ply: number, checked: boolean) {
    setForm((current) => ({
      ...current,
      moments: checked
        ? [
            ...current.moments,
            ...moments
              .filter((moment) => moment.ply === ply)
              .map((moment) => ({
                ply: moment.ply,
                san: moment.san,
                classification: moment.classification,
                reason: moment.reason,
              })),
          ]
        : current.moments.filter((moment) => moment.ply !== ply),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create video</DialogTitle>
          <DialogDescription>
            Choose a source, a template, and how much context each moment gets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[12px] font-medium" htmlFor="r5-template">
              Template
            </label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="r5-template" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {template?.description}
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-[12px] font-medium">Source</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SOURCE_LABELS) as ProjectSourceMode[]).map(
                (mode) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={form.sourceMode === mode ? "default" : "outline"}
                    disabled={mode === "moments" && !moments.length}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        sourceMode: mode,
                      }))
                    }
                  >
                    {SOURCE_LABELS[mode]}
                  </Button>
                ),
              )}
            </div>
          </fieldset>

          {form.sourceMode === "moments" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                {moments.map((moment) => (
                  <label
                    key={moment.ply}
                    className="flex items-start gap-2 rounded border border-border/70 p-2 text-[12px]"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={form.moments.some(
                        (selected) => selected.ply === moment.ply,
                      )}
                      onChange={(event) =>
                        toggleMoment(moment.ply, event.target.checked)
                      }
                    />
                    <span>
                      <span className="block font-medium">
                        {moment.san} · ply {moment.ply}
                      </span>
                      <span className="text-muted-foreground">
                        {moment.reason}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-[11px]" htmlFor="r5-lead">
                  <span className="block text-muted-foreground">
                    Lead-in plies
                  </span>
                  <Input
                    id="r5-lead"
                    type="number"
                    min={0}
                    value={form.leadInPlies}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        leadInPlies: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <label className="space-y-1 text-[11px]" htmlFor="r5-trail">
                  <span className="block text-muted-foreground">
                    Follow-through plies
                  </span>
                  <Input
                    id="r5-trail"
                    type="number"
                    min={0}
                    value={form.trailInPlies}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        trailInPlies: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>
            </div>
          ) : null}

          {form.sourceMode === "range" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-[11px]" htmlFor="r5-from">
                <span className="block text-muted-foreground">From ply</span>
                <Input
                  id="r5-from"
                  type="number"
                  min={1}
                  max={game.moves.length}
                  value={form.fromPly}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fromPly: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label className="space-y-1 text-[11px]" htmlFor="r5-to">
                <span className="block text-muted-foreground">To ply</span>
                <Input
                  id="r5-to"
                  type="number"
                  min={1}
                  max={game.moves.length}
                  value={form.toPly}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      toPly: Number(event.target.value),
                    }))
                  }
                />
              </label>
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
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              creating ||
              !template ||
              (form.sourceMode === "moments" && !form.moments.length)
            }
            onClick={() => void create()}
          >
            {creating ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : null}
            Create project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
