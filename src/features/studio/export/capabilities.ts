import type {
  ExportFormat,
  ExportFormatId,
} from "@/features/studio/export/config";

export interface FormatCapability {
  format: ExportFormat;
  canRender: boolean;
  issues: string[];
}

export interface OutputTargetInput {
  durationSeconds: number;
  opfsAvailable: boolean;
  webFsSupported: boolean;
}

export function shouldUseOpfs(
  durationSeconds: number,
  opfsAvailable: boolean,
): boolean {
  return durationSeconds >= 60 && opfsAvailable;
}

export function chooseOutputTarget({
  durationSeconds,
  opfsAvailable,
  webFsSupported,
}: OutputTargetInput): "web-fs" | "arraybuffer" {
  return shouldUseOpfs(durationSeconds, opfsAvailable) && webFsSupported
    ? "web-fs"
    : "arraybuffer";
}

export function pickSupportedFormat(
  capabilities: FormatCapability[],
): ExportFormat | undefined {
  return capabilities.find((entry) => entry.canRender)?.format;
}

export function resolveSelectedFormat(
  capabilities: FormatCapability[],
  selectedId: ExportFormatId,
): ExportFormat | undefined {
  const selected = capabilities.find(
    (entry) => entry.format.id === selectedId && entry.canRender,
  );
  return selected?.format ?? pickSupportedFormat(capabilities);
}

export type ExportFailureKind = "memory" | "audio" | "other";

const MEMORY_FAILURE =
  /out of memory|out-of-memory|allocation failed|failed to allocate|cannot allocate|not enough memory|array buffer allocation|invalid array buffer length|allocation size overflow|memory limit/i;
const AUDIO_FAILURE = /audio|opus|aac|flac|mp3/i;

function failureMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

export function classifyExportFailure(
  error: unknown,
  includeAudio: boolean,
): ExportFailureKind {
  const message = failureMessage(error);
  if (MEMORY_FAILURE.test(message)) return "memory";
  if (includeAudio && AUDIO_FAILURE.test(message)) return "audio";
  return "other";
}

export function canRetryWithoutAudio(
  error: unknown,
  includeAudio: boolean,
): boolean {
  return classifyExportFailure(error, includeAudio) === "audio";
}
