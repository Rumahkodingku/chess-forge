import { describe, expect, it } from "vitest";
import {
  moveFrameMap,
  normalizeSceneStartFrames,
  projectDurationInFrames,
  sceneMinimumFrames,
} from "@/features/studio/rendering/timeline";
import type { Scene, VideoProject } from "@/features/studio/scene/scene.types";

function scene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: crypto.randomUUID(),
    type: "move",
    startFrame: 0,
    durationInFrames: 90,
    moveRange: { fromPly: 1, toPly: 1 },
    boardState: {
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      orientation: "w",
      theme: "forge",
      coordinates: true,
    },
    timing: {
      leadInFrames: 10,
      moveDurationFrames: 45,
      gapFrames: 0,
      holdFrames: 35,
      easing: "easeInOut",
    },
    camera: {
      keyframes: [{ frame: 0, zoom: 1, x: 0, y: 0, easing: "easeInOut" }],
    },
    annotations: [],
    textOverlays: [],
    effects: {
      lastMoveHighlight: true,
      checkIndicator: true,
      captureEmphasis: true,
      checkmateEmphasis: true,
      glow: false,
      focus: false,
    },
    focusSquares: [],
    audioEvents: [],
    overrides: {},
    schemaVersion: 2,
    ...overrides,
  };
}

function project(scenes: Scene[]): VideoProject {
  return {
    id: crypto.randomUUID(),
    name: "Timeline",
    templateId: "test",
    projectVersion: 2,
    canvas: { aspectRatio: "9:16", width: 1080, height: 1920 },
    frameRate: 30,
    scenes,
    tracks: { text: [], annotation: [], audio: [] },
    audioTracks: [],
    assets: [],
    createdAt: "2026-11-23T00:00:00.000Z",
    updatedAt: "2026-11-23T00:00:00.000Z",
    schemaVersion: 2,
  };
}

describe("scene timeline", () => {
  it("calculates the minimum frames for one move", () => {
    expect(sceneMinimumFrames(scene())).toBe(90);
  });

  it("calculates the minimum frames for multiple moves", () => {
    expect(
      sceneMinimumFrames(
        scene({
          moveRange: { fromPly: 1, toPly: 3 },
          timing: {
            leadInFrames: 12,
            moveDurationFrames: 24,
            gapFrames: 6,
            holdFrames: 24,
            easing: "easeInOut",
          },
        }),
      ),
    ).toBe(120);
  });

  it("calculates a static scene minimum", () => {
    expect(
      sceneMinimumFrames(scene({ moveRange: undefined, durationInFrames: 60 })),
    ).toBe(45);
  });

  it("maps move frames deterministically", () => {
    expect(
      moveFrameMap(
        scene({
          moveRange: { fromPly: 3, toPly: 5 },
          timing: {
            leadInFrames: 12,
            moveDurationFrames: 24,
            gapFrames: 6,
            holdFrames: 24,
            easing: "easeInOut",
          },
        }),
      ),
    ).toEqual([
      { ply: 3, startFrame: 12, endFrame: 36 },
      { ply: 4, startFrame: 42, endFrame: 66 },
      { ply: 5, startFrame: 72, endFrame: 96 },
    ]);
  });

  it("normalises scene starts and derives project duration", () => {
    const scenes = [
      scene({ startFrame: 0, durationInFrames: 90 }),
      scene({ startFrame: 10, durationInFrames: 30 }),
      scene({ startFrame: 0, durationInFrames: 45 }),
    ];
    expect(
      normalizeSceneStartFrames(scenes).map((item) => item.startFrame),
    ).toEqual([0, 90, 120]);
    expect(
      projectDurationInFrames(project(normalizeSceneStartFrames(scenes))),
    ).toBe(165);
  });

  it("treats an inverted move range as empty", () => {
    const inverted = scene({ moveRange: { fromPly: 5, toPly: 2 } });
    expect(sceneMinimumFrames(inverted)).toBe(45);
    expect(moveFrameMap(inverted)).toEqual([]);
  });
});
