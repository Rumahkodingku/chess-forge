import { describe, expect, it } from "vitest";
import { R1_FIXTURE_PGN } from "@/features/games/fixtures/r1-walking-skeleton";
import { parseSinglePgn } from "@/features/games/pgn";
import {
  createWalkingSkeletonProject,
  createWalkingSkeletonScene,
} from "@/features/studio/project-factory";
import { videoProjectSchema } from "@/features/studio/scene/scene.types";

const game = parseSinglePgn(R1_FIXTURE_PGN, "pgn-text", "R1 fixture");

describe("walking skeleton project factory", () => {
  it("creates a 9:16 project with a game snapshot and one move scene", () => {
    const project = createWalkingSkeletonProject({ game, selectedPly: 1 });
    expect(videoProjectSchema.safeParse(project).success).toBe(true);
    expect(project.name).toBe("White vs Black");
    expect(project.templateId).toBe("r1-skeleton");
    expect(project.canvas).toEqual({
      aspectRatio: "9:16",
      width: 1080,
      height: 1920,
    });
    expect(project.frameRate).toBe(30);
    expect(project.projectVersion).toBe(3);
    expect(project.schemaVersion).toBe(3);
    expect(project.scenes).toHaveLength(1);
    expect(project.audioTracks).toEqual([]);
    expect(project.gameSnapshot?.moves).toHaveLength(10);
    expect(project.gameSnapshot?.metadata.white).toBe("White");
  });

  it("creates a three-second scene from the selected move", () => {
    const scene = createWalkingSkeletonScene({ game, selectedPly: 1 });
    expect(scene.durationInFrames).toBe(90);
    expect(scene.startFrame).toBe(0);
    expect(scene.type).toBe("move");
    expect(scene.moveRange).toEqual({ fromPly: 1, toPly: 1 });
    expect(scene.boardState.fen).toBe(game.moves[0]?.fenBefore);
    expect(scene.boardState.theme).toBe("forge");
    expect(scene.textOverlays[0]?.text).toBe("1. e4");
    expect(scene.timing).toEqual({
      leadInFrames: 10,
      moveDurationFrames: 45,
      gapFrames: 0,
      holdFrames: 35,
      easing: "easeInOut",
    });
    expect(scene.audioEvents[0]?.trigger).toBe("move");
  });

  it("formats a black move label correctly", () => {
    const scene = createWalkingSkeletonScene({ game, selectedPly: 2 });
    expect(scene.textOverlays[0]?.text).toBe("1... e5");
  });

  it("rejects the starting position as a scene source", () => {
    expect(() =>
      createWalkingSkeletonScene({ game, selectedPly: 0 }),
    ).toThrow();
  });
});
