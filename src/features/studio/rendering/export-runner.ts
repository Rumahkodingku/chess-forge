import {
  classifyExportFailure,
  shouldUseOpfs,
} from "@/features/studio/export/capabilities";
import {
  type ExportConfig,
  qualitySettings,
  resolutionDimensions,
} from "@/features/studio/export/config";
import {
  type ExportMetadata,
  validateExportFile,
} from "@/features/studio/export/validate";
import { ProjectComposition } from "@/features/studio/rendering/project-composition";
import { projectDurationInFrames } from "@/features/studio/rendering/timeline";
import type { VideoProject } from "@/features/studio/scene/scene.types";
import { ExportError, UnsupportedCapabilityError } from "@/lib/errors";

export interface ExportProgress {
  percent: number;
  renderedFrames: number;
  encodedFrames: number;
  estimatedMs: number | null;
}

export interface ExportProjectRequest {
  project: VideoProject;
  config: ExportConfig;
  resolvedAudioAssets?: Record<string, string>;
  signal: AbortSignal;
  onProgress: (progress: ExportProgress) => void;
}

export interface ExportProjectResult {
  blob: Blob;
  extension: "webm" | "mp4";
  mimeType: string;
  metadata: ExportMetadata;
  usedOpfs: boolean;
  fallbackFromOpfs: boolean;
}

export function projectHasAudio(project: VideoProject): boolean {
  return (
    project.audioTracks.some((track) => !track.muted) ||
    project.scenes.some((scene) =>
      scene.audioEvents.some((event) => !event.muted),
    )
  );
}

function opfsAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage?.getDirectory === "function"
  );
}

