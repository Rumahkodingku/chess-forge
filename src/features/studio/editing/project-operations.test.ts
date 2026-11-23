import { describe, expect, it } from "vitest";
import {
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
} from "@/features/studio/editing/history";
import {
  addScene,
  deleteScene,
  duplicateScene,
  reorderScenes,
  setCanvas,
  setSceneDuration,
} from "@/features/studio/editing/project-operations";
import { createR4FixtureProject } from "@/features/studio/fixtures/r4-project";
import { sceneMinimumFrames } from "@/features/studio/rendering/timeline";

describe("project scene operations", () => {
  it("clamps scene duration to its minimum", () => {
    const project = createR4FixtureProject();
    const scene = project.scenes[1];
    if (!scene) throw new Error("Missing scene");
    const next = setSceneDuration(project, scene.id, 1);
    expect(next.scenes[1]?.durationInFrames).toBe(sceneMinimumFrames(scene));
  });

  it("does not trim content when duration grows", () => {
    const project = createR4FixtureProject();
    const scene = project.scenes[1];
    if (!scene) throw new Error("Missing scene");
    const next = setSceneDuration(project, scene.id, 300);
    expect(next.scenes[1]?.camera).toEqual(scene.camera);
    expect(next.scenes[1]?.textOverlays).toEqual(scene.textOverlays);
  });

  it("trims content that falls outside a shortened scene", () => {
    const project = createR4FixtureProject();
    const scene = project.scenes[1];
    if (!scene) throw new Error("Missing scene");
    const next = setSceneDuration(project, scene.id, sceneMinimumFrames(scene));
    expect(
      next.scenes[1]?.textOverlays.every(
        (overlay) =>
          overlay.startFrame < (next.scenes[1]?.durationInFrames ?? 0),
      ),
    ).toBe(true);
  });

  it("reorders scenes and recalculates starts", () => {
    const project = createR4FixtureProject();
    const next = reorderScenes(project, 0, 1);
    expect(next.scenes[0]?.id).toBe(project.scenes[1]?.id);
    expect(next.scenes[1]?.id).toBe(project.scenes[0]?.id);
    expect(next.scenes[0]?.startFrame).toBe(0);
    expect(next.scenes[1]?.startFrame).toBe(next.scenes[0]?.durationInFrames);
  });

  it("duplicates a scene with new child ids", () => {
    const project = createR4FixtureProject();
    const source = project.scenes[1];
    if (!source) throw new Error("Missing scene");
    const next = duplicateScene(project, source.id);
    expect(next.scenes).toHaveLength(project.scenes.length + 1);
    expect(next.scenes[2]?.id).not.toBe(source.id);
    expect(next.scenes[2]?.textOverlays[0]?.id).not.toBe(
      source.textOverlays[0]?.id,
    );
  });

  it("deletes a scene", () => {
    const project = createR4FixtureProject();
    const scene = project.scenes[0];
    if (!scene) throw new Error("Missing scene");
    expect(deleteScene(project, scene.id).scenes).toHaveLength(3);
  });

  it("adds a static scene from the selected scene final position", () => {
    const project = createR4FixtureProject();
    const source = project.scenes[1];
    if (!source?.moveRange) throw new Error("Missing move scene");
    const next = addScene(project, source.id);
    const added = next.scenes[2];
    expect(added?.type).toBe("analysis");
    expect(added?.moveRange).toBeUndefined();
    expect(added?.boardState.fen).toBe(
      project.gameSnapshot?.moves[source.moveRange.toPly - 1]?.fenAfter,
    );
  });

  it("switches canvas presets", () => {
    const project = createR4FixtureProject();
    expect(setCanvas(project, "16:9").canvas).toEqual({
      aspectRatio: "16:9",
      width: 1920,
      height: 1080,
    });
  });
});

describe("project history", () => {
  it("undoes and redoes", () => {
    const project = createR4FixtureProject();
    const changed = { ...project, name: "Changed" };
    let history = createHistory(project);
    history = pushHistory(history, changed);
    history = undoHistory(history);
    expect(history.present.name).toBe(project.name);
    history = redoHistory(history);
    expect(history.present.name).toBe("Changed");
  });

  it("keeps only twenty snapshots", () => {
    let history = createHistory(createR4FixtureProject());
    for (let index = 0; index < 25; index += 1) {
      history = pushHistory(history, {
        ...history.present,
        name: `Project ${index}`,
      });
    }
    expect(history.past).toHaveLength(20);
  });
});
