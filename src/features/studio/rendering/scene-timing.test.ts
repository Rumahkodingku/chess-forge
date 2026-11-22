import { describe, expect, it } from "vitest";
import { R1_FIXTURE_PGN } from "@/features/games/fixtures/r1-walking-skeleton";
import { parseSinglePgn } from "@/features/games/pgn";
import { createWalkingSkeletonProject } from "@/features/studio/project-factory";
import { boardFenForProgress } from "@/features/studio/rendering/scene-timing";

const game = parseSinglePgn(R1_FIXTURE_PGN, "pgn-text", "R1 timing");
const project = createWalkingSkeletonProject({ game, selectedPly: 1 });
const scene = project.scenes[0];
const move = game.moves[0];

describe("boardFenForProgress", () => {
  it("keeps the pre-move position until the animation completes", () => {
    expect(scene).toBeDefined();
    expect(move).toBeDefined();
    if (!scene || !move) return;
    expect(boardFenForProgress(scene, move, 0)).toBe(move.fenBefore);
    expect(boardFenForProgress(scene, move, 0.5)).toBe(move.fenBefore);
  });

  it("switches to the post-move position at the final frame", () => {
    expect(scene).toBeDefined();
    expect(move).toBeDefined();
    if (!scene || !move) return;
    expect(boardFenForProgress(scene, move, 1)).toBe(move.fenAfter);
  });
});
