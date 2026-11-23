"use client";

import { ArrowRight, Copy, Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
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
  createProjectRepository,
  createTemplateRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import type { VideoProject } from "@/features/studio/scene/scene.types";
import {
  applyTemplateStyle,
  regenerateScenes,
} from "@/features/templates/apply";
import { BUILT_IN_TEMPLATES } from "@/features/templates/builtins";
import { TemplatePreview } from "@/features/templates/components/template-preview";
import {
  duplicateTemplate,
  renameTemplate,
  updateTemplateFromProject,
} from "@/features/templates/custom";
import type { Template } from "@/features/templates/types";
import { toErrorMessage } from "@/lib/errors";

type DialogState =
  | { type: "apply"; template: Template }
  | { type: "update"; template: Template }
  | null;

export default function TemplatesPage() {
  const [custom, setCustom] = useState<Template[]>([]);
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [projectId, setProjectId] = useState("");
  const [applyMode, setApplyMode] = useState<"style" | "regenerate">("style");
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentionally reloads after CRUD
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const [storedTemplates, storedProjects] = await Promise.all([
          createTemplateRepository(db).list(),
          createProjectRepository(db).list(),
        ]);
        if (cancelled) return;
        setCustom(storedTemplates.filter((template) => !template.isBuiltIn));
        setProjects(storedProjects);
        setProjectId((current) => current || (storedProjects[0]?.id ?? ""));
        setLoading(false);
      } catch (loadError) {
        if (!cancelled) {
          setError(toErrorMessage(loadError));
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const allTemplates = useMemo(
    () => [...BUILT_IN_TEMPLATES, ...custom],
    [custom],
  );

  function refresh() {
    setRefreshKey((current) => current + 1);
  }

  async function applyTemplate() {
    if (!dialog || dialog.type !== "apply" || !projectId) return;
    if (
      applyMode === "regenerate" &&
      !window.confirm(
        "Regenerate scenes? Scene edits in this project will be replaced. Undo is available in the studio.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const db = await openChessForgeDatabase();
      const repository = createProjectRepository(db);
      const project = await repository.getById(projectId);
      if (!project) throw new Error("The selected project no longer exists.");
      const next =
        applyMode === "regenerate"
          ? regenerateScenes(project, dialog.template)
          : applyTemplateStyle(project, dialog.template);
      await repository.save(next);
      toast.success(
        applyMode === "regenerate"
          ? "Scenes regenerated."
          : "Template style applied.",
      );
      setDialog(null);
      refresh();
    } catch (applyError) {
      toast.error(toErrorMessage(applyError));
    } finally {
      setBusy(false);
    }
  }

  async function updateTemplate() {
    if (!dialog || dialog.type !== "update" || !projectId) return;
    setBusy(true);
    try {
      const db = await openChessForgeDatabase();
      const project = await createProjectRepository(db).getById(projectId);
      if (!project) throw new Error("The selected project no longer exists.");
      await createTemplateRepository(db).save(
        updateTemplateFromProject(dialog.template, project),
      );
      toast.success("Template updated from project.");
      setDialog(null);
      refresh();
    } catch (updateError) {
      toast.error(toErrorMessage(updateError));
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(item: Template) {
    try {
      const db = await openChessForgeDatabase();
      await createTemplateRepository(db).save(duplicateTemplate(item));
      toast.success("Template duplicated.");
      refresh();
    } catch (duplicateError) {
      toast.error(toErrorMessage(duplicateError));
    }
  }

  async function rename(item: Template) {
    const name = window.prompt("Template name", item.name);
    if (!name) return;
    try {
      const db = await openChessForgeDatabase();
      await createTemplateRepository(db).save(renameTemplate(item, name));
      toast.success("Template renamed.");
      refresh();
    } catch (renameError) {
      toast.error(toErrorMessage(renameError));
    }
  }

  async function remove(item: Template) {
    if (!window.confirm(`Delete template "${item.name}"?`)) return;
    try {
      const db = await openChessForgeDatabase();
      await createTemplateRepository(db).delete(item.id);
      toast.success("Template deleted.");
      refresh();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        description="Seven built-in directions and your own saved rules. Applying a template creates a project snapshot; editing a template later never rewrites an old project."
        actions={
          <Button asChild variant="outline" className="h-10 px-4">
            <Link href="/studio">
              Open studio
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex min-h-44 items-center justify-center rounded-xl border border-border/80 bg-surface-1">
          <Loader2 aria-hidden className="size-5 animate-spin text-brand" />
          <span className="sr-only">Loading templates</span>
        </div>
      ) : null}

      {error ? (
        <EmptyState
          title="Templates could not load"
          description={error}
          action={
            <Button type="button" className="h-9" onClick={refresh}>
              Retry
            </Button>
          }
        />
      ) : null}

      {!loading && !error ? (
        <>
          <section className="space-y-3">
            <h2 className="text-[15px] font-medium">Built-in directions</h2>
            {allTemplates
              .filter((template) => template.isBuiltIn)
              .map((template) => (
                <div key={template.id} className="space-y-2">
                  <TemplatePreview template={template} />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDialog({ type: "apply", template })}
                      disabled={!projects.length}
                    >
                      Apply to project
                    </Button>
                    <span className="text-[10px] text-muted-foreground">
                      Built-in templates are read-only.
                    </span>
                  </div>
                </div>
              ))}
          </section>

          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-medium">Custom templates</h2>
                <p className="text-[11px] text-muted-foreground">
                  Saved from a project. Rules and style only; no moves or scene
                  IDs.
                </p>
              </div>
            </div>
            {custom.length ? (
              custom.map((template) => (
                <div key={template.id} className="space-y-2">
                  <TemplatePreview template={template} />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setDialog({ type: "apply", template })}
                      disabled={!projects.length}
                    >
                      Apply to project
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDialog({ type: "update", template })}
                      disabled={!projects.length}
                    >
                      Update from project
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void duplicate(template)}
                    >
                      <Copy aria-hidden className="size-3.5" />
                      Duplicate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void rename(template)}
                    >
                      <Pencil aria-hidden className="size-3.5" />
                      Rename
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void remove(template)}
                    >
                      <Trash2 aria-hidden className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No custom templates"
                description="Open a project, choose Save as template, and the rules appear here."
                action={
                  <Button asChild className="h-9">
                    <Link href="/studio">Open studio</Link>
                  </Button>
                }
              />
            )}
          </section>
        </>
      ) : null}

      <Dialog
        open={Boolean(dialog)}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.type === "update" ? "Update template" : "Apply template"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.template.name}. Choose a project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="grid gap-1 text-[11px]">
              Project
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="h-9 rounded border border-border/70 bg-background px-2 text-[12px]"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            {dialog?.type === "apply" ? (
              <div className="space-y-1 text-[11px]">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={applyMode === "style"}
                    onChange={() => setApplyMode("style")}
                  />
                  Apply style only
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={applyMode === "regenerate"}
                    onChange={() => setApplyMode("regenerate")}
                  />
                  Regenerate scenes from the saved source selection
                </label>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                This replaces the custom template rules with the selected
                project's current snapshot and increments its version.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialog(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || !projectId}
              onClick={() =>
                void (dialog?.type === "update"
                  ? updateTemplate()
                  : applyTemplate())
              }
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {dialog?.type === "update" ? "Update" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
