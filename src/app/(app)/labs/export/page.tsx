"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Film,
  Square,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
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
  createExportFixtureProject,
  type ExportFixtureVariant,
} from "@/features/studio/rendering/export-fixture";
import { exportProject } from "@/features/studio/rendering/export-runner";
import { SceneComposition } from "@/features/studio/rendering/scene-composition";

const Player = dynamic(
  () => import("@remotion/player").then((module) => module.Player),
  { ssr: false },
);

const ScenePlayer = SceneComposition as unknown as ComponentType<
  Record<string, unknown>
>;

type CodecId = "mp4-h264" | "webm-vp9" | "webm-vp8";
type JobStatus =
  | "idle"
  | "checking"
  | "ready"
  | "rendering"
  | "done"
  | "cancelled"
  | "error";

interface CodecOption {
  id: CodecId;
  label: string;
  container: "mp4" | "webm";
  videoCodec: "h264" | "vp9" | "vp8";
  audioCodec: "aac" | "opus";
  extension: string;
}

const codecOptions: CodecOption[] = [
  {
    id: "mp4-h264",
    label: "MP4 / H.264 / AAC",
    container: "mp4",
    videoCodec: "h264",
    audioCodec: "aac",
    extension: "mp4",
  },
  {
    id: "webm-vp9",
    label: "WebM / VP9 / Opus",
    container: "webm",
    videoCodec: "vp9",
    audioCodec: "opus",
    extension: "webm",
  },
  {
    id: "webm-vp8",
    label: "WebM / VP8 / Opus",
    container: "webm",
    videoCodec: "vp8",
    audioCodec: "opus",
    extension: "webm",
  },
];

interface CapabilityEntry {
  canRender: boolean;
  issues: string[];
}

