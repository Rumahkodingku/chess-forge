import { describe, expect, it } from "vitest";
import { createR4FixtureProject } from "@/features/studio/fixtures/r4-project";
import { projectDurationInFrames } from "@/features/studio/rendering/timeline";

describe("R4 fixture project", () => {
  it("is a valid four-scene project", () => {
    const project = createR4FixtureProject();
    expect(project.scenes).toHaveLength(4);
    expect(project.scenes.map((scene) => scene.type)).toEqual([
      "intro",
      "move",
      "move",
      "outro",
    ]);
    expect(project.gameSnapshot?.moves).toHaveLength(10);
    expect(project.audioTracks).toHaveLength(1);
    expect(projectDurationInFrames(project)).toBe(330);
  });
});
