import { describe, expect, it } from "vitest";
import {
  type ChessComGame,
  convertChessComGames,
} from "@/features/games/adapters/chesscom";
import fixture from "@/features/games/fixtures/chesscom-games.json";

describe("Chess.com adapter", () => {
  it("converts standard games and filters variants", () => {
    const games = convertChessComGames(fixture as ChessComGame[]);
    expect(games).toHaveLength(1);
    expect(games[0]?.source).toBe("chesscom");
    expect(games[0]?.sourceReference).toContain("r0-fixture");
    expect(games[0]?.moves).toHaveLength(4);
  });
});