export default function ExportLabPage() {
  const [variant, setVariant] = useState<ExportFixtureVariant>("portrait");
  const [selectedCodec, setSelectedCodec] = useState<CodecId>("webm-vp9");
  const [capabilities, setCapabilities] = useState<
    Record<string, CapabilityEntry>
  >({});
  const [status, setStatus] = useState<JobStatus>("checking");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);

  const project = useMemo(() => createExportFixtureProject(variant), [variant]);
  const scene = project.scenes[0];
  const selected = useMemo(
    () =>
      codecOptions.find((option) => option.id === selectedCodec) ??
      codecOptions[0],
    [selectedCodec],
  );

  useEffect(() => {
    let cancelled = false;
    setStatus("checking");
    setCapabilities({});
    async function check() {
      try {
        const { canRenderMediaOnWeb } = await import("@remotion/web-renderer");
        const entries: Record<string, CapabilityEntry> = {};
        for (const option of codecOptions) {
          try {
            const result = await canRenderMediaOnWeb({
              container: option.container,
              videoCodec: option.videoCodec,
              audioCodec: option.audioCodec,
              width: project.canvas.width,
              height: project.canvas.height,
              outputTarget: "arraybuffer",
            });
            entries[option.id] = {
              canRender: result.canRender,
              issues: result.issues.map((issue) => issue.message),
            };
          } catch (checkError) {
            entries[option.id] = {
              canRender: false,
              issues: [
                checkError instanceof Error
                  ? checkError.message
                  : "Capability check failed.",
              ],
            };
          }
        }
        if (!cancelled) {
          setCapabilities(entries);
          setStatus("ready");
          const firstSupported = codecOptions.find(
            (option) => entries[option.id]?.canRender,
          );
          if (firstSupported) {
            setSelectedCodec(firstSupported.id);
          }
        }
      } catch (checkError) {
        if (!cancelled) {
          setStatus("error");
          setError(
            checkError instanceof Error
              ? checkError.message
              : "The browser capability check failed.",
          );
        }
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [project.canvas.height, project.canvas.width]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function clearResult() {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setResultUrl(null);
    setResultSize(null);
    setRenderMs(null);
  }

  async function render() {
    if (!scene) return;
    clearResult();
    setError(null);
    setProgress(0);
    setStatus("rendering");
    const controller = new AbortController();
    controllerRef.current = controller;
    const started = performance.now();
    try {
      const result = await exportProject({
        project,
        container: selected.container,
        videoCodec: selected.videoCodec,
        audioCodec: selected.audioCodec,
        signal: controller.signal,
        onProgress: (nextProgress) =>
          setProgress(Math.round(nextProgress * 100)),
      });
      const url = URL.createObjectURL(result.blob);
      urlRef.current = url;
      setResultUrl(url);
      setResultSize(result.blob.size);
      setRenderMs(Math.round(performance.now() - started));
      setProgress(100);
      setStatus("done");
    } catch (renderError) {
      if (controller.signal.aborted) {
        setStatus("cancelled");
        setError("Render cancelled. No output file was kept.");
      } else {
        setStatus("error");
        setError(
          renderError instanceof Error
            ? renderError.message
            : "The render failed.",
        );
      }
    } finally {
      controllerRef.current = null;
    }
  }

  function cancel() {
    controllerRef.current?.abort();
  }

  const rendering = status === "rendering";
  const capability = capabilities[selected.id];
  const supported = capability?.canRender ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export lab"
        description="Render proof. A three-second chess scene with a legal move, audio, and a real output file. This is not the final export interface."
        actions={
          <Badge
            variant="outline"
            className="h-9 border-border/80 px-3 text-[11px]"
          >
            R0/R1 proof
          </Badge>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <Card className="border-border/80 bg-surface-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <Film aria-hidden className="size-4 text-brand" />
              Composition preview
            </CardTitle>
            <CardDescription>
              Remotion Player preview at {project.canvas.width} x{" "}
              {project.canvas.height}. The same project is passed to the web
              renderer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="mx-auto w-full overflow-hidden rounded-xl border border-border/80 bg-black"
              style={{ maxWidth: variant === "portrait" ? 420 : 760 }}
            >
              {scene ? (
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
              ) : null}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              The proof scene animates 1. e4 on a local SVG board, adds a move
              label, and plays a generated CC0 move sound.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[15px]">Render settings</CardTitle>
              <CardDescription>
                Capability detection runs in this browser before rendering.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="export-variant"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  Aspect ratio
                </label>
                <Select
                  value={variant}
                  onValueChange={(value) =>
                    setVariant(value as ExportFixtureVariant)
                  }
                >
                  <SelectTrigger id="export-variant" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">9:16 portrait</SelectItem>
                    <SelectItem value="landscape">16:9 landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="export-codec"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  Output format
                </label>
                <Select
                  value={selectedCodec}
                  onValueChange={(value) => setSelectedCodec(value as CodecId)}
                  disabled={rendering}
                >
                  <SelectTrigger id="export-codec" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {codecOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                        {capabilities[option.id]?.canRender === false
                          ? " (unsupported)"
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-border/80 bg-surface-2 p-3">
                <p className="text-[11px] text-muted-foreground">
                  Capability result
                </p>
                <div className="mt-2 flex items-start gap-2">
                  {supported ? (
                    <CheckCircle2
                      aria-hidden
                      className="mt-0.5 size-4 text-brand"
                    />
                  ) : (
                    <AlertTriangle
                      aria-hidden
                      className="mt-0.5 size-4 text-destructive"
                    />
                  )}
                  <div>
                    <p className="text-[12px] font-medium text-foreground">
                      {supported
                        ? "This combination is supported."
                        : "This combination is not supported."}
                    </p>
                    {capability?.issues.length ? (
                      <ul className="mt-1 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
                        {capability.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void render()}
                  disabled={!supported || rendering || status === "checking"}
                  className="h-10 px-4"
                >
                  Render 5 second video
                </Button>
                <Button
                  onClick={cancel}
                  disabled={!rendering}
                  variant="outline"
                  className="h-10 border-border/80 bg-transparent px-4"
                >
                  <Square aria-hidden className="size-4" />
                  Cancel
                </Button>
              </div>

              {rendering ? (
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
                {status === "checking"
                  ? "Checking codecs."
                  : status === "ready"
                    ? "Capability check complete."
                    : status === "rendering"
                      ? "Rendering in the browser. You can cancel."
                      : status === "done"
                        ? "Render complete."
                        : status === "cancelled"
                          ? "Render cancelled."
                          : status === "error"
                            ? "Render failed."
                            : "Ready."}
              </p>

              {error ? (
                <p
                  role="alert"
                  className="text-[11px] leading-relaxed text-destructive"
                >
                  {error}
                </p>
              ) : null}

              {resultUrl ? (
                <div className="rounded-lg border border-brand/30 bg-brand/10 p-3">
                  <p className="text-[12px] font-medium text-foreground">
                    Output ready
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {resultSize
                      ? `${(resultSize / 1024 / 1024).toFixed(2)} MB`
                      : "Unknown size"}
                    {renderMs ? ` · ${(renderMs / 1000).toFixed(1)} s` : ""}
                  </p>
                  <Button asChild className="mt-3 h-9 px-3">
                    <a
                      href={resultUrl}
                      download={`chessforge-r1-export.${selected.extension}`}
                    >
                      <Download aria-hidden className="size-4" />
                      Download file
                    </a>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[15px]">Capability matrix</CardTitle>
              <CardDescription>
                Checked with `canRenderMediaOnWeb` for this viewport.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {codecOptions.map((option) => {
                  const entry = capabilities[option.id];
                  return (
                    <li
                      key={option.id}
                      className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0"
                    >
                      <div>
                        <p className="text-[12px] text-foreground">
                          {option.label}
                        </p>
                        {entry?.issues.length ? (
                          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                            {entry.issues[0]}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded border border-border/80 px-2 py-1 text-[10px] text-muted-foreground">
                        {entry
                          ? entry.canRender
                            ? "Supported"
                            : "Unsupported"
                          : "Checking"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
