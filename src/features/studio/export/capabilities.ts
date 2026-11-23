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
