import { describe, expect, it } from "vitest";
import {
  lineFen,
  parseRepertoireMoves,
} from "@/features/library/repertoire/model";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("repertoire model", () => {
  it("parses a SAN line and normalises move numbers", () => {
    const moves = parseRepertoireMoves(START_FEN, "1. e4 e5 2. Nf3 Nc6");
    expect(moves.map((move) => move.san)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    expect(moves[0]?.uci).toBe("e2e4");
  });

  it("rejects an illegal line", () => {
    expect(() => parseRepertoireMoves(START_FEN, "1. e4 e5 2. Bh6")).toThrow(
      "Illegal move",
    );
  });

  it("returns the final FEN", () => {
    const moves = parseRepertoireMoves(START_FEN, "1. e4 e5");
    expect(lineFen(START_FEN, moves)).toBe(
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    );
  });
});
