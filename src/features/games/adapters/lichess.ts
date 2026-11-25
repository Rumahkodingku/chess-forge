import { parsePgn } from "@/features/games/pgn";
import type { Game } from "@/features/games/types";
import { ValidationError } from "@/lib/errors";
import { cachedFetch, HttpError } from "@/lib/http";

function unexpectedResponse(): ValidationError {
  return new ValidationError(
    "Lichess returned an unexpected response.",
    "Retry once. If it persists, paste the PGN manually.",
  );
}

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
  try {
    return parsePgn(pgn, "lichess", username).games;
  } catch {
    throw unexpectedResponse();
  }
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
  let games: Game[];
  try {
    games = parsePgn(pgn, "lichess", gameId).games;
  } catch {
    throw unexpectedResponse();
  }
  const game = games[0];
  if (!game) {
    throw new HttpError("Lichess returned no game for that reference.", 404);
  }
  return game;
}
