"use client";

import type { PlayerRef } from "@remotion/player";
import {
  ArrowLeft,
  Clapperboard,
  Download,
  Loader2,
  Redo2,
  Save,
  TriangleAlert,
  Undo2,
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
import { ASPECT_PRESETS } from "@/features/settings/types";
import {
  createAssetRepository,
  createProjectRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { exportProjectBackup } from "@/features/storage/project-backup";
import { ExportPanel } from "@/features/studio/components/export-panel";
import { ProjectAudioEditor } from "@/features/studio/components/project-audio-editor";
import { SceneInspector } from "@/features/studio/components/scene-inspector";
import { TimelinePanel } from "@/features/studio/components/timeline-panel";
import {
  addScene,
  deleteScene,
  duplicateScene,
  reorderScenes,
  setCanvas,
  setFrameRate,
  setSceneDuration,
} from "@/features/studio/editing/project-operations";
import {
  resetSceneField as resetSceneFieldValue,
  type SceneField,
  updateScene as updateSceneValue,
} from "@/features/studio/editing/scene-editing";
import { useProjectAutosave } from "@/features/studio/editing/use-project-autosave";
import { useProjectEditor } from "@/features/studio/editing/use-project-editor";
import { projectSlug } from "@/features/studio/file-name";
import { ProjectComposition } from "@/features/studio/rendering/project-composition";
import { validateTextOverlays } from "@/features/studio/rendering/text-safety";
import { projectDurationInFrames } from "@/features/studio/rendering/timeline";
import type {
  AspectRatio,
  Scene,
  VideoProject,
} from "@/features/studio/scene/scene.types";
import { ApplyTemplateDialog } from "@/features/templates/components/apply-template-dialog";
import { SaveTemplateDialog } from "@/features/templates/components/save-template-dialog";
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

export default function StudioProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Array.isArray(params.projectId)
    ? params.projectId[0]
    : params.projectId;
  const [loadedProject, setLoadedProject] = useState<VideoProject | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [exportingBackup, setExportingBackup] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playNonce, setPlayNonce] = useState(0);
  const [resolvedAudioAssets, setResolvedAudioAssets] = useState<
    Record<string, string>
  >({});
  const [audioWarnings, setAudioWarnings] = useState<string[]>([]);
  const playerRef = useRef<PlayerRef>(null);
  const pendingFrameRef = useRef<number | null>(null);
  const [playerInstance, setPlayerInstance] = useState<PlayerRef | null>(null);
  const attachPlayer = useCallback((instance: PlayerRef | null) => {
    playerRef.current = instance;
    setPlayerInstance(instance);
  }, []);
  const editor = useProjectEditor(loadedProject);
  const project = editor.project;
  const projectRef = useRef(project);
  const selectedIndexRef = useRef(selectedSceneIndex);
  projectRef.current = project;
  selectedIndexRef.current = selectedSceneIndex;
  const persistence = useProjectAutosave({
    project,
    enabled: loadState === "ready",
    save: async (next) => {
      const db = await openChessForgeDatabase();
      await createProjectRepository(db).save({
        ...next,
        updatedAt: new Date().toISOString(),
      });
    },
  });

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
        setLoadedProject(stored);
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
    if (!projectId) return;
    setSelectedSceneIndex(0);
    setCurrentFrame(0);
  }, [projectId]);

  useEffect(() => {
    if (!playerInstance || pendingFrameRef.current === null) return;
    playerInstance.seekTo(pendingFrameRef.current);
    pendingFrameRef.current = null;
  }, [playerInstance]);

  useEffect(() => {
    if (playNonce === 0 || !playerInstance) return;
    const timer = window.setTimeout(() => playerInstance.setVolume(1), 250);
    return () => window.clearTimeout(timer);
  }, [playNonce, playerInstance]);

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
    const current = projectRef.current;
    if (!current) return;
    const selected = current.scenes[selectedIndexRef.current];
    if (
      selected &&
      currentFrame >= selected.startFrame &&
      currentFrame < selected.startFrame + selected.durationInFrames
    ) {
      return;
    }
    const index = current.scenes.findIndex(
      (scene) =>
        currentFrame >= scene.startFrame &&
        currentFrame < scene.startFrame + scene.durationInFrames,
    );
    if (index >= 0) setSelectedSceneIndex(index);
  }, [currentFrame]);

  useEffect(() => {
    if (!project) return;
    if (selectedSceneIndex >= project.scenes.length) {
      setSelectedSceneIndex(Math.max(0, project.scenes.length - 1));
    }
  }, [project, selectedSceneIndex]);

  useEffect(() => {
    if (!persistence.dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [persistence.dirty]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "z"
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) editor.redo();
      else editor.undo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editor.redo, editor.undo]);

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
  const annotationWarnings = useMemo(() => {
    if (!project) return [];
    const valid = (square: string | undefined) =>
      Boolean(square && /^[a-h][1-8]$/.test(square));
    return project.scenes.flatMap((scene, index) =>
      scene.annotations
        .filter((annotation) =>
          annotation.type === "arrow"
            ? !valid(annotation.from) || !valid(annotation.to)
            : !valid(
                annotation.square ??
                  (annotation.type === "highlight" ? annotation.to : undefined),
              ),
        )
        .map(
          (annotation) =>
            `Scene ${index + 1}: Annotation ${annotation.id} has an invalid square and is skipped.`,
        ),
    );
  }, [project]);

  function seekToFrame(frame: number) {
    if (playerRef.current) {
      playerRef.current.seekTo(frame);
    } else {
      pendingFrameRef.current = frame;
    }
    setCurrentFrame(frame);
  }

  function seekToScene(index: number) {
    const scene = project?.scenes[index];
    if (!scene) return;
    setSelectedSceneIndex(index);
    seekToFrame(scene.startFrame);
  }

  const selectedSceneFrame = selectedScene
    ? Math.min(
        Math.max(0, currentFrame - selectedScene.startFrame),
        Math.max(0, selectedScene.durationInFrames - 1),
      )
    : 0;

  function editScene(field: SceneField, mutator: (scene: Scene) => Scene) {
    if (!selectedScene) return;
    const sceneId = selectedScene.id;
    editor.update((current) =>
      updateSceneValue(current, sceneId, field, mutator),
    );
  }

  function resetScene(field: SceneField) {
    if (!selectedScene) return;
    const sceneId = selectedScene.id;
    editor.update((current) => resetSceneFieldValue(current, sceneId, field));
  }

  function changeDuration(sceneId: string, frames: number) {
    editor.update((current) => setSceneDuration(current, sceneId, frames));
  }

  function changeAspectRatio(value: string) {
    editor.update((current) => setCanvas(current, value as AspectRatio));
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
      setSaveState("saved");
      toast.success("Project saved to this device.");
    } catch (error) {
      setSaveState("error");
      toast.error(toErrorMessage(error));
    }
  }

  async function exportBackup() {
    if (!project) return;
    setExportingBackup(true);
    try {
      await persistence.saveNow();
      const blob = await exportProjectBackup(project.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectSlug(project.name)}.chessforge`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Project backup exported.");
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setExportingBackup(false);
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

  const warnings = [...audioWarnings, ...textWarnings, ...annotationWarnings];

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

      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-surface-1 p-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!editor.canUndo}
          onClick={editor.undo}
        >
          <Undo2 aria-hidden className="size-3.5" />
          Undo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!editor.canRedo}
          onClick={editor.redo}
        >
          <Redo2 aria-hidden className="size-3.5" />
          Redo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void saveProject()}
          disabled={saveState === "saving"}
        >
          {saveState === "saving" ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : (
            <Save aria-hidden className="size-3.5" />
          )}
          Save now
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void exportBackup()}
          disabled={exportingBackup}
        >
          {exportingBackup ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : (
            <Download aria-hidden className="size-3.5" />
          )}
          Export project backup
        </Button>
        <span
          aria-live="polite"
          className={`text-[10px] ${
            persistence.state === "error"
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {persistence.state === "saving"
            ? "Saving..."
            : persistence.state === "saved"
              ? "Saved"
              : persistence.state === "error"
                ? (persistence.error ?? "Save failed")
                : "Autosave ready"}
        </span>
        {persistence.state === "error" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void persistence.retry()}
          >
            Retry
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setApplyTemplateOpen(true)}
        >
          Apply template
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!project.template}
          onClick={() => setSaveTemplateOpen(true)}
        >
          Save as template
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Template: {project.template?.name ?? project.templateId}
        </span>
        <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
          Aspect
          <select
            aria-label="Aspect ratio"
            value={project.canvas.aspectRatio}
            onChange={(event) => changeAspectRatio(event.target.value)}
            className="h-8 rounded border border-border/70 bg-background px-2 text-[11px] text-foreground"
          >
            {Object.keys(ASPECT_PRESETS).map((ratio) => (
              <option key={ratio} value={ratio}>
                {ratio}
              </option>
            ))}
          </select>
        </label>
      </section>

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
                    key={`${project.id}-${playNonce}`}
                    ref={attachPlayer}
                    component={ProjectPlayer}
                    inputProps={{ project, resolvedAudioAssets }}
                    initialFrame={0}
                    autoPlay={playNonce > 0}
                    initialVolume={playNonce > 0 ? 0 : 1}
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
                      seekToFrame(Number(event.target.value));
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
                        seekToFrame(frame);
                      }}
                      className="h-9 w-24 font-mono text-[11px]"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 px-3"
                    disabled={!playerInstance}
                    onClick={() => {
                      const player = playerRef.current;
                      if (player) {
                        player.play();
                        player.pause();
                        player.seekTo(0);
                      }
                      setSelectedSceneIndex(0);
                      setCurrentFrame(0);
                      setPlayNonce((value) => value + 1);
                    }}
                  >
                    Play from start
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 border-border/80 bg-transparent px-3"
                    disabled={!playerInstance}
                    onClick={() => playerRef.current?.pause()}
                  >
                    Pause
                  </Button>
                </div>
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
          {selectedScene ? (
            <SceneInspector
              project={project}
              scene={selectedScene}
              sceneFrame={selectedSceneFrame}
              onChange={editScene}
              onReset={resetScene}
            />
          ) : null}
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
                    {project.template?.name ?? project.templateId}
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
                {saveState === "saved" || persistence.state === "saved"
                  ? "Autosaved to IndexedDB."
                  : saveState === "saving" || persistence.state === "saving"
                    ? "Autosaving to IndexedDB."
                    : saveState === "error" || persistence.state === "error"
                      ? "Autosave failed. Edits stay in memory; retry above."
                      : "Edits autosave after 800 ms."}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[15px]">Project audio</CardTitle>
              <CardDescription>
                Music and project-level SFX tracks. Scene SFX live in the scene
                inspector.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectAudioEditor project={project} onChange={editor.update} />
            </CardContent>
          </Card>

          <ExportPanel
            project={project}
            resolvedAudioAssets={resolvedAudioAssets}
            onCanvasChange={(aspectRatio) =>
              editor.update((current) => setCanvas(current, aspectRatio))
            }
            onFrameRateChange={(frameRate) =>
              editor.update((current) => setFrameRate(current, frameRate))
            }
          />
        </div>
      </div>

      <ApplyTemplateDialog
        project={project}
        open={applyTemplateOpen}
        onOpenChange={setApplyTemplateOpen}
        onChange={(next) => editor.update(() => next)}
      />
      <SaveTemplateDialog
        project={project}
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
      />

      <TimelinePanel
        project={project}
        selectedSceneIndex={selectedSceneIndex}
        currentFrame={currentFrame}
        onSelect={seekToScene}
        onSeekFrame={seekToFrame}
        onDuration={changeDuration}
        onReorder={(from, to) => {
          editor.update((current) => reorderScenes(current, from, to));
          setSelectedSceneIndex(to);
        }}
        onDuplicate={(sceneId) => {
          editor.update((current) => duplicateScene(current, sceneId));
        }}
        onDelete={(sceneId) => {
          editor.update((current) => deleteScene(current, sceneId));
        }}
        onAdd={(sceneId) => {
          editor.update((current) => addScene(current, sceneId));
        }}
      />
    </div>
  );
}
