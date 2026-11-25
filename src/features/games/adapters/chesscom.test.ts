import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ChessComGame,
  convertChessComGames,
  fetchChessComArchives,
  fetchChessComGames,
  summarizeChessComGames,
} from "@/features/games/adapters/chesscom";
import fixture from "@/features/games/fixtures/chesscom-games.json";
import { clearHttpCache } from "@/lib/http";

describe("Chess.com adapter", () => {
  beforeEach(() => {
    clearHttpCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("converts standard games and reports parse warnings", () => {
    const result = convertChessComGames(fixture as ChessComGame[]);
    expect(result.games).toHaveLength(1);
    expect(result.games[0]?.source).toBe("chesscom");
    expect(result.games[0]?.sourceReference).toContain("r0-fixture");
    expect(result.games[0]?.moves).toHaveLength(4);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("r0-invalid");
  });

  it("summarizes standard games without parsing their PGN", () => {
    const result = summarizeChessComGames(fixture as ChessComGame[]);
    expect(result.summaries).toHaveLength(2);
    expect(result.summaries[0]?.pgn).toContain("R0 Chess.com fixture");
    expect(result.summaries[0]?.white.username).toBe("White");
    expect(result.summaries[0]?.rules).toBe("chess");
    expect(result.warnings[0]).toContain("chess960");
  });

  it("converts a changed Chess.com payload into a recoverable validation error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ games: [{ url: "not-a-url", rules: "chess" }] }),
      ),
    );

    await expect(fetchChessComGames("user", 2026, 1)).rejects.toMatchObject({
      name: "ValidationError",
      message: "Chess.com returned an unexpected response.",
      recovery: expect.stringContaining("paste the PGN manually"),
    });
  });

  it("converts a 200 HTML archives response into a recoverable validation error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>temporarily unavailable</html>")),
    );

    await expect(fetchChessComArchives("user")).rejects.toMatchObject({
      name: "ValidationError",
      message: "Chess.com returned an unexpected response.",
      recovery: expect.stringContaining("paste the PGN manually"),
    });
  });

  it("converts a 200 HTML games response into a recoverable validation error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>temporarily unavailable</html>")),
    );

    await expect(fetchChessComGames("user", 2026, 1)).rejects.toMatchObject({
      name: "ValidationError",
      message: "Chess.com returned an unexpected response.",
      recovery: expect.stringContaining("paste the PGN manually"),
    });
  });
});