export async function exportProject(
  request: ExportProjectRequest,
): Promise<ExportProjectResult> {
  if (!request.project.scenes.length) {
    throw new ExportError(
      "validation",
      "This project has no scene to render.",
      "Open the project and add a scene first.",
    );
  }

  const durationInFrames = projectDurationInFrames(request.project);
  const durationSeconds = durationInFrames / request.project.frameRate;
  if (durationSeconds > 15 * 60) {
    throw new ExportError(
      "validation",
      "This project is longer than the 15-minute export cap.",
      "Shorten the timeline before exporting.",
    );
  }
  const { width, height } = resolutionDimensions(
    request.project.canvas.aspectRatio,
    request.config.resolution,
  );
  const quality = qualitySettings(request.config.quality);
  const hasAudio = projectHasAudio(request.project);
  const includeAudio = request.config.includeAudio && hasAudio;
  const resolvedAudioAssets = request.resolvedAudioAssets ?? {};
  const resolvedHasAudio =
    request.project.scenes.some((scene) =>
      scene.audioEvents.some((event) => !event.muted),
    ) ||
    request.project.audioTracks.some(
      (track) =>
        !track.muted &&
        (track.source.type === "builtin" ||
          Boolean(resolvedAudioAssets[track.source.assetId])),
    );
  const preferOpfs = shouldUseOpfs(durationSeconds, opfsAvailable());
  const selectedTarget = preferOpfs ? "web-fs" : "arraybuffer";

  const { canRenderMediaOnWeb, renderMediaOnWeb } = await import(
    "@remotion/web-renderer"
  );

  async function capabilityFor(target: "web-fs" | "arraybuffer") {
    return canRenderMediaOnWeb({
      container: request.config.container,
      videoCodec: request.config.videoCodec,
      audioCodec: includeAudio ? request.config.audioCodec : null,
      muted: !includeAudio,
      width,
      height,
      outputTarget: target,
    });
  }

  let outputTarget: "web-fs" | "arraybuffer" = selectedTarget;
  let fallbackFromOpfs = false;
  let capability = await capabilityFor(outputTarget);
  if (preferOpfs && outputTarget === "web-fs" && !capability.canRender) {
    outputTarget = "arraybuffer";
    fallbackFromOpfs = true;
    capability = await capabilityFor(outputTarget);
  }
  if (!capability.canRender) {
    throw new UnsupportedCapabilityError(
      capability.issues.map((issue) => issue.message).join(" ") ||
        "This browser cannot render the selected format.",
      "Choose WebM VP9, lower the resolution, or use current Chrome or Edge.",
    );
  }

  const snapshot = structuredClone(request.project);
  async function render(target: "web-fs" | "arraybuffer") {
    return renderMediaOnWeb({
      composition: {
        id: `chessforge-${snapshot.id}`,
        component: ProjectComposition,
        width,
        height,
        fps: snapshot.frameRate,
        durationInFrames,
        calculateMetadata: null,
        defaultProps: {
          project: snapshot,
          resolvedAudioAssets,
        },
      },
      inputProps: { project: snapshot, resolvedAudioAssets },
      container: request.config.container,
      videoCodec: request.config.videoCodec,
      audioCodec: includeAudio ? request.config.audioCodec : null,
      videoBitrate: quality.videoBitrate,
      audioBitrate: quality.audioBitrate,
      muted: !includeAudio,
      outputTarget: target,
      licenseKey: "free-license",
      signal: request.signal,
      onProgress: (progress) => {
        request.onProgress({
          percent: Math.round(progress.progress * 100),
          renderedFrames: progress.renderedFrames,
          encodedFrames: progress.encodedFrames,
          estimatedMs: progress.renderEstimatedTime,
        });
      },
    });
  }

  let result: Awaited<ReturnType<typeof render>> | undefined;
  try {
    try {
      result = await render(outputTarget);
    } catch (renderError) {
      if (outputTarget === "web-fs" && preferOpfs && !request.signal.aborted) {
        outputTarget = "arraybuffer";
        fallbackFromOpfs = true;
        result = await render(outputTarget);
      } else {
        throw renderError;
      }
    }
    const blob = await result.getBlob();
    if (request.signal.aborted) {
      throw new DOMException("Export cancelled.", "AbortError");
    }
    const metadata = await validateExportFile(blob, {
      container: request.config.container,
      videoCodec: request.config.videoCodec,
      audioCodec: includeAudio ? request.config.audioCodec : null,
      width,
      height,
      durationSeconds,
      frameRate: snapshot.frameRate,
      includeAudio,
      projectHasAudio: resolvedHasAudio,
    });
    if (request.signal.aborted) {
      throw new DOMException("Export cancelled.", "AbortError");
    }
    return {
      blob,
      extension: request.config.container,
      mimeType: request.config.container === "mp4" ? "video/mp4" : "video/webm",
      metadata,
      usedOpfs: outputTarget === "web-fs",
      fallbackFromOpfs,
    };
  } catch (error) {
    if (
      request.signal.aborted ||
      (error instanceof Error &&
        (error.name === "AbortError" ||
          error.message.toLowerCase().includes("cancelled")))
    ) {
      throw error;
    }
    if (
      error instanceof ExportError ||
      error instanceof UnsupportedCapabilityError
    ) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "The export could not render.";
    const failureKind = classifyExportFailure(error, includeAudio);
    if (failureKind === "memory") {
      throw new ExportError(
        "storage",
        "The browser ran out of memory while rendering.",
        "Lower the resolution, shorten the project, or retry without audio. Your project is unchanged.",
      );
    }
    if (failureKind === "audio") {
      throw new ExportError(
        "render",
        "The audio track could not be encoded.",
        "Retry without audio, choose another format, or lower the audio quality. Your project is unchanged.",
      );
    }
    const storageFailure = /quota|storage|disk|buffer/i.test(message);
    throw new ExportError(
      storageFailure ? "storage" : "render",
      message,
      storageFailure
        ? "Lower the resolution, shorten the project, or choose WebM. Your project is unchanged."
        : "Retry the export, choose WebM, or lower the resolution. Your project is unchanged.",
    );
  } finally {
    const disposable = result?.internalState as
      | { [Symbol.dispose]?: () => void }
      | undefined;
    disposable?.[Symbol.dispose]?.();
  }
}
