import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import fixture from "@/features/studio/fixtures/r4-project.json";
import type { VideoProject } from "@/features/studio/scene/scene.types";

vi.mock("remotion", () => ({
  AbsoluteFill: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Sequence: ({
    from,
    durationInFrames,
    children,
  }: {
    from: number;
    durationInFrames: number;
    children: React.ReactNode;
  }) => (
    <div data-sequence data-from={from} data-duration={durationInFrames}>
      {children}
    </div>
  ),
}));

vi.mock("@remotion/media", () => ({
  Audio: ({ src, volume, loop }: Record<string, unknown>) => (
    <span
      data-audio
      data-src={String(src)}
      data-volume={String(volume)}
      data-loop={String(loop)}
    />
  ),
}));

vi.mock("@/features/studio/rendering/scene-composition", () => ({
  SceneComposition: ({ scene }: { scene: { id: string } }) => (
    <i data-scene={scene.id} />
  ),
}));

async function renderComposition() {
  const { ProjectComposition } = await import(
    "@/features/studio/rendering/project-composition"
  );
  const project = fixture as unknown as VideoProject;
  const html = renderToStaticMarkup(
    <ProjectComposition project={project} resolvedAudioAssets={{}} />,
  );
  return { html, project };
}

describe("ProjectComposition", () => {
  it("renders every scene in timeline order", async () => {
    const { html, project } = await renderComposition();
    const sceneIds = [...html.matchAll(/data-scene="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(sceneIds).toEqual(project.scenes.map((scene) => scene.id));
    expect(html.match(/data-sequence/g)).toHaveLength(
      project.scenes.length + project.audioTracks.length,
    );
  });

  it("uses scene start frames and durations", async () => {
    const { html, project } = await renderComposition();
    for (const scene of project.scenes) {
      expect(html).toContain(
        `data-from="${scene.startFrame}" data-duration="${scene.durationInFrames}"`,
      );
    }
  });
});
