import {
  ALL_FORMATS,
  BlobSource,
  Input,
  type InputAudioTrack,
  type InputVideoTrack,
} from "mediabunny";
import { ExportError } from "@/lib/errors";

export interface ExportMetadata {
  container: string;
  durationSeconds: number;
  video: {
    codec: string | null;
    width: number;
    height: number;
  };
  audio?: {
    codec: string | null;
  };
}

export interface ExportExpectation {
  container: "mp4" | "webm";
  videoCodec: "h264" | "vp9" | "vp8";
  audioCodec: "aac" | "opus" | null;
  width: number;
  height: number;
  durationSeconds: number;
  frameRate: 30 | 60;
  includeAudio: boolean;
  projectHasAudio: boolean;
}

function normalizedContainer(name: string): "mp4" | "webm" | string {
  const value = name.toLowerCase();
  if (value.includes("webm") || value.includes("matroska")) return "webm";
  if (value.includes("mp4") || value.includes("mov")) return "mp4";
  return value;
}

function normalizedVideoCodec(codec: string | null): string | null {
  if (codec === "avc" || codec === "h264") return "h264";
  return codec;
}

async function videoMetadata(track: InputVideoTrack) {
  return {
    codec: normalizedVideoCodec(await track.getCodec()),
    width: await track.getDisplayWidth(),
    height: await track.getDisplayHeight(),
  };
}

async function audioMetadata(track: InputAudioTrack) {
  return { codec: await track.getCodec() };
}

export async function readExportMetadata(blob: Blob): Promise<ExportMetadata> {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(blob),
  });
  try {
    const [format, duration, video] = await Promise.all([
      input.getFormat(),
      input.computeDuration(),
      input.getPrimaryVideoTrack(),
    ]);
    const audio = await input.getPrimaryAudioTrack();
    return {
      container: normalizedContainer(format.name),
      durationSeconds: duration,
      video: video
        ? await videoMetadata(video)
        : { codec: null, width: 0, height: 0 },
      audio: audio ? await audioMetadata(audio) : undefined,
    };
  } finally {
    input.dispose();
  }
}

export function validateExportMetadata(
  metadata: ExportMetadata,
  expected: ExportExpectation,
): void {
  if (metadata.container !== expected.container) {
    throw new ExportError(
      "validation",
      `The output container is ${metadata.container}, expected ${expected.container}.`,
      "Retry with the same format or choose another browser-supported format.",
    );
  }
  if (
    metadata.video.width !== expected.width ||
    metadata.video.height !== expected.height
  ) {
    throw new ExportError(
      "validation",
      `The output dimensions are ${metadata.video.width}x${metadata.video.height}, expected ${expected.width}x${expected.height}.`,
      "Choose another resolution and retry.",
    );
  }
  if (metadata.video.codec !== expected.videoCodec) {
    throw new ExportError(
      "validation",
      `The video codec is ${metadata.video.codec ?? "unknown"}, expected ${expected.videoCodec}.`,
      "Choose another format and retry.",
    );
  }
  const tolerance = Math.max(0.25, 2 / expected.frameRate);
  if (
    Math.abs(metadata.durationSeconds - expected.durationSeconds) > tolerance
  ) {
    throw new ExportError(
      "validation",
      `The output duration is ${metadata.durationSeconds.toFixed(2)}s, expected ${expected.durationSeconds.toFixed(2)}s.`,
      "Retry the export. If it repeats, lower the resolution or choose WebM.",
    );
  }
  const needsAudio =
    expected.includeAudio &&
    expected.projectHasAudio &&
    expected.audioCodec !== null;
  if (needsAudio && !metadata.audio) {
    throw new ExportError(
      "validation",
      "The output has no audio stream.",
      "Enable audio or retry with a browser-supported audio codec.",
    );
  }
  if (
    needsAudio &&
    metadata.audio &&
    metadata.audio.codec !== expected.audioCodec
  ) {
    throw new ExportError(
      "validation",
      `The audio codec is ${metadata.audio.codec ?? "unknown"}, expected ${expected.audioCodec}.`,
      "Choose another format and retry.",
    );
  }
}

export async function validateExportFile(
  blob: Blob,
  expected: ExportExpectation,
): Promise<ExportMetadata> {
  const metadata = await readExportMetadata(blob);
  validateExportMetadata(metadata, expected);
  return metadata;
}
