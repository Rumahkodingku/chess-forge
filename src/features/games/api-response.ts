import type { ChessComGameSummary } from "@/features/games/adapters/chesscom";
import type { Game } from "@/features/games/types";
import { ValidationError } from "@/lib/errors";

const RESPONSE_RECOVERY = "Retry once. If it persists, paste the PGN manually.";

function unexpectedResponse(service: string): ValidationError {
  return new ValidationError(
    `${service} returned an unexpected response.`,
    RESPONSE_RECOVERY,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlayer(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.username === "string" &&
    (value.result === undefined || typeof value.result === "string")
  );
}

function isChessComSummary(value: unknown): value is ChessComGameSummary {
  return (
    isRecord(value) &&
    typeof value.url === "string" &&
    typeof value.rules === "string" &&
    typeof value.pgn === "string" &&
    isPlayer(value.white) &&
    isPlayer(value.black) &&
    (value.uuid === undefined || typeof value.uuid === "string") &&
    (value.timeClass === undefined || typeof value.timeClass === "string") &&
    (value.endTime === undefined || typeof value.endTime === "number")
  );
}

function isGame(value: unknown): value is Game {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    Array.isArray(value.moves) &&
    isRecord(value.metadata)
  );
}

export function readChessComArchivesResponse(body: unknown): string[] {
  if (!isRecord(body) || !Array.isArray(body.archives)) {
    throw unexpectedResponse("Chess.com");
  }
  if (!body.archives.every((entry) => typeof entry === "string")) {
    throw unexpectedResponse("Chess.com");
  }
  return body.archives;
}

export function readChessComGamesResponse(body: unknown): {
  games: ChessComGameSummary[];
  warnings: string[];
} {
  if (
    !isRecord(body) ||
    !Array.isArray(body.games) ||
    !body.games.every(isChessComSummary)
  ) {
    throw unexpectedResponse("Chess.com");
  }
  if (
    body.warnings !== undefined &&
    (!Array.isArray(body.warnings) ||
      !body.warnings.every((warning) => typeof warning === "string"))
  ) {
    throw unexpectedResponse("Chess.com");
  }
  return {
    games: body.games,
    warnings: (body.warnings as string[] | undefined) ?? [],
  };
}

export function readLichessGamesResponse(body: unknown): Game[] {
  if (
    !isRecord(body) ||
    !Array.isArray(body.games) ||
    !body.games.every(isGame)
  ) {
    throw unexpectedResponse("Lichess");
  }
  return body.games;
}

export function readLichessGameResponse(body: unknown): Game {
  if (!isRecord(body) || !isGame(body.game)) {
    throw unexpectedResponse("Lichess");
  }
  return body.game;
}
