import { describe, expect, it } from "vitest";
import {
  type ExportExpectation,
  type ExportMetadata,
  validateExportMetadata,
} from "@/features/studio/export/validate";

const metadata: ExportMetadata = {
  container: "webm",
  durationSeconds: 10,
  video: { codec: "vp9", width: 720, height: 1280 },
  audio: { codec: "opus" },
};

const expected: ExportExpectation = {
  container: "webm" as const,
  videoCodec: "vp9" as const,
  audioCodec: "opus" as const,
  width: 720,
  height: 1280,
  durationSeconds: 10,
  frameRate: 30,
  includeAudio: true,
  projectHasAudio: true,
};

describe("export metadata validation", () => {
  it("accepts matching metadata", () => {
    expect(() => validateExportMetadata(metadata, expected)).not.toThrow();
  });

  it("accepts duration within two frames", () => {
    expect(() =>
      validateExportMetadata(
        { ...metadata, durationSeconds: 10 + 1 / 30 },
        expected,
      ),
    ).not.toThrow();
  });

  it("rejects the wrong container, dimensions, codec, and duration", () => {
    expect(() =>
      validateExportMetadata({ ...metadata, container: "mp4" }, expected),
    ).toThrow(/container/i);
    expect(() =>
      validateExportMetadata(
        { ...metadata, video: { ...metadata.video, width: 1080 } },
        expected,
      ),
    ).toThrow(/dimensions/i);
    expect(() =>
      validateExportMetadata(
        { ...metadata, video: { ...metadata.video, codec: "vp8" } },
        expected,
      ),
    ).toThrow(/video codec/i);
    expect(() =>
      validateExportMetadata({ ...metadata, durationSeconds: 12 }, expected),
    ).toThrow(/duration/i);
  });

  it("requires audio only when the project has audio and audio is enabled", () => {
    expect(() =>
      validateExportMetadata({ ...metadata, audio: undefined }, expected),
    ).toThrow(/audio/i);
    expect(() =>
      validateExportMetadata(
        { ...metadata, audio: undefined },
        { ...expected, includeAudio: false },
      ),
    ).not.toThrow();
    expect(() =>
      validateExportMetadata(
        { ...metadata, audio: undefined },
        { ...expected, projectHasAudio: false },
      ),
    ).not.toThrow();
  });

  it("rejects an unexpected audio codec", () => {
    expect(() =>
      validateExportMetadata(
        { ...metadata, audio: { codec: "aac" } },
        expected,
      ),
    ).toThrow(/audio codec/i);
  });
});
