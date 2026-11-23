// biome-ignore-all lint/a11y/noLabelWithoutControl: labels wrap the project Input and select controls
"use client";

import { Download, Loader2, Square, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { DEFAULT_SETTINGS } from "@/features/settings/types";
import {
  createSettingsRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { formatBytes } from "@/features/storage/use-storage-status";
import {
  type FormatCapability,
  resolveSelectedFormat,
  shouldUseOpfs,
} from "@/features/studio/export/capabilities";
import {
  defaultExportName,
  durationPolicy,
  EXPORT_FORMATS,
  type ExportConfig,
  type ExportQuality,
  type ExportResolution,
  resolutionDimensions,
  sanitizeExportName,
} from "@/features/studio/export/config";
import { projectFileName } from "@/features/studio/file-name";
import {
  type ExportProgress,
  exportProject,
  projectHasAudio,
} from "@/features/studio/rendering/export-runner";
import { projectDurationInFrames } from "@/features/studio/rendering/timeline";
import type {
  AspectRatio,
  VideoProject,
} from "@/features/studio/scene/scene.types";
import {
  ExportError,
  toErrorMessage,
  UnsupportedCapabilityError,
} from "@/lib/errors";

type ExportStatus =
  | "checking"
  | "ready"
  | "rendering"
  | "done"
  | "cancelled"
  | "error";

interface CapabilityView extends FormatCapability {
  outputTarget: "web-fs" | "arraybuffer";
  fallbackFromOpfs: boolean;
}

interface ExportPanelProps {
  project: VideoProject;
  resolvedAudioAssets: Record<string, string>;
  onCanvasChange: (aspectRatio: AspectRatio) => void;
  onFrameRateChange: (frameRate: 30 | 60) => void;
}

const RESOLUTIONS: ExportResolution[] = ["720p", "1080p"];
const QUALITIES: ExportQuality[] = ["low", "medium", "high"];
const ASPECTS: AspectRatio[] = ["9:16", "16:9", "1:1", "4:5"];

const labelClass = "grid gap-1 text-[10px] text-muted-foreground";
const selectClass =
  "h-8 rounded border border-border/70 bg-background px-2 text-[11px] text-foreground";

function errorMessage(error: unknown): string {
  if (error instanceof ExportError) {
    return `${error.message}${error.recovery ? ` ${error.recovery}` : ""}`;
  }
  if (error instanceof UnsupportedCapabilityError) {
    return `${error.message}${error.recovery ? ` ${error.recovery}` : ""}`;
  }
  return toErrorMessage(error);
}

export function ExportPanel({
  project,
  resolvedAudioAssets,
  onCanvasChange,
  onFrameRateChange,
}: ExportPanelProps) {
  const [resolution, setResolution] = useState<ExportResolution>(
    DEFAULT_SETTINGS.defaultResolution,
  );
  const [quality, setQuality] = useState<ExportQuality>("medium");
  const [formatId, setFormatId] = useState(EXPORT_FORMATS[0]?.id ?? "webm-vp9");
  const [includeAudio, setIncludeAudio] = useState(() =>
    projectHasAudio(project),
  );
  const [fileName, setFileName] = useState(() =>
    defaultExportName(project.name, DEFAULT_SETTINGS.defaultResolution),
  );
  const [fileNameDirty, setFileNameDirty] = useState(false);
  const [capabilities, setCapabilities] = useState<CapabilityView[]>([]);
  const [checking, setChecking] = useState(true);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [status, setStatus] = useState<ExportStatus>("checking");
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memoryWarning, setMemoryWarning] = useState(false);
  const [result, setResult] = useState<{
    url: string;
    size: number;
    milliseconds: number;
    extension: "mp4" | "webm";
  } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);

  const durationFrames = projectDurationInFrames(project);
  const durationSeconds = durationFrames / project.frameRate;
  const durationState = durationPolicy(durationSeconds);
  const hasAudio = projectHasAudio(project);
  const selectedFormat = useMemo(
    () =>
      capabilities.find(
        (entry) => entry.format.id === formatId && entry.canRender,
      )?.format,
    [capabilities, formatId],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const db = await openChessForgeDatabase();
        const settings = await createSettingsRepository(db).get();
        if (!cancelled && settings) setResolution(settings.defaultResolution);
      } catch {
        // Use the application default.
      }
    }
    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setIncludeAudio(hasAudio);
  }, [hasAudio]);

  useEffect(() => {
    if (fileNameDirty) return;
    setFileName(defaultExportName(project.name, resolution));
  }, [fileNameDirty, project.name, resolution]);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    setCapabilityError(null);
    const opfsAvailable =
      typeof navigator !== "undefined" &&
      typeof navigator.storage?.getDirectory === "function";
    const preferOpfs = shouldUseOpfs(durationSeconds, opfsAvailable);
    const audioCodec = includeAudio && hasAudio;
    const preferredTarget = preferOpfs ? "web-fs" : "arraybuffer";

    async function check() {
      try {
        const { canRenderMediaOnWeb } = await import("@remotion/web-renderer");
        const entries: CapabilityView[] = [];
        for (const format of EXPORT_FORMATS) {
          const base = {
            container: format.container,
            videoCodec: format.videoCodec,
            audioCodec: audioCodec ? format.audioCodec : null,
            width: resolutionDimensions(project.canvas.aspectRatio, resolution)
              .width,
            height: resolutionDimensions(project.canvas.aspectRatio, resolution)
              .height,
          };
          let outputTarget: "web-fs" | "arraybuffer" = preferredTarget;
          let fallbackFromOpfs = false;
          let capability = await canRenderMediaOnWeb({
            ...base,
            outputTarget,
          });
          if (!capability.canRender && outputTarget === "web-fs") {
            outputTarget = "arraybuffer";
            fallbackFromOpfs = true;
            capability = await canRenderMediaOnWeb({
              ...base,
              outputTarget,
            });
          }
          entries.push({
            format,
            canRender: capability.canRender,
            issues: capability.issues.map((issue) => issue.message),
            outputTarget,
            fallbackFromOpfs,
          });
        }
        if (cancelled) return;
        setCapabilities(entries);
        setFormatId(
          (current) => resolveSelectedFormat(entries, current)?.id ?? current,
        );
        setMemoryWarning(
          preferOpfs &&
            entries.some((entry) => entry.fallbackFromOpfs && entry.canRender),
        );
        setChecking(false);
        setStatus((current) =>
          current === "checking" || current === "ready" ? "ready" : current,
        );
      } catch (checkError) {
        if (!cancelled) {
          setCapabilityError(errorMessage(checkError));
          setChecking(false);
          setStatus("error");
        }
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [
    durationSeconds,
    hasAudio,
    includeAudio,
    project.canvas.aspectRatio,
    resolution,
  ]);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  useEffect(() => {
    if (status !== "rendering") return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status]);

  function clearResult() {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setResult(null);
  }

  async function startExport() {
    if (!selectedFormat || durationState === "blocked") return;
    clearResult();
    setError(null);
    setProgress(null);
    setStatus("rendering");
    const controller = new AbortController();
    controllerRef.current = controller;
    const started = performance.now();
    const config: ExportConfig = {
      container: selectedFormat.container,
      videoCodec: selectedFormat.videoCodec,
      audioCodec: selectedFormat.audioCodec,
      resolution,
      quality,
      includeAudio: includeAudio && hasAudio,
      fileName: sanitizeExportName(fileName),
    };
    try {
      const output = await exportProject({
        project,
        config,
        resolvedAudioAssets,
        signal: controller.signal,
        onProgress: setProgress,
      });
      const url = URL.createObjectURL(output.blob);
      urlRef.current = url;
      setResult({
        url,
        size: output.blob.size,
        milliseconds: Math.round(performance.now() - started),
        extension: output.extension,
      });
      setProgress((current) => (current ? { ...current, percent: 100 } : null));
      setStatus("done");
      setMemoryWarning((current) => current || output.fallbackFromOpfs);
    } catch (exportFailure) {
      if (controller.signal.aborted) {
        setStatus("cancelled");
        setProgress(null);
      } else {
        setStatus("error");
        setError(errorMessage(exportFailure));
      }
    } finally {
      controllerRef.current = null;
    }
  }

  function cancelExport() {
    controllerRef.current?.abort();
    setStatus("cancelled");
    setProgress(null);
  }

  const blocked = durationState === "blocked";
  const noFormat = !selectedFormat;
  const selectedCapability = capabilities.find(
    (entry) => entry.format.id === selectedFormat?.id,
  );
  const extension = selectedFormat?.extension ?? "webm";
  const downloadName = projectFileName(fileName, extension);
  const exporting = status === "rendering";

  return (
    <Card className="border-border/80 bg-surface-1">
      <CardHeader>
        <CardTitle className="text-[15px]">Export</CardTitle>
        <CardDescription>
          Render the project snapshot to a validated MP4 or WebM file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>
            Aspect ratio
            <select
              aria-label="Export aspect ratio"
              className={selectClass}
              value={project.canvas.aspectRatio}
              disabled={exporting}
              onChange={(event) =>
                onCanvasChange(event.target.value as AspectRatio)
              }
            >
              {ASPECTS.map((aspect) => (
                <option key={aspect} value={aspect}>
                  {aspect}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Frame rate
            <select
              className={selectClass}
              value={project.frameRate}
              disabled={exporting}
              onChange={(event) => {
                const next = Number(event.target.value) as 30 | 60;
                if (
                  window.confirm(
                    `Change frame rate to ${next} FPS? Scene frame counts stay the same, so the project duration and preview timing change.`,
                  )
                ) {
                  onFrameRateChange(next);
                }
              }}
            >
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
            </select>
          </label>
          <label className={labelClass}>
            Resolution
            <select
              className={selectClass}
              value={resolution}
              disabled={exporting}
              onChange={(event) =>
                setResolution(event.target.value as ExportResolution)
              }
            >
              {RESOLUTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Quality
            <select
              className={selectClass}
              value={quality}
              disabled={exporting}
              onChange={(event) =>
                setQuality(event.target.value as ExportQuality)
              }
            >
              {QUALITIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-[10px] text-muted-foreground">Format</legend>
          <div className="space-y-1">
            {EXPORT_FORMATS.map((format) => {
              const capability = capabilities.find(
                (entry) => entry.format.id === format.id,
              );
              return (
                <label
                  key={format.id}
                  className={`flex items-start gap-2 rounded border p-2 text-[11px] ${
                    formatId === format.id
                      ? "border-brand/40 bg-brand/10"
                      : "border-border/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="export-format"
                    checked={formatId === format.id}
                    disabled={exporting || checking || !capability?.canRender}
                    onChange={() => setFormatId(format.id)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium">{format.label}</span>
                    <span className="text-muted-foreground">
                      {checking
                        ? "Checking..."
                        : capability?.canRender
                          ? `Supported · ${capability.outputTarget}`
                          : (capability?.issues.join(" ") ?? "Unsupported")}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={includeAudio && hasAudio}
              disabled={exporting || !hasAudio}
              onChange={(event) => setIncludeAudio(event.target.checked)}
            />
            Include audio
          </label>
          <span className="text-[10px] text-muted-foreground">
            {durationSeconds.toFixed(1)}s · {durationState}
          </span>
        </div>

        <label className={labelClass}>
          File name
          <Input
            value={fileName}
            disabled={exporting}
            onChange={(event) => {
              setFileNameDirty(true);
              setFileName(event.target.value);
            }}
            onBlur={() => setFileName(sanitizeExportName(fileName))}
            className="h-8 text-[11px]"
          />
          <span className="text-[10px] text-muted-foreground">
            {downloadName}
          </span>
        </label>

        {durationState === "warning" ? (
          <p className="flex items-center gap-2 text-[11px] text-amber-200">
            <TriangleAlert className="size-3.5" />
            This project is longer than 5 minutes. Export may take a while.
          </p>
        ) : null}
        {blocked ? (
          <p className="text-[11px] text-destructive">
            This project is longer than the 15-minute export cap. Shorten the
            timeline before exporting.
          </p>
        ) : null}
        {memoryWarning ? (
          <p className="text-[11px] text-amber-200">
            OPFS is unavailable. This long export uses memory; lower the
            resolution if the browser runs out.
          </p>
        ) : null}
        {capabilityError ? (
          <p role="alert" className="text-[11px] text-destructive">
            {capabilityError}
          </p>
        ) : null}
        {noFormat && !checking ? (
          <p className="text-[11px] text-destructive">
            No supported export format. Try current Chrome or Edge.
          </p>
        ) : null}
        {selectedCapability?.issues.length ? (
          <p className="text-[10px] text-muted-foreground">
            {selectedCapability.issues.join(" ")}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void startExport()}
            disabled={exporting || checking || blocked || noFormat}
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
            onClick={cancelExport}
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
              <span>
                Rendering frames {progress?.renderedFrames ?? 0} · encoded{" "}
                {progress?.encodedFrames ?? 0}
              </span>
              <span className="tabular-nums">{progress?.percent ?? 0}%</span>
            </div>
            <Progress value={progress?.percent ?? 0} className="h-1.5" />
            {progress?.estimatedMs ? (
              <p className="text-[10px] text-muted-foreground">
                Estimated {Math.ceil(progress.estimatedMs / 1000)}s remaining
              </p>
            ) : null}
          </div>
        ) : null}

        <p aria-live="polite" className="text-[11px] text-muted-foreground">
          {status === "ready"
            ? "Ready to render."
            : status === "checking"
              ? "Checking browser capabilities."
              : status === "done"
                ? "Export complete and validated."
                : status === "cancelled"
                  ? "Export cancelled. No file was kept."
                  : status === "error"
                    ? "Export failed."
                    : "Rendering in the browser."}
        </p>

        {error ? (
          <p
            role="alert"
            className="text-[11px] leading-relaxed text-destructive"
          >
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="rounded-lg border border-brand/30 bg-brand/10 p-3">
            <p className="text-[12px] font-medium text-foreground">
              Output ready
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {formatBytes(result.size)} ·{" "}
              {(result.milliseconds / 1000).toFixed(1)}s
            </p>
            <Button asChild className="mt-3 h-9 px-3">
              <a
                href={result.url}
                download={projectFileName(fileName, result.extension)}
              >
                <Download aria-hidden className="size-4" />
                Download {result.extension === "mp4" ? "MP4" : "WebM"}
              </a>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
