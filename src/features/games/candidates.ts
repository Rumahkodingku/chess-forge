import type { ChessComGameSummary } from "@/features/games/adapters/chesscom";
import type { PgnCandidate } from "@/features/games/pgn";
import type { Game } from "@/features/games/types";
import { createId } from "@/lib/id";

export const MAX_IMPORT_CANDIDATES = 200;

export function candidateFromGame(game: Game): PgnCandidate {
  return {
    id: game.id,
    source: game.source,
    sourceReference: game.sourceReference,
    pgn: game.originalPgn,
    metadata: game.metadata,
    plyCount: game.moves.length,
    warnings: game.importWarnings ?? [],
    status: game.importWarnings?.length ? "valid-with-warnings" : "valid",
    game,
  };
}

export function candidateFromChessComSummary(
  summary: ChessComGameSummary,
): PgnCandidate {
  return {
    id: createId(),
    source: "chesscom",
    sourceReference: summary.url,
    pgn: summary.pgn,
    metadata: {
      white: summary.white.username,
      black: summary.black.username,
      result: "*",
      site: "Chess.com",
      timeControl: summary.timeClass,
    },
    plyCount: 0,
    warnings: [],
    status: "valid",
  };
}

export function filterCandidates(
  candidates: PgnCandidate[],
  query: string,
): PgnCandidate[] {
  const search = query.trim().toLowerCase();
  if (!search) return candidates;
  return candidates.filter((candidate) => {
    const metadata = candidate.metadata;
    return [
      metadata.white,
      metadata.black,
      metadata.event,
      metadata.site,
      metadata.result,
      metadata.round,
      metadata.date,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(search));
  });
}

export function sortCandidates(candidates: PgnCandidate[]): PgnCandidate[] {
  return [...candidates].sort((left, right) => {
    const date = (right.metadata.date ?? "").localeCompare(
      left.metadata.date ?? "",
    );
    if (date !== 0) return date;
    const event = (left.metadata.event ?? "").localeCompare(
      right.metadata.event ?? "",
    );
    if (event !== 0) return event;
    return left.metadata.white.localeCompare(right.metadata.white);
  });
}

export function capCandidates(candidates: PgnCandidate[]): {
  visible: PgnCandidate[];
  truncated: boolean;
} {
  return {
    visible: candidates.slice(0, MAX_IMPORT_CANDIDATES),
    truncated: candidates.length > MAX_IMPORT_CANDIDATES,
  };
}
