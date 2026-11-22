import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePgn } from "@/features/games/pgn";

describe("Lichess adapter fixture", () => {
  it("converts a Lichess PGN into the internal game model", () => {
    const pgn = readFileSync(
      join(process.cwd(), "src/features/games/fixtures/lichess-games.pgn"),
      "utf8",
    );
    const result = parsePgn(pgn, "lichess", "r0fixture");
    expect(result.games).toHaveLength(1);
    expect(result.games[0]?.source).toBe("lichess");
    expect(result.games[0]?.metadata.white).toBe("White");
    expect(result.games[0]?.moves).toHaveLength(12);
  });
});
