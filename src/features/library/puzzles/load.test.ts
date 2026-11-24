import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { loadLibraryPuzzles } from "@/features/library/puzzles/load";

describe("library puzzle data", () => {
  it("loads exactly 5,000 unique puzzles in the approved rating range", async () => {
    const puzzles = await loadLibraryPuzzles();
    expect(puzzles).toHaveLength(5000);
    expect(new Set(puzzles.map((puzzle) => puzzle.id)).size).toBe(5000);
    for (const puzzle of puzzles) {
      expect(puzzle.rating).toBeGreaterThanOrEqual(600);
      expect(puzzle.rating).toBeLessThanOrEqual(2400);
    }
  });

  it("has legal setup and solution moves", async () => {
    const puzzles = await loadLibraryPuzzles();
    for (const puzzle of puzzles.slice(0, 100)) {
      const chess = new Chess(puzzle.fen);
      for (const uci of puzzle.moves) {
        expect(() =>
          chess.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci.length === 5 ? uci[4] : undefined,
          }),
        ).not.toThrow();
      }
    }
  });
});
