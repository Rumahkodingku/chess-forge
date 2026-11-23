"use client";

import { ArrowRight, Clapperboard, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createProjectRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import type { VideoProject } from "@/features/studio/scene/scene.types";
import { toErrorMessage } from "@/lib/errors";

type LoadState = "loading" | "ready" | "error";

export default function StudioPage() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const stored = await createProjectRepository(db).list();
        if (cancelled) return;
        setProjects(
          [...stored].sort((left, right) =>
            right.updatedAt.localeCompare(left.updatedAt),
          ),
        );
        setState("ready");
      } catch (loadError) {
        if (!cancelled) {
          setError(toErrorMessage(loadError));
          setState("error");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function deleteProject(projectId: string) {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    try {
      const db = await openChessForgeDatabase();
      await createProjectRepository(db).delete(projectId);
      setProjects((current) =>
        current.filter((project) => project.id !== projectId),
      );
    } catch (deleteError) {
      setError(toErrorMessage(deleteError));
      setState("error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Studio"
        description="Create templated projects, edit scenes and timeline, and preview the full sequence with deterministic board animation, camera, text, effects, and audio."
        actions={
          <Button asChild className="h-10 px-4">
            <Link href="/analysis">Start from analysis</Link>
          </Button>
        }
      />

      {state === "loading" ? (
        <div className="flex min-h-44 items-center justify-center rounded-xl border border-border/80 bg-surface-1">
          <Loader2 aria-hidden className="size-5 animate-spin text-brand" />
          <span className="sr-only">Loading projects</span>
        </div>
      ) : null}

      {state === "error" ? (
        <EmptyState
          title="Projects could not load"
          description={error ?? "Reload the page and try again."}
          action={
            <Button asChild className="h-9">
              <Link href="/analysis">Back to analysis</Link>
            </Button>
          }
        />
      ) : null}

      {state === "ready" && projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Import a game, select a move, and create a scene. The saved project will appear here."
          action={
            <Button asChild className="h-9">
              <Link href="/analysis">Import a game</Link>
            </Button>
          }
        />
      ) : null}

      {state === "ready" && projects.length > 0 ? (
        <div className="space-y-3">
          {projects.map((project) => (
            <Card key={project.id} className="border-border/80 bg-surface-1">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-[15px]">
                    <Clapperboard aria-hidden className="size-4 text-brand" />
                    {project.name}
                  </CardTitle>
                  <CardDescription>
                    {project.gameSnapshot
                      ? `${project.gameSnapshot.metadata.white} vs ${project.gameSnapshot.metadata.black}`
                      : "Source snapshot unavailable"}{" "}
                    · {project.scenes.length} scene ·{" "}
                    {project.canvas.aspectRatio}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-2 text-destructive"
                    aria-label={`Delete ${project.name}`}
                    onClick={() => void deleteProject(project.id)}
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-9 border-border/80 bg-transparent px-3"
                  >
                    <Link href={`/studio/${project.id}`}>
                      Open
                      <ArrowRight aria-hidden className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-[11px] text-muted-foreground">
                  Updated{" "}
                  {new Date(project.updatedAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
