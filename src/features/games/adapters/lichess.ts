import { parsePgn } from "@/features/games/pgn";
import type { Game } from "@/features/games/types";
import { cachedFetch, HttpError } from "@/lib/http";

export async function fetchLichessGames(
  username: string,
  max = 20,
): Promise<Game[]> {
  const response = await cachedFetch(
    `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=${Math.min(Math.max(max, 1), 50)}`,
    {
      headers: {
        Accept: "application/x-chess-pgn",
      },
    },
  );
  if (response.status === 404) {
    throw new HttpError("That Lichess username was not found.", 404);
  }
  if (!response.ok) {
    throw new HttpError("Lichess could not return the requested games.");
  }
  const pgn = await response.text();
  return parsePgn(pgn, "lichess", username).games;
}

export async function fetchLichessGame(gameId: string): Promise<Game> {
  const response = await cachedFetch(
    `https://lichess.org/game/export/${encodeURIComponent(gameId)}`,
    {
      headers: {
        Accept: "application/x-chess-pgn",
      },
    },
  );
  if (response.status === 404) {
    throw new HttpError("That Lichess game was not found.", 404);
  }
  if (!response.ok) {
    throw new HttpError("Lichess could not export the requested game.");
  }
  const pgn = await response.text();
  const games = parsePgn(pgn, "lichess", gameId).games;
  const game = games[0];
  if (!game) {
    throw new HttpError("Lichess returned no game for that reference.", 404);
  }
  return game;
}
