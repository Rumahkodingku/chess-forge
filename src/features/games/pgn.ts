import { type ParseTree, parseGames } from "@mliebelt/pgn-parser";
import type { PgnMove } from "@mliebelt/pgn-types";
import { Chess } from "chess.js";
import { type Game, type GameSource, gameSchema } from "@/features/games/types";
import { ValidationError } from "@/lib/errors";
import { createId } from "@/lib/id";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export class PgnImportError extends ValidationError {
  readonly gameIndex?: number;
  readonly ply?: number;
  readonly san?: string;

  constructor(
    message: string,
    details: { gameIndex?: number; ply?: number; san?: string } = {},
  ) {
    super(message, "Check the PGN around the reported move and import again.");
    this.name = "PgnImportError";
    this.gameIndex = details.gameIndex;
    this.ply = details.ply;
    this.san = details.san;
  }
}

export interface PgnParseResult {
  games: Game[];
  warnings: string[];
}

function tagString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "value" in value) {
    const inner = (value as { value?: unknown }).value;
    return typeof inner === "string" ? inner : undefined;
  }
  return undefined;
}

function tagNumber(value: unknown): number | undefined {
  const text = tagString(value);
  if (!text) return undefined;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function moveComment(move: PgnMove): string | undefined {
  return (
    move.commentAfter ??
    move.commentMove ??
    move.commentDiag?.comment ??
    undefined
  );
}

function moveNags(move: PgnMove): number[] | undefined {
  if (!move.nag?.length) return undefined;
  const parsed = move.nag
    .map((nag) => Number.parseInt(nag.replace("$", ""), 10))
    .filter((nag) => Number.isFinite(nag));
  return parsed.length ? parsed : undefined;
}

function moveVariations(move: PgnMove): string[] | undefined {
  if (!move.variations?.length) return undefined;
  const lines = move.variations.map((variation) =>
    variation.map((lineMove) => lineMove.notation.notation).join(" "),
  );
  return lines.length ? lines : undefined;
}

function metadataFromTags(tags: ParseTree["tags"]): Game["metadata"] {
  return {
    white: tags?.White ?? "Unknown",
    black: tags?.Black ?? "Unknown",
    result: tags?.Result ?? "*",
    event: tags?.Event,
    site: tags?.Site,
    date: tagString(tags?.Date),
    round: tags?.Round,
    timeControl: tagString(tags?.TimeControl),
    eco: tags?.ECO,
    opening: tags?.Opening,
    whiteElo: tagNumber(tags?.WhiteElo),
    blackElo: tagNumber(tags?.BlackElo),
    termination: tags?.Termination,
  };
}

function convertGame(
  tree: ParseTree,
  source: GameSource,
  sourceReference: string | undefined,
  gameIndex: number,
  originalPgn: string,
): Game {
  const variant = tagString(tree.tags?.Variant);
  if (variant && variant.toLowerCase() !== "standard") {
    throw new PgnImportError(
      `Unsupported variant "${variant}". ChessForge imports standard chess only.`,
      { gameIndex },
    );
  }

  const initialFen = tagString(tree.tags?.FEN) ?? START_FEN;
  const chess = new Chess();
  try {
    chess.load(initialFen);
  } catch {
    throw new PgnImportError("The starting FEN is invalid.", { gameIndex });
  }

  const moves: Game["moves"] = [];
  for (const [index, move] of tree.moves.entries()) {
    const san = move.notation.notation;
    const fenBefore = chess.fen();
    let result: ReturnType<Chess["move"]>;
    try {
      result = chess.move(san);
    } catch {
      throw new PgnImportError(`Illegal SAN move "${san}".`, {
        gameIndex,
        ply: index + 1,
        san,
      });
    }

    moves.push({
      ply: index + 1,
      fullMoveNumber: move.moveNumber ?? Math.floor(index / 2) + 1,
      color: move.turn,
      san: result.san,
      uci: `${result.from}${result.to}${result.promotion ?? ""}`,
      fenBefore,
      fenAfter: chess.fen(),
      comment: moveComment(move),
      nags: moveNags(move),
      variations: moveVariations(move),
    });
  }

  const now = new Date().toISOString();
  const game: Game = {
    id: createId(),
    source,
    sourceReference,
    metadata: metadataFromTags(tree.tags),
    initialFen,
    moves,
    originalPgn,
    importStatus: "valid",
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };

  return gameSchema.parse(game);
}

export function parsePgn(
  pgn: string,
  source: GameSource = "pgn-text",
  sourceReference?: string,
): PgnParseResult {
  const input = pgn.trim();
  if (!input) {
    throw new PgnImportError("The PGN input is empty.");
  }

  let trees: ParseTree[];
  try {
    trees = parseGames(input);
  } catch (error) {
    throw new PgnImportError(
      error instanceof Error ? error.message : "The PGN could not be parsed.",
    );
  }

  if (!trees.length) {
    throw new PgnImportError("No games were found in the PGN input.");
  }

  const games = trees.map((tree, index) =>
    convertGame(tree, source, sourceReference, index, input),
  );

  return {
    games,
    warnings: trees.flatMap((tree) =>
      (tree.tags?.messages ?? []).map((message) => message.message),
    ),
  };
}

export function parseSinglePgn(
  pgn: string,
  source: GameSource = "pgn-text",
  sourceReference?: string,
): Game {
  const { games } = parsePgn(pgn, source, sourceReference);
  const game = games[0];
  if (!game) {
    throw new PgnImportError("No game was found in the PGN input.");
  }
  return game;
}
