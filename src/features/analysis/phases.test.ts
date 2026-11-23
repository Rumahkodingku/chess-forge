import { describe, expect, it } from "vitest";
import { classifyPhases, materialSummary } from "@/features/analysis/phases";

const FULL = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const KINGS = "8/8/8/8/8/8/4k3/4K3 w - - 0 1";
const FOUR_ROOKS = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
const FOUR_ROOKS_KNIGHT = "r3k2r/8/8/8/8/8/8/R3K1NR w KQkq - 0 1";

function gameWith(fens: string[]) {
  return {
    initialFen: fens[0] ?? FULL,
    moves: fens.slice(1).map((fenAfter) => ({ fenAfter })),
  };
}

describe("phase classification", () => {
  it("counts non-pawn material and pieces", () => {
    expect(materialSummary(FULL)).toEqual({ material: 62, pieces: 30 });
    expect(materialSummary(KINGS)).toEqual({ material: 0, pieces: 0 });
  });

  it("splits opening, middlegame, and endgame", () => {
    const phases = classifyPhases(gameWith([FULL, FULL, FULL, KINGS]), {
      eco: "C20",
      name: "Open Game",
      epd: "x",
      ply: 2,
    });
    expect(phases).toEqual([
      { phase: "opening", startPly: 0, endPly: 2 },
      { phase: "endgame", startPly: 3, endPly: 3 },
    ]);
  });

  it("omits the opening phase when no book match exists", () => {
    expect(classifyPhases(gameWith([FULL, FULL, KINGS]), null)).toEqual([
      { phase: "middlegame", startPly: 0, endPly: 1 },
      { phase: "endgame", startPly: 2, endPly: 2 },
    ]);
  });

  it("keeps middlegame to the end when no endgame appears", () => {
    expect(
      classifyPhases(gameWith([FULL, FULL, FULL]), {
        eco: "C20",
        name: "Open Game",
        epd: "x",
        ply: 1,
      }),
    ).toEqual([
      { phase: "opening", startPly: 0, endPly: 1 },
      { phase: "middlegame", startPly: 2, endPly: 2 },
    ]);
  });

  it("uses the documented endgame threshold", () => {
    expect(classifyPhases(gameWith([FOUR_ROOKS]), null).at(-1)).toMatchObject({
      phase: "endgame",
      startPly: 0,
    });
    expect(
      classifyPhases(gameWith([FOUR_ROOKS_KNIGHT]), null).at(-1),
    ).toMatchObject({ phase: "middlegame" });
  });
});
