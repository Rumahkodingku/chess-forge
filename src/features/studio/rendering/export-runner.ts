import { ProjectComposition } from "@/features/studio/rendering/project-composition";
import { projectDurationInFrames } from "@/features/studio/rendering/timeline";
import type { VideoProject } from "@/features/studio/scene/scene.types";
import { UnsupportedCapabilityError } from "@/lib/errors";

export interface ExportProjectRequest {
  project: VideoProject;
  resolvedAudioAssets?: Record<string, string>;
  container: "webm" | "mp4";
  videoCodec: "vp9" | "vp8" | "h264";
  audioCodec: "opus" | "aac";
  signal: AbortSignal;
  onProgress: (progress: number) => void;
}

export interface ExportProjectResult {
  blob: Blob;
  extension: "webm" | "mp4";
  mimeType: string;
}

export async function exportProject(
  request: ExportProjectRequest,
): Promise<ExportProjectResult> {
  if (!request.project.scenes.length) {
    throw new UnsupportedCapabilityError(
      "This project has no scene to render.",
      "Open the project and create a scene first.",
    );
  }

  const durationInFrames = projectDurationInFrames(request.project);
  const resolvedAudioAssets = request.resolvedAudioAssets ?? {};

  const { canRenderMediaOnWeb, renderMediaOnWeb } = await import(
    "@remotion/web-renderer"
  );

  const capability = await canRenderMediaOnWeb({
    container: request.container,
    videoCodec: request.videoCodec,
    audioCodec: request.audioCodec,
    width: request.project.canvas.width,
    height: request.project.canvas.height,
    outputTarget: "arraybuffer",
  });

  if (!capability.canRender) {
    throw new UnsupportedCapabilityError(
      capability.issues.map((issue) => issue.message).join(" ") ||
        "This browser cannot render the selected format.",
      "Choose WebM VP9 or use a current Chrome or Edge desktop browser.",
    );
  }

  const result = await renderMediaOnWeb({
    composition: {
      id: `chessforge-${request.project.id}`,
      component: ProjectComposition,
      width: request.project.canvas.width,
      height: request.project.canvas.height,
      fps: request.project.frameRate,
      durationInFrames,
      calculateMetadata: null,
      defaultProps: {
        project: request.project,
        resolvedAudioAssets,
      },
    },
    inputProps: {
      project: request.project,
      resolvedAudioAssets,
    },
    container: request.container,
    videoCodec: request.videoCodec,
    audioCodec: request.audioCodec,
    outputTarget: "arraybuffer",
    licenseKey: "free-license",
    signal: request.signal,
    onProgress: (progress) => {
      request.onProgress(progress.progress);
    },
  });

  const blob = await result.getBlob();
  return {
    blob,
    extension: request.container,
    mimeType: request.container === "mp4" ? "video/mp4" : "video/webm",
  };
}
