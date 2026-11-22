import { describe, expect, it } from "vitest";
import {
  type ChessComGame,
  convertChessComGames,
} from "@/features/games/adapters/chesscom";
import fixture from "@/features/games/fixtures/chesscom-games.json";

describe("Chess.com adapter", () => {
  it("converts standard games and reports parse warnings", () => {
    const result = convertChessComGames(fixture as ChessComGame[]);
    expect(result.games).toHaveLength(1);
    expect(result.games[0]?.source).toBe("chesscom");
    expect(result.games[0]?.sourceReference).toContain("r0-fixture");
    expect(result.games[0]?.moves).toHaveLength(4);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("r0-invalid");
  });
});
