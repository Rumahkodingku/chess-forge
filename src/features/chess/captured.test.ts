import { describe, expect, it } from "vitest";
import { capturedPieces } from "@/features/chess/captured";
import { parseSinglePgn } from "@/features/games/pgn";

describe("capturedPieces", () => {
  it("tracks normal captures up to the selected ply", () => {
    const game = parseSinglePgn(
      `[Event "Captures"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 d5 2. exd5 Qxd5 *`,
    );

    expect(capturedPieces(game, 0)).toEqual({ byWhite: [], byBlack: [] });
    expect(capturedPieces(game, 3)).toEqual({ byWhite: ["p"], byBlack: [] });
    expect(capturedPieces(game, 4)).toEqual({
      byWhite: ["p"],
      byBlack: ["p"],
    });
  });

  it("handles en passant", () => {
    const game = parseSinglePgn(
      `[Event "En passant"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 a6 2. e5 d5 3. exd6 *`,
    );

    expect(capturedPieces(game, 5)).toEqual({ byWhite: ["p"], byBlack: [] });
  });

  it("does not count a promotion as a capture", () => {
    const game = parseSinglePgn(
      `[Event "Promotion"]
[White "White"]
[Black "Black"]
[Result "*"]
[SetUp "1"]
[FEN "7k/P7/8/8/8/8/8/K7 w - - 0 1"]

1. a8=Q+ *`,
    );

    expect(capturedPieces(game, 1)).toEqual({ byWhite: [], byBlack: [] });
  });

  it("computes captures relative to a non-standard FEN", () => {
    const game = parseSinglePgn(
      `[Event "FEN capture"]
[White "White"]
[Black "Black"]
[Result "*"]
[SetUp "1"]
[FEN "7k/8/8/8/8/8/6p1/K5R1 w - - 0 1"]

1. Rxg2 *`,
    );

    expect(capturedPieces(game, 1)).toEqual({ byWhite: ["p"], byBlack: [] });
  });
});
