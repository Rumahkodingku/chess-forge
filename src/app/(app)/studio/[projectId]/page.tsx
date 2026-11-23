"use client";

import type { PlayerRef } from "@remotion/player";
import {
  ArrowLeft,
  Clapperboard,
  Download,
  Loader2,
  Save,
  Square,
  TriangleAlert,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAssetRepository,
  createProjectRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { formatBytes } from "@/features/storage/use-storage-status";
import { projectFileName } from "@/features/studio/file-name";
import { exportProject } from "@/features/studio/rendering/export-runner";
import { ProjectComposition } from "@/features/studio/rendering/project-composition";
import { validateTextOverlays } from "@/features/studio/rendering/text-safety";
import { projectDurationInFrames } from "@/features/studio/rendering/timeline";
import type { VideoProject } from "@/features/studio/scene/scene.types";
import { toErrorMessage } from "@/lib/errors";
import { isUuid } from "@/lib/validation";

const Player = dynamic(
  () => import("@remotion/player").then((module) => module.Player),
  { ssr: false },
);

const ProjectPlayer = ProjectComposition as unknown as ComponentType<
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
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [resolvedAudioAssets, setResolvedAudioAssets] = useState<
    Record<string, string>
  >({});
  const [audioWarnings, setAudioWarnings] = useState<string[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);
  const playerRef = useRef<PlayerRef>(null);
  const [playerInstance, setPlayerInstance] = useState<PlayerRef | null>(null);
  const attachPlayer = useCallback((instance: PlayerRef | null) => {
    playerRef.current = instance;
    setPlayerInstance(instance);
  }, []);

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

  const audioAssetIds = useMemo(
    () => [
      ...new Set(
        (project?.audioTracks ?? []).flatMap((track) =>
          track.source.type === "asset" ? [track.source.assetId] : [],
        ),
      ),
    ],
    [project],
  );
  const audioAssetKey = audioAssetIds.join("|");

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    async function resolveAssets() {
      const ids = audioAssetKey ? audioAssetKey.split("|") : [];
      if (!ids.length) {
        setResolvedAudioAssets({});
        setAudioWarnings([]);
        return;
      }
      try {
        const db = await openChessForgeDatabase();
        const repository = createAssetRepository(db);
        const next: Record<string, string> = {};
        const missing: string[] = [];
        for (const id of ids) {
          const asset = await repository.getById(id);
          if (asset?.kind === "audio") {
            const url = URL.createObjectURL(asset.data);
            if (cancelled) {
              URL.revokeObjectURL(url);
              return;
            }
            urls.push(url);
            next[id] = url;
          } else {
            missing.push(id);
          }
        }
        if (!cancelled) {
          setResolvedAudioAssets(next);
          setAudioWarnings(
            missing.map(
              (id) => `Audio asset ${id} is missing or is not an audio file.`,
            ),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setResolvedAudioAssets({});
          setAudioWarnings([toErrorMessage(error)]);
        }
      }
    }
    void resolveAssets();
    return () => {
      cancelled = true;
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [audioAssetKey]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!projectId) return;
    setSelectedSceneIndex(0);
    setCurrentFrame(0);
  }, [projectId]);

  useEffect(() => {
    if (!project?.id || !playerInstance) return;
    const player = playerInstance;
    const onFrame = (event: { detail: { frame: number } }) => {
      setCurrentFrame(event.detail.frame);
    };
    player.addEventListener("frameupdate", onFrame);
    return () => player.removeEventListener("frameupdate", onFrame);
  }, [project?.id, playerInstance]);

  useEffect(() => {
    if (!project) return;
    const index = project.scenes.findIndex(
      (scene) =>
        currentFrame >= scene.startFrame &&
        currentFrame < scene.startFrame + scene.durationInFrames,
    );
    if (index >= 0) setSelectedSceneIndex(index);
  }, [currentFrame, project]);

  const durationInFrames = project ? projectDurationInFrames(project) : 0;
  const selectedScene =
    project?.scenes[selectedSceneIndex] ?? project?.scenes[0];
  const textWarnings = useMemo(() => {
    if (!project) return [];
    return project.scenes.flatMap((scene, index) =>
      validateTextOverlays(scene.textOverlays, project.canvas).map(
        (warning) => `Scene ${index + 1}: ${warning}`,
      ),
    );
  }, [project]);

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

  function seekToScene(index: number) {
    const scene = project?.scenes[index];
    if (!scene) return;
    setSelectedSceneIndex(index);
    playerRef.current?.seekTo(scene.startFrame);
    setCurrentFrame(scene.startFrame);
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
    if (!project || !project.scenes.length) return;
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
        resolvedAudioAssets,
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
  const warnings = [...audioWarnings, ...textWarnings];

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={
          project.gameSnapshot
            ? `${project.gameSnapshot.metadata.white} vs ${project.gameSnapshot.metadata.black} · ${project.canvas.aspectRatio} · ${(durationInFrames / project.frameRate).toFixed(1)}s`
            : `${project.canvas.aspectRatio} · ${project.scenes.length} scene${project.scenes.length === 1 ? "" : "s"}`
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
              Full sequence in Remotion Player. The same composition renders to
              the file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {project.scenes.length ? (
              <>
                <div className="mx-auto w-full max-w-[440px] overflow-hidden rounded-xl border border-border/80 bg-black">
                  <Player
                    ref={attachPlayer}
                    component={ProjectPlayer}
                    inputProps={{ project, resolvedAudioAssets }}
                    durationInFrames={durationInFrames}
                    compositionWidth={project.canvas.width}
                    compositionHeight={project.canvas.height}
                    fps={project.frameRate}
                    loop
                    acknowledgeRemotionLicense
                    style={{
                      width: "100%",
                      aspectRatio: `${project.canvas.width} / ${project.canvas.height}`,
                    }}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, durationInFrames - 1)}
                    value={currentFrame}
                    aria-label="Seek video"
                    onChange={(event) => {
                      const frame = Number(event.target.value);
                      playerRef.current?.seekTo(frame);
                      setCurrentFrame(frame);
                    }}
                    className="w-full accent-[#e8b45a]"
                  />
                  <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                    <span>
                      Frame {currentFrame} / {durationInFrames}
                    </span>
                    <span>
                      {(durationInFrames / project.frameRate).toFixed(1)}s
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <label
                      htmlFor="studio-frame"
                      className="text-[10px] text-muted-foreground"
                    >
                      Frame
                    </label>
                    <Input
                      id="studio-frame"
                      type="number"
                      min={0}
                      max={Math.max(0, durationInFrames - 1)}
                      value={currentFrame}
                      onChange={(event) => {
                        const frame = Math.min(
                          Math.max(0, Number(event.target.value)),
                          Math.max(0, durationInFrames - 1),
                        );
                        playerRef.current?.seekTo(frame);
                        setCurrentFrame(frame);
                      }}
                      className="h-9 w-24 font-mono text-[11px]"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 px-3"
                    onClick={() => {
                      playerRef.current?.seekTo(0);
                      playerRef.current?.play();
                    }}
                  >
                    Play from start
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 border-border/80 bg-transparent px-3"
                    onClick={() => playerRef.current?.pause()}
                  >
                    Pause
                  </Button>
                </div>
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {project.scenes.map((scene, index) => (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => seekToScene(index)}
                      aria-current={
                        selectedSceneIndex === index ? "true" : undefined
                      }
                      className={`flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                        selectedSceneIndex === index
                          ? "border-brand/40 bg-brand/10 text-foreground"
                          : "border-border/70 bg-surface-2/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[12px] capitalize">
                          {scene.type}
                        </span>
                      </span>
                      <span className="font-mono text-[10px]">
                        {(scene.startFrame / project.frameRate).toFixed(1)}s -{" "}
                        {(
                          (scene.startFrame + scene.durationInFrames) /
                          project.frameRate
                        ).toFixed(1)}
                        s
                      </span>
                    </button>
                  ))}
                </div>
                {selectedScene ? (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Selected scene {selectedSceneIndex + 1}:{" "}
                    {selectedScene.type}, {selectedScene.durationInFrames}{" "}
                    frames.
                  </p>
                ) : null}
              </>
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
            {warnings.length ? (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="flex items-center gap-2 text-[11px] font-medium text-amber-200">
                  <TriangleAlert aria-hidden className="size-3.5" />
                  Preview warnings
                </p>
                <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-amber-100/80">
                  {warnings.slice(0, 6).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[15px]">Project details</CardTitle>
              <CardDescription>
                The game snapshot keeps the project renderable after the source
                game is deleted.
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
                  <dt className="text-muted-foreground">Audio tracks</dt>
                  <dd className="font-mono text-foreground">
                    {project.audioTracks.length}
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
                    : "No autosave in R4. Save explicitly."}
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
                  disabled={!project.scenes.length || exporting}
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
