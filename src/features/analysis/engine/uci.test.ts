import { describe, expect, it } from "vitest";
import {
  analysisCacheKey,
  formatEvaluation,
  normalizeScore,
  parseBestMove,
  parseUciInfo,
  parseUciMove,
} from "@/features/analysis/engine/uci";

const WHITE_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const BLACK_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

describe("UCI helpers", () => {
  it("parses a centipawn info line", () => {
    const info = parseUciInfo(
      "info depth 18 seldepth 24 multipv 1 score cp 34 nodes 120000 nps 800000 pv e2e4 e7e5 g1f3",
      WHITE_FEN,
    );
    expect(info?.depth).toBe(18);
    expect(info?.multipv).toBe(1);
    expect(info?.score).toEqual({
      type: "cp",
      value: 34,
      perspective: "white",
    });
    expect(info?.pv).toEqual(["e2e4", "e7e5", "g1f3"]);
  });

  it("normalises black-to-move scores to White perspective", () => {
    expect(normalizeScore(BLACK_FEN, "cp", 120)).toEqual({
      type: "cp",
      value: -120,
      perspective: "white",
    });
    expect(normalizeScore(BLACK_FEN, "mate", -2)).toEqual({
      type: "mate",
      value: 2,
      perspective: "white",
    });
  });

  it("parses bestmove and UCI move strings", () => {
    expect(parseBestMove("bestmove e2e4 ponder e7e5")).toBe("e2e4");
    expect(parseBestMove("bestmove (none)")).toBeNull();
    expect(parseUciMove("e7e8q")).toEqual({
      from: "e7",
      to: "e8",
      promotion: "q",
    });
  });

  it("formats centipawn and mate evaluations", () => {
    expect(
      formatEvaluation({ type: "cp", value: 34, perspective: "white" }),
    ).toBe("+0.34");
    expect(
      formatEvaluation({ type: "mate", value: -3, perspective: "white" }),
    ).toBe("-M3");
  });

  it("builds a stable cache key from engine and position settings", () => {
    const key = analysisCacheKey({
      fen: WHITE_FEN,
      engineVersion: "Stockfish 19",
      depth: 14,
      multiPv: 3,
      threads: 1,
      hashMb: 32,
    });
    expect(key).toContain(WHITE_FEN);
    expect(key).toContain("Stockfish 19");
    expect(key.endsWith("|3|1|32")).toBe(true);
  });
});
