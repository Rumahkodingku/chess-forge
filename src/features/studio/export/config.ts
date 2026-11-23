import type { AspectRatio } from "@/features/studio/scene/scene.types";

export type ExportResolution = "720p" | "1080p";
export type ExportQuality = "low" | "medium" | "high";
export type ExportFormatId = "mp4-h264" | "webm-vp9" | "webm-vp8";
export type ExportContainer = "mp4" | "webm";
export type ExportVideoCodec = "h264" | "vp9" | "vp8";
export type ExportAudioCodec = "aac" | "opus";

export interface ExportFormat {
  id: ExportFormatId;
  label: string;
  container: ExportContainer;
  videoCodec: ExportVideoCodec;
  audioCodec: ExportAudioCodec;
  extension: ExportContainer;
}

export const EXPORT_FORMATS: ExportFormat[] = [
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

const DIMENSIONS: Record<
  AspectRatio,
  Record<ExportResolution, { width: number; height: number }>
> = {
  "9:16": {
    "720p": { width: 720, height: 1280 },
    "1080p": { width: 1080, height: 1920 },
  },
  "16:9": {
    "720p": { width: 1280, height: 720 },
    "1080p": { width: 1920, height: 1080 },
  },
  "1:1": {
    "720p": { width: 720, height: 720 },
    "1080p": { width: 1080, height: 1080 },
  },
  "4:5": {
    "720p": { width: 720, height: 900 },
    "1080p": { width: 1080, height: 1350 },
  },
};

const QUALITY: Record<
  ExportQuality,
  { videoBitrate: ExportQuality; audioBitrate: ExportQuality }
> = {
  low: { videoBitrate: "low", audioBitrate: "low" },
  medium: { videoBitrate: "medium", audioBitrate: "medium" },
  high: { videoBitrate: "high", audioBitrate: "high" },
};

export type DurationPolicy = "ok" | "warning" | "blocked";

export function resolutionDimensions(
  aspectRatio: AspectRatio,
  resolution: ExportResolution,
): { width: number; height: number } {
  return DIMENSIONS[aspectRatio][resolution];
}

export function qualitySettings(quality: ExportQuality) {
  return QUALITY[quality];
}

export function durationPolicy(durationSeconds: number): DurationPolicy {
  if (durationSeconds > 15 * 60) return "blocked";
  if (durationSeconds >= 5 * 60) return "warning";
  return "ok";
}

export function sanitizeExportName(name: string): string {
  const sanitized = name
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized || "chessforge-project";
}

export function defaultExportName(
  projectName: string,
  resolution: ExportResolution,
): string {
  return sanitizeExportName(`${projectName}-${resolution}`);
}

export function formatById(id: ExportFormatId): ExportFormat {
  return EXPORT_FORMATS.find((format) => format.id === id) ?? EXPORT_FORMATS[0]!;
}
