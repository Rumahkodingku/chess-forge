import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PgnImportError,
  parsePgn,
  parsePgnCandidates,
  parseSinglePgn,
} from "@/features/games/pgn";

const STANDARD_PGN = `[Event "Test"]
[Site "local"]
[Date "2024.01.01"]
[Round "1"]
[White "White"]
[Black "Black"]
[Result "1-0"]

1. e4 {best by test} e5 $1 2. Nf3 (2. Bc4 Nf6) Nc6 3. Bb5 a6 1-0`;

const FEN_PGN = `[Event "FEN test"]
[White "White"]
[Black "Black"]
[Result "*"]
[SetUp "1"]
[FEN "7k/8/5K2/8/8/8/8/6Q1 w - - 0 1"]

1. Qg7# *`;

const TWO_GAMES_PGN = `${STANDARD_PGN}

[Event "Second"]
[White "A"]
[Black "B"]
[Result "0-1"]

1. d4 d5 0-1`;

describe("parsePgn", () => {
  it("converts a standard PGN into the internal game model", () => {
    const game = parseSinglePgn(STANDARD_PGN);
    expect(game.metadata.white).toBe("White");
    expect(game.metadata.black).toBe("Black");
    expect(game.metadata.result).toBe("1-0");
    expect(game.moves).toHaveLength(6);
    expect(game.moves[0]?.san).toBe("e4");
    expect(game.moves[0]?.uci).toBe("e2e4");
    expect(game.moves[0]?.comment).toBe("best by test");
    expect(game.moves[1]?.nags).toEqual([1]);
    expect(game.moves[2]?.variations?.[0]).toContain("Bc4");
    expect(game.originalPgn).toContain("best by test");
  });

  it("preserves a non-standard starting FEN and validates the mate", () => {
    const game = parseSinglePgn(FEN_PGN);
    expect(game.initialFen).toBe("7k/8/5K2/8/8/8/8/6Q1 w - - 0 1");
    expect(game.moves[0]?.san).toBe("Qg7#");
    expect(game.moves[0]?.fenAfter).toContain("Q");
  });

  it("parses multiple games and keeps each original PGN", () => {
    const result = parsePgn(TWO_GAMES_PGN);
    expect(result.games).toHaveLength(2);
    expect(result.games[1]?.metadata.white).toBe("A");
    expect(result.games[0]?.originalPgn).toContain('Event "Test"');
    expect(result.games[0]?.originalPgn).not.toContain('Event "Second"');
    expect(result.games[1]?.originalPgn).toContain('Event "Second"');
  });

  it("keeps valid candidates when another game is invalid", () => {
    const pgn = `${STANDARD_PGN}

[Event "Broken"]
[White "X"]
[Black "Y"]
[Result "*"]

1. e4 Qh9 *`;

    const candidates = parsePgnCandidates(pgn);
    expect(candidates).toHaveLength(2);
    expect(candidates[0]?.status).toMatch(/valid/);
    expect(candidates[1]?.status).toBe("invalid");
    expect(candidates[1]?.error).toBeTruthy();
  });

  it("rejects empty input", () => {
    expect(() => parsePgn("   ")).toThrow(PgnImportError);
  });

  it("reports an illegal SAN with ply and move details", () => {
    const invalid = `[Event "Invalid"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 e5 2. Nf6 *`;

    try {
      parsePgn(invalid);
      throw new Error("Expected parse to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(PgnImportError);
      const pgnError = error as PgnImportError;
      expect(pgnError.ply).toBe(3);
      expect(pgnError.san).toBe("Nf6");
      expect(pgnError.message).toContain("Illegal");
    }
  });

  it("rejects an unsupported variant", () => {
    const chess960 = `[Event "Variant"]
[Variant "Chess960"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 *`;

    expect(() => parsePgn(chess960)).toThrow(PgnImportError);
  });

  it("parses a 200 ply fixture without freezing", () => {
    const pgn = readFileSync(
      join(process.cwd(), "src/features/games/fixtures/long-game.pgn"),
      "utf8",
    );
    const started = performance.now();
    const game = parseSinglePgn(pgn);
    const elapsed = performance.now() - started;
    expect(game.moves).toHaveLength(200);
    expect(elapsed).toBeLessThan(2000);
  });
});
