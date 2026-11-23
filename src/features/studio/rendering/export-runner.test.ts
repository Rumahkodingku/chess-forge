import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExportConfig } from "@/features/studio/export/config";
import fixture from "@/features/studio/fixtures/r5-project.json";
import { exportProject } from "@/features/studio/rendering/export-runner";
import { normalizeProject } from "@/features/studio/scene/project-normalization";

const mocks = vi.hoisted(() => ({
  canRenderMediaOnWeb: vi.fn(),
  renderMediaOnWeb: vi.fn(),
  validateExportFile: vi.fn(),
}));

vi.mock("@remotion/web-renderer", () => ({
  canRenderMediaOnWeb: mocks.canRenderMediaOnWeb,
  renderMediaOnWeb: mocks.renderMediaOnWeb,
}));

vi.mock("@/features/studio/export/validate", () => ({
  validateExportFile: mocks.validateExportFile,
}));

const config: ExportConfig = {
  container: "webm",
  videoCodec: "vp9",
  audioCodec: "opus",
  resolution: "720p",
  quality: "medium",
  includeAudio: true,
  fileName: "test",
};

describe("exportProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("navigator", {
      storage: {
        getDirectory: async () => ({}),
      },
    });
    mocks.canRenderMediaOnWeb.mockResolvedValue({
      canRender: true,
      issues: [],
    });
    mocks.renderMediaOnWeb.mockResolvedValue({
      getBlob: async () => new Blob(["video"]),
    });
    mocks.validateExportFile.mockResolvedValue({
      container: "webm",
      durationSeconds: 10,
      video: { codec: "vp9", width: 720, height: 1280 },
      audio: { codec: "opus" },
    });
  });

  it("renders a short project at the selected resolution and quality", async () => {
    const onProgress = vi.fn();
    const result = await exportProject({
      project: normalizeProject(fixture),
      config,
      signal: new AbortController().signal,
      onProgress,
    });

    expect(mocks.canRenderMediaOnWeb).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 720,
        height: 1280,
        outputTarget: "arraybuffer",
        audioCodec: "opus",
      }),
    );
    expect(mocks.renderMediaOnWeb).toHaveBeenCalledWith(
      expect.objectContaining({
        composition: expect.objectContaining({
          width: 720,
          height: 1280,
          fps: 30,
        }),
        videoBitrate: "medium",
        audioBitrate: "medium",
        audioCodec: "opus",
        muted: false,
        outputTarget: "arraybuffer",
      }),
    );
    expect(result.extension).toBe("webm");
    expect(result.usedOpfs).toBe(false);
    expect(result.fallbackFromOpfs).toBe(false);
    expect(mocks.validateExportFile).toHaveBeenCalled();
  });

  it("uses web-fs for a project over sixty seconds", async () => {
    const project = normalizeProject(fixture);
    const last = project.scenes.at(-1);
    if (!last) throw new Error("Missing scene");
    const longProject = {
      ...project,
      scenes: project.scenes.map((scene) =>
        scene.id === last.id
          ? {
              ...scene,
              durationInFrames: Math.max(
                scene.durationInFrames,
                60 * project.frameRate,
              ),
            }
          : scene,
      ),
    };
    await exportProject({
      project: longProject,
      config,
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    });
    expect(mocks.canRenderMediaOnWeb).toHaveBeenCalledWith(
      expect.objectContaining({ outputTarget: "web-fs" }),
    );
    expect(mocks.renderMediaOnWeb).toHaveBeenCalledWith(
      expect.objectContaining({ outputTarget: "web-fs" }),
    );
  });

  it("falls back to arraybuffer when web-fs is unsupported", async () => {
    mocks.canRenderMediaOnWeb.mockImplementation(
      async ({ outputTarget }: { outputTarget: string }) =>
        outputTarget === "arraybuffer"
          ? { canRender: true, issues: [] }
          : { canRender: false, issues: [{ message: "No OPFS" }] },
    );
    const project = normalizeProject(fixture);
    const last = project.scenes.at(-1);
    if (!last) throw new Error("Missing scene");
    const longProject = {
      ...project,
      scenes: project.scenes.map((scene) =>
        scene.id === last.id
          ? { ...scene, durationInFrames: 60 * project.frameRate }
          : scene,
      ),
    };
    const result = await exportProject({
      project: longProject,
      config,
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    });
    expect(result.fallbackFromOpfs).toBe(true);
    expect(result.usedOpfs).toBe(false);
  });

  it("throws an unsupported capability when nothing renders", async () => {
    mocks.canRenderMediaOnWeb.mockResolvedValue({
      canRender: false,
      issues: [{ message: "Codec missing" }],
    });
    await expect(
      exportProject({
        project: normalizeProject(fixture),
        config,
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow(/Codec missing/);
  });

  it("preserves a cancellation instead of wrapping it", async () => {
    const controller = new AbortController();
    mocks.renderMediaOnWeb.mockImplementation(async () => {
      controller.abort();
      throw new Error("renderMediaOnWeb() was cancelled");
    });
    await expect(
      exportProject({
        project: normalizeProject(fixture),
        config,
        signal: controller.signal,
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow(/cancelled/);
  });
});
