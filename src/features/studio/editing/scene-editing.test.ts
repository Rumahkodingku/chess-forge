import { describe, expect, it } from "vitest";
import {
  resetSceneField,
  updateScene,
} from "@/features/studio/editing/scene-editing";
import { createR4FixtureProject } from "@/features/studio/fixtures/r4-project";
import { sceneMinimumFrames } from "@/features/studio/rendering/timeline";
import { BUILT_IN_TEMPLATES } from "@/features/templates/builtins";
import { toTemplateSnapshot } from "@/features/templates/snapshot";

function projectWithTemplate() {
  const project = createR4FixtureProject();
  const template = BUILT_IN_TEMPLATES[0];
  if (!template) throw new Error("Missing template");
  return { ...project, template: toTemplateSnapshot(template) };
}

describe("scene editing", () => {
  it("records an override when a scene field changes", () => {
    const project = projectWithTemplate();
    const scene = project.scenes[1];
    if (!scene) throw new Error("Missing scene");
    const next = updateScene(project, scene.id, "boardState", (current) => ({
      ...current,
      boardState: { ...current.boardState, theme: "classic" },
    }));
    expect(next.scenes[1]?.boardState.theme).toBe("classic");
    expect(next.scenes[1]?.overrides.boardState).toBe(true);
  });

  it("resets a field to the template default", () => {
    const project = projectWithTemplate();
    const scene = project.scenes[1];
    if (!scene) throw new Error("Missing scene");
    const changed = updateScene(project, scene.id, "effects", (current) => ({
      ...current,
      effects: { ...current.effects, glow: true },
    }));
    const reset = resetSceneField(changed, scene.id, "effects");
    expect(reset.scenes[1]?.effects.glow).toBe(false);
    expect(reset.scenes[1]?.overrides.effects).toBeUndefined();
  });

  it("raises duration when reset timing needs more frames", () => {
    const project = projectWithTemplate();
    const scene = project.scenes[1];
    if (!scene) throw new Error("Missing scene");
    const shortened = {
      ...project,
      scenes: project.scenes.map((item) =>
        item.id === scene.id
          ? { ...item, durationInFrames: sceneMinimumFrames(item) }
          : item,
      ),
    };
    const changed = updateScene(shortened, scene.id, "timing", (current) => ({
      ...current,
      timing: { ...current.timing, leadInFrames: 40 },
    }));
    const reset = resetSceneField(changed, scene.id, "timing");
    expect(reset.scenes[1]?.durationInFrames).toBe(
      sceneMinimumFrames(reset.scenes[1] as NonNullable<typeof scene>),
    );
  });

  it("does nothing without a template snapshot", () => {
    const project = createR4FixtureProject();
    const scene = project.scenes[1];
    if (!scene) throw new Error("Missing scene");
    expect(resetSceneField(project, scene.id, "effects")).toBe(project);
  });
});
