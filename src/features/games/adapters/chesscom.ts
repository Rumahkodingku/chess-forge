import { z } from "zod";
import { parsePgn } from "@/features/games/pgn";
import type { Game } from "@/features/games/types";
import { cachedFetch, HttpError } from "@/lib/http";

const archivesResponseSchema = z.object({
  archives: z.array(z.string().url()),
});

const chessComGameSchema = z
  .object({
    url: z.string().url(),
    pgn: z.string().optional(),
    rules: z.string(),
    time_class: z.string().optional(),
    fen: z.string().optional(),
    initial_setup: z.string().optional(),
    white: z
      .object({
        username: z.string(),
        result: z.string().optional(),
        rating: z.number().optional(),
      })
      .passthrough(),
    black: z
      .object({
        username: z.string(),
        result: z.string().optional(),
        rating: z.number().optional(),
      })
      .passthrough(),
    end_time: z.number().optional(),
    uuid: z.string().optional(),
  })
  .passthrough();

const gamesResponseSchema = z.object({
  games: z.array(chessComGameSchema),
});

export type ChessComGame = z.infer<typeof chessComGameSchema>;

export async function fetchChessComArchives(
  username: string,
): Promise<string[]> {
  const response = await cachedFetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`,
    { headers: { Accept: "application/json" } },
  );
  if (response.status === 404) {
    throw new HttpError("That Chess.com username was not found.", 404);
  }
  if (!response.ok) {
    throw new HttpError("Chess.com could not return the game archives.");
  }
  const json: unknown = await response.json();
  return archivesResponseSchema.parse(json).archives;
}

export async function fetchChessComGames(
  username: string,
  year: number,
  month: number,
): Promise<ChessComGame[]> {
  const paddedMonth = String(month).padStart(2, "0");
  const response = await cachedFetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/${year}/${paddedMonth}`,
    { headers: { Accept: "application/json" } },
  );
  if (response.status === 404) {
    throw new HttpError("No Chess.com archive exists for that month.", 404);
  }
  if (!response.ok) {
    throw new HttpError("Chess.com could not return the monthly games.");
  }
  const json: unknown = await response.json();
  return gamesResponseSchema.parse(json).games;
}

export interface ChessComConversion {
  games: Game[];
  warnings: string[];
}

export interface ChessComGameSummary {
  url: string;
  uuid?: string;
  rules: string;
  pgn: string;
  white: { username: string; result?: string };
  black: { username: string; result?: string };
  timeClass?: string;
  endTime?: number;
}

export interface ChessComSummaryResult {
  summaries: ChessComGameSummary[];
  warnings: string[];
}

export function summarizeChessComGames(
  games: ChessComGame[],
): ChessComSummaryResult {
  const summaries: ChessComGameSummary[] = [];
  const warnings: string[] = [];

  for (const game of games) {
    if (game.rules !== "chess" || !game.pgn) {
      if (game.rules !== "chess") {
        warnings.push(
          `Skipped ${game.rules} game at ${game.url}. ChessForge imports standard chess only.`,
        );
      }
      continue;
    }
    summaries.push({
      url: game.url,
      uuid: game.uuid,
      rules: game.rules,
      pgn: game.pgn,
      white: { username: game.white.username, result: game.white.result },
      black: { username: game.black.username, result: game.black.result },
      timeClass: game.time_class,
      endTime: game.end_time,
    });
  }

  return { summaries, warnings };
}

export function convertChessComGames(
  games: ChessComGame[],
): ChessComConversion {
  const converted: Game[] = [];
  const warnings: string[] = [];

  for (const game of games) {
    if (game.rules !== "chess" || !game.pgn) continue;
    try {
      converted.push(...parsePgn(game.pgn, "chesscom", game.url).games);
    } catch (error) {
      warnings.push(
        `Chess.com game ${game.url}: ${
          error instanceof Error ? error.message : "could not be parsed"
        }`,
      );
    }
  }

  return { games: converted, warnings };
}
