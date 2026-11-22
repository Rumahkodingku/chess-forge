"use client";

import {
  ArrowLeft,
  Clapperboard,
  Download,
  Loader2,
  Save,
  Square,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProjectRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { formatBytes } from "@/features/storage/use-storage-status";
import { projectFileName } from "@/features/studio/file-name";
import { exportProject } from "@/features/studio/rendering/export-runner";
import { SceneComposition } from "@/features/studio/rendering/scene-composition";
import type { VideoProject } from "@/features/studio/scene/scene.types";
import { toErrorMessage } from "@/lib/errors";
import { isUuid } from "@/lib/validation";

const Player = dynamic(
  () => import("@remotion/player").then((module) => module.Player),
  { ssr: false },
);

const ScenePlayer = SceneComposition as unknown as ComponentType<
  Record<string, unknown>
>;

type LoadState = "loading" | "ready" | "invalid" | "missing" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";
type ExportState = "idle" | "exporting" | "done" | "cancelled" | "error";

export default function StudioProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Array.isArray(params.projectId)
    ? params.projectId[0]
    : params.projectId;
  const [project, setProject] = useState<VideoProject | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [format, setFormat] = useState<"webm" | "mp4">("webm");
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [progress, setProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [resultFormat, setResultFormat] = useState<"webm" | "mp4" | null>(null);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isUuid(projectId)) {
      setLoadState("invalid");
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const stored = await createProjectRepository(db).getById(projectId);
        if (cancelled) return;
        if (!stored) {
          setLoadState("missing");
          return;
        }
        setProject(stored);
        setLoadState("ready");
      } catch (error) {
        if (!cancelled) {
          setLoadError(toErrorMessage(error));
          setLoadState("error");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const scene = project?.scenes[0];

  function clearResult() {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setResultUrl(null);
    setResultSize(null);
    setResultFormat(null);
    setRenderMs(null);
  }

  async function saveProject() {
    if (!project) return;
    setSaveState("saving");
    try {
      const next = {
        ...project,
        updatedAt: new Date().toISOString(),
      };
      const db = await openChessForgeDatabase();
      await createProjectRepository(db).save(next);
      setProject(next);
      setSaveState("saved");
      toast.success("Project saved to this device.");
    } catch (error) {
      setSaveState("error");
      toast.error(toErrorMessage(error));
    }
  }

  async function renderProject() {
    if (!project || !scene) return;
    clearResult();
    setExportError(null);
    setProgress(0);
    setExportState("exporting");
    const controller = new AbortController();
    controllerRef.current = controller;
    const started = performance.now();
    try {
      const result = await exportProject({
        project,
        container: format,
        videoCodec: format === "mp4" ? "h264" : "vp9",
        audioCodec: format === "mp4" ? "aac" : "opus",
        signal: controller.signal,
        onProgress: (nextProgress) =>
          setProgress(Math.round(nextProgress * 100)),
      });
      const url = URL.createObjectURL(result.blob);
      urlRef.current = url;
      setResultUrl(url);
      setResultSize(result.blob.size);
      setResultFormat(format);
      setRenderMs(Math.round(performance.now() - started));
      setProgress(100);
      setExportState("done");
    } catch (error) {
      if (controller.signal.aborted) {
        setExportState("cancelled");
        setExportError("Export cancelled. The project was not changed.");
      } else {
        setExportState("error");
        setExportError(toErrorMessage(error));
      }
    } finally {
      controllerRef.current = null;
    }
  }

  if (loadState === "invalid" || loadState === "missing") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Project not found"
          description="The project route is invalid or the project is not in this local workspace."
          actions={
            <Button
              asChild
              variant="outline"
              className="h-10 border-border/80 bg-transparent px-4"
            >
              <Link href="/studio">Back to studio</Link>
            </Button>
          }
        />
        <EmptyState
          title="No project to open"
          description="Create a scene from an analysed move, then reopen it from the studio list."
          action={
            <Button asChild className="h-9">
              <Link href="/analysis">Go to analysis</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (loadState === "loading") {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl border border-border/70 bg-surface-1" />
        <div className="h-[520px] animate-pulse rounded-xl border border-border/70 bg-surface-1" />
      </div>
    );
  }

  if (loadState === "error" || !project) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Project could not load"
          description="The local record could not be read."
        />
        <EmptyState
          title="Storage error"
          description={loadError ?? "Reload the page and try again."}
          action={
            <Button asChild className="h-9">
              <Link href="/studio">Back to studio</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const exporting = exportState === "exporting";
  const downloadName = projectFileName(project.name, resultFormat ?? format);

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={
          project.gameSnapshot
            ? `${project.gameSnapshot.metadata.white} vs ${project.gameSnapshot.metadata.black} · ${project.canvas.aspectRatio} · ${scene ? scene.durationInFrames / project.frameRate : 0}s`
            : `${project.canvas.aspectRatio} · ${project.scenes.length} scene`
        }
        actions={
          <Button
            asChild
            variant="outline"
            className="h-10 border-border/80 bg-transparent px-4"
          >
            <Link href="/studio">
              <ArrowLeft aria-hidden className="size-4" />
              Project list
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <Card className="border-border/80 bg-surface-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <Clapperboard aria-hidden className="size-4 text-brand" />
              Preview
            </CardTitle>
            <CardDescription>
              Remotion Player at {project.canvas.width} x{" "}
              {project.canvas.height}. The same project renders to the file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scene ? (
              <div className="mx-auto w-full max-w-[440px] overflow-hidden rounded-xl border border-border/80 bg-black">
                <Player
                  component={ScenePlayer}
                  inputProps={{ project, scene }}
                  durationInFrames={scene.durationInFrames}
                  compositionWidth={project.canvas.width}
                  compositionHeight={project.canvas.height}
                  fps={project.frameRate}
                  controls
                  loop
                  autoPlay
                  acknowledgeRemotionLicense
                  style={{
                    width: "100%",
                    aspectRatio: `${project.canvas.width} / ${project.canvas.height}`,
                  }}
                />
              </div>
            ) : (
              <EmptyState
                title="This project has no scene"
                description="Create a scene from an analysed move to give the project something to render."
                action={
                  <Button asChild className="h-9">
                    <Link href="/analysis">Go to analysis</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[15px]">Project details</CardTitle>
              <CardDescription>
                R1 stores the game snapshot with the project, so it can render
                after the source game is deleted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-[12px]">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <dt className="text-muted-foreground">Template</dt>
                  <dd className="font-mono text-foreground">
                    {project.templateId}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <dt className="text-muted-foreground">Canvas</dt>
                  <dd className="font-mono text-foreground">
                    {project.canvas.width} x {project.canvas.height}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <dt className="text-muted-foreground">Scenes</dt>
                  <dd className="font-mono text-foreground">
                    {project.scenes.length} scene
                    {project.scenes.length === 1 ? "" : "s"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <dt className="text-muted-foreground">Frame rate</dt>
                  <dd className="font-mono text-foreground">
                    {project.frameRate} FPS
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd className="text-foreground">
                    {new Date(project.updatedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
              <Button
                type="button"
                onClick={() => void saveProject()}
                disabled={saveState === "saving"}
                className="mt-4 h-10 px-4"
              >
                {saveState === "saving" ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : (
                  <Save aria-hidden className="size-4" />
                )}
                {saveState === "saving" ? "Saving" : "Save project"}
              </Button>
              <p
                aria-live="polite"
                className="mt-2 text-[11px] text-muted-foreground"
              >
                {saveState === "saved"
                  ? "Saved to IndexedDB."
                  : saveState === "error"
                    ? "Save failed. The project is unchanged."
                    : "No autosave in R1. Save explicitly."}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[15px]">Export</CardTitle>
              <CardDescription>
                WebM is required. MP4 depends on the codecs available in this
                browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="studio-format"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  Output format
                </label>
                <Select
                  value={format}
                  onValueChange={(value) => setFormat(value as "webm" | "mp4")}
                  disabled={exporting}
                >
                  <SelectTrigger id="studio-format" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webm">WebM / VP9 / Opus</SelectItem>
                    <SelectItem value="mp4">MP4 / H.264 / AAC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void renderProject()}
                  disabled={!scene || exporting}
                  className="h-10 px-4"
                >
                  {exporting ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <Download aria-hidden className="size-4" />
                  )}
                  {exporting ? "Exporting" : "Export video"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => controllerRef.current?.abort()}
                  disabled={!exporting}
                  className="h-10 border-border/80 bg-transparent px-4"
                >
                  <Square aria-hidden className="size-4" />
                  Cancel
                </Button>
              </div>

              {exporting ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Rendering frames</span>
                    <span className="tabular-nums">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              ) : null}

              <p
                aria-live="polite"
                className="text-[11px] text-muted-foreground"
              >
                {exportState === "idle"
                  ? "Ready to render."
                  : exportState === "done"
                    ? "Export complete."
                    : exportState === "cancelled"
                      ? "Export cancelled."
                      : exportState === "error"
                        ? "Export failed."
                        : "Rendering in the browser."}
              </p>

              {exportError ? (
                <p
                  role="alert"
                  className="text-[11px] leading-relaxed text-destructive"
                >
                  {exportError}
                </p>
              ) : null}

              {resultUrl ? (
                <div className="rounded-lg border border-brand/30 bg-brand/10 p-3">
                  <p className="text-[12px] font-medium text-foreground">
                    Output ready
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {resultSize ? formatBytes(resultSize) : "Unknown size"}
                    {renderMs ? ` · ${(renderMs / 1000).toFixed(1)} s` : ""}
                  </p>
                  <Button asChild className="mt-3 h-9 px-3">
                    <a href={resultUrl} download={downloadName}>
                      <Download aria-hidden className="size-4" />
                      Download {(resultFormat ?? format).toUpperCase()}
                    </a>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
