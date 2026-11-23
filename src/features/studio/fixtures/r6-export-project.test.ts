import { describe, expect, it } from "vitest";
import fixture from "@/features/studio/fixtures/r6-export-project.json";
import { projectHasAudio } from "@/features/studio/rendering/export-runner";
import { projectDurationInFrames } from "@/features/studio/rendering/timeline";
import { normalizeProject } from "@/features/studio/scene/project-normalization";

describe("R6 export fixture", () => {
  it("is a short project with scene audio", () => {
    const project = normalizeProject(fixture);
    expect(project.projectVersion).toBe(3);
    expect(project.scenes).toHaveLength(1);
    expect(projectDurationInFrames(project)).toBe(90);
    expect(projectHasAudio(project)).toBe(true);
  });
});
