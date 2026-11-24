import { describe, expect, it } from "vitest";
import {
  applyPuzzleSetup,
  isCorrectPuzzleMove,
} from "@/features/library/practice/puzzle";
import type { LibraryPuzzle } from "@/features/library/schemas";

const puzzle: LibraryPuzzle = {
  id: "test",
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  moves: ["e2e4", "e7e5", "g1f3"],
  rating: 1200,
  ratingDeviation: 80,
  popularity: 90,
  nbPlays: 1000,
  themes: ["fork"],
  openingTags: [],
};

describe("puzzle setup", () => {
  it("applies the opponent setup move and reveals the user turn", () => {
    const setup = applyPuzzleSetup(puzzle);
    expect(setup.lastMove).toBe("e4");
    expect(setup.sideToMove).toBe("b");
    expect(setup.expectedUci).toBe("e7e5");
    expect(setup.solution).toEqual(["e7e5", "g1f3"]);
  });

  it("rejects an illegal setup move", () => {
    expect(() =>
      applyPuzzleSetup({ ...puzzle, moves: ["e2e5", "e7e5"] }),
    ).toThrow("Puzzle setup move is illegal");
  });

  it("accepts the exact expected move", () => {
    expect(isCorrectPuzzleMove(puzzle, "e7e5")).toBe(true);
  });

  it("rejects a different legal move", () => {
    expect(isCorrectPuzzleMove(puzzle, "e7e6")).toBe(false);
  });

  it("rejects an illegal move", () => {
    expect(isCorrectPuzzleMove(puzzle, "e7e4")).toBe(false);
  });
});
