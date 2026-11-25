import { describe, expect, it } from "vitest";
import {
  canRetryWithoutAudio,
  chooseOutputTarget,
  classifyExportFailure,
  pickSupportedFormat,
  resolveSelectedFormat,
  shouldUseOpfs,
} from "@/features/studio/export/capabilities";
import { EXPORT_FORMATS } from "@/features/studio/export/config";

const results = EXPORT_FORMATS.map((format, index) => ({
  format,
  canRender: index === 1 || index === 2,
  issues: index === 0 ? ["MP4 encoder unavailable"] : [],
}));

describe("export capabilities", () => {
  it("uses OPFS only from sixty seconds when available", () => {
    expect(shouldUseOpfs(59, true)).toBe(false);
    expect(shouldUseOpfs(60, true)).toBe(true);
    expect(shouldUseOpfs(60, false)).toBe(false);
  });

  it("falls back from web-fs to arraybuffer", () => {
    expect(
      chooseOutputTarget({
        durationSeconds: 60,
        opfsAvailable: true,
        webFsSupported: true,
      }),
    ).toBe("web-fs");
    expect(
      chooseOutputTarget({
        durationSeconds: 60,
        opfsAvailable: true,
        webFsSupported: false,
      }),
    ).toBe("arraybuffer");
    expect(
      chooseOutputTarget({
        durationSeconds: 30,
        opfsAvailable: true,
        webFsSupported: true,
      }),
    ).toBe("arraybuffer");
  });

  it("picks the first supported format", () => {
    expect(pickSupportedFormat(results)?.id).toBe("webm-vp9");
  });

  it("keeps a supported selection and replaces an unsupported one", () => {
    expect(resolveSelectedFormat(results, "webm-vp8")?.id).toBe("webm-vp8");
    expect(resolveSelectedFormat(results, "mp4-h264")?.id).toBe("webm-vp9");
  });

  it("returns undefined when nothing is supported", () => {
    expect(
      pickSupportedFormat(
        EXPORT_FORMATS.map((format) => ({
          format,
          canRender: false,
          issues: ["unsupported"],
        })),
      ),
    ).toBeUndefined();
  });

  it("classifies an out-of-memory render failure", () => {
    const error = new RangeError("Array buffer allocation failed");
    expect(classifyExportFailure(error, true)).toBe("memory");
    expect(classifyExportFailure(error, false)).toBe("memory");
  });

  it("classifies an audio encoding failure only when audio is enabled", () => {
    const error = new Error("AudioEncoder failed to encode the track");
    expect(classifyExportFailure(error, true)).toBe("audio");
    expect(classifyExportFailure(error, false)).toBe("other");
    expect(canRetryWithoutAudio(error, true)).toBe(true);
    expect(canRetryWithoutAudio(error, false)).toBe(false);
  });

  it("treats memory pressure as memory before audio", () => {
    expect(
      classifyExportFailure(
        new Error("Out of memory while encoding audio"),
        true,
      ),
    ).toBe("memory");
  });
});
