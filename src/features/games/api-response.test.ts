import { describe, expect, it } from "vitest";
import {
  readChessComArchivesResponse,
  readChessComGamesResponse,
  readLichessGameResponse,
  readLichessGamesResponse,
} from "@/features/games/api-response";
import { ValidationError } from "@/lib/errors";

const summary = {
  url: "https://www.chess.com/game/live/1",
  rules: "chess",
  pgn: "1. e4 e5",
  white: { username: "White" },
  black: { username: "Black" },
};

const game = {
  id: "lichess-game",
  source: "lichess",
  metadata: { white: "White", black: "Black", result: "1-0" },
  moves: [{ ply: 1, san: "e4", uci: "e2e4", fen: "fen" }],
};

describe("external API response validation", () => {
  it("reads a valid Chess.com archives response", () => {
    expect(
      readChessComArchivesResponse({
        archives: ["https://api.chess.com/pub/player/a/games/2026/01"],
      }),
    ).toEqual(["https://api.chess.com/pub/player/a/games/2026/01"]);
  });

  it("rejects an unexpected Chess.com archives response with recovery", () => {
    let error: unknown;
    try {
      readChessComArchivesResponse({ archives: [42] });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({
      message: "Chess.com returned an unexpected response.",
      recovery: expect.stringContaining("paste the PGN manually"),
    });
  });

  it("reads a valid Chess.com games response", () => {
    expect(
      readChessComGamesResponse({ games: [summary], warnings: ["skipped"] }),
    ).toEqual({ games: [summary], warnings: ["skipped"] });
  });

  it("rejects an unexpected Chess.com games response", () => {
    expect(() =>
      readChessComGamesResponse({ games: [{ url: summary.url }] }),
    ).toThrow("Chess.com returned an unexpected response.");
  });

  it("reads a valid Lichess games response", () => {
    expect(readLichessGamesResponse({ games: [game] })).toEqual([game]);
  });

  it("rejects an unexpected Lichess games response", () => {
    expect(() => readLichessGamesResponse({ nope: true })).toThrow(
      "Lichess returned an unexpected response.",
    );
  });

  it("reads a valid Lichess single-game response", () => {
    expect(readLichessGameResponse({ game })).toEqual(game);
    expect(() => readLichessGameResponse({})).toThrow(
      "Lichess returned an unexpected response.",
    );
  });
});
