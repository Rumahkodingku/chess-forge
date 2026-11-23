import { describe, expect, it } from "vitest";
import fixture from "@/features/studio/fixtures/r5-project.json";
import { projectDurationInFrames } from "@/features/studio/rendering/timeline";
import { normalizeProject } from "@/features/studio/scene/project-normalization";

describe("R5 fixture project", () => {
  it("is a valid templated five-scene project", () => {
    const project = normalizeProject(fixture);
    expect(project.projectVersion).toBe(3);
    expect(project.template?.id).toBe("cinematic-chess");
    expect(project.sourceSelection).toEqual({ mode: "full" });
    expect(project.scenes.map((scene) => scene.type)).toEqual([
      "intro",
      "move",
      "move",
      "move",
      "outro",
    ]);
    expect(projectDurationInFrames(project)).toBeGreaterThan(0);
  });
});
