import { describe, expect, it } from "vitest";
import {
  defaultExportName,
  durationPolicy,
  EXPORT_FORMATS,
  qualitySettings,
  resolutionDimensions,
  sanitizeExportName,
} from "@/features/studio/export/config";

describe("export configuration", () => {
  it("maps every aspect ratio to even 720p and 1080p dimensions", () => {
    expect(resolutionDimensions("9:16", "720p")).toEqual({
      width: 720,
      height: 1280,
    });
    expect(resolutionDimensions("16:9", "720p")).toEqual({
      width: 1280,
      height: 720,
    });
    expect(resolutionDimensions("1:1", "720p")).toEqual({
      width: 720,
      height: 720,
    });
    expect(resolutionDimensions("4:5", "720p")).toEqual({
      width: 720,
      height: 900,
    });
    expect(resolutionDimensions("9:16", "1080p")).toEqual({
      width: 1080,
      height: 1920,
    });
    expect(resolutionDimensions("16:9", "1080p")).toEqual({
      width: 1920,
      height: 1080,
    });
    expect(resolutionDimensions("1:1", "1080p")).toEqual({
      width: 1080,
      height: 1080,
    });
    expect(resolutionDimensions("4:5", "1080p")).toEqual({
      width: 1080,
      height: 1350,
    });
  });

  it("maps quality to renderer presets", () => {
    expect(qualitySettings("low")).toEqual({
      videoBitrate: "low",
      audioBitrate: "low",
    });
    expect(qualitySettings("medium")).toEqual({
      videoBitrate: "medium",
      audioBitrate: "medium",
    });
    expect(qualitySettings("high")).toEqual({
      videoBitrate: "high",
      audioBitrate: "high",
    });
  });

  it("applies the five and fifteen minute duration policy", () => {
    expect(durationPolicy(299)).toBe("ok");
    expect(durationPolicy(300)).toBe("warning");
    expect(durationPolicy(900)).toBe("warning");
    expect(durationPolicy(901)).toBe("blocked");
  });

  it("sanitises file names", () => {
    expect(sanitizeExportName("  White vs Black  ")).toBe("White-vs-Black");
    expect(sanitizeExportName("a/b\\c:d*e")).toBe("a-b-c-d-e");
    expect(sanitizeExportName("")).toBe("chessforge-project");
    expect(sanitizeExportName("___")).toBe("___");
  });

  it("builds the default file name without an extension", () => {
    expect(defaultExportName("White vs Black", "720p")).toBe(
      "White-vs-Black-720p",
    );
  });

  it("declares the approved format order", () => {
    expect(EXPORT_FORMATS.map((format) => format.id)).toEqual([
      "mp4-h264",
      "webm-vp9",
      "webm-vp8",
    ]);
  });
});
