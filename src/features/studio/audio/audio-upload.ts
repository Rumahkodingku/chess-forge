import type { AssetRecord, AssetRepository } from "@/features/storage/db";
import { createId } from "@/lib/id";

export const AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/webm",
] as const;

export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
export const MAX_AUDIO_SECONDS = 10 * 60;
export const MAX_PROJECT_ASSET_BYTES = 250 * 1024 * 1024;

export interface AudioFileInfo {
  name: string;
  type: string;
  size: number;
  durationSeconds: number;
}

export function validateAudioFile(
  file: AudioFileInfo,
  projectBytes = 0,
): string | null {
  if (
    !AUDIO_MIME_TYPES.includes(file.type as (typeof AUDIO_MIME_TYPES)[number])
  ) {
    return `${file.name} is not a supported audio file.`;
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return `${file.name} is larger than 50 MB.`;
  }
  if (file.durationSeconds > MAX_AUDIO_SECONDS) {
    return `${file.name} is longer than 10 minutes.`;
  }
  if (projectBytes + file.size > MAX_PROJECT_ASSET_BYTES) {
    return "This project has reached its 250 MB media limit.";
  }
  return null;
}

export async function hashBlob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await blob.arrayBuffer(),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export interface ImportAudioInput {
  file: File;
  durationSeconds: number;
  projectBytes: number;
  repository: AssetRepository;
  now?: string;
}

export interface ImportedAudio {
  asset: AssetRecord;
  durationSeconds: number;
}

export async function importAudioAsset({
  file,
  durationSeconds,
  projectBytes,
  repository,
  now = new Date().toISOString(),
}: ImportAudioInput): Promise<ImportedAudio> {
  const error = validateAudioFile(
    {
      name: file.name,
      type: file.type,
      size: file.size,
      durationSeconds,
    },
    projectBytes,
  );
  if (error) throw new Error(error);

  const hash = await hashBlob(file);
  const existing = await repository.findByHash(hash);
  if (existing) {
    if (existing.kind !== "audio") {
      throw new Error("A non-audio asset already uses this file hash.");
    }
    return { asset: existing, durationSeconds };
  }

  const asset: AssetRecord = {
    id: createId(),
    kind: "audio",
    mimeType: file.type,
    size: file.size,
    hash,
    createdAt: now,
    data: file,
  };
  await repository.save(asset);
  return { asset, durationSeconds };
}

export function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`${file.name} could not be decoded as audio.`));
    };
    audio.src = url;
  });
}
