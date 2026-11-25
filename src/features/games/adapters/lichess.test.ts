import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLichessGames } from "@/features/games/adapters/lichess";
import { parsePgn } from "@/features/games/pgn";
import { clearHttpCache } from "@/lib/http";

describe("Lichess adapter fixture", () => {
  beforeEach(() => {
    clearHttpCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("converts a changed Lichess payload into a recoverable validation error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>temporarily unavailable</html>")),
    );

    await expect(fetchLichessGames("user")).rejects.toMatchObject({
      name: "ValidationError",
      message: "Lichess returned an unexpected response.",
      recovery: expect.stringContaining("paste the PGN manually"),
    });
  });
});
