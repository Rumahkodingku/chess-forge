import { Chess } from "chess.js";
import type { GamePhase, OpeningMatch } from "@/features/analysis/types";

const MATERIAL_VALUES = {
  q: 9,
  r: 5,
  b: 3,
  n: 3,
  p: 0,
  k: 0,
} as const;

export interface PhaseGame {
  initialFen: string;
  moves: Array<{ fenAfter: string }>;
}

export function materialSummary(fen: string): {
  material: number;
  pieces: number;
} {
  let material = 0;
  let pieces = 0;
  for (const rank of new Chess(fen).board()) {
    for (const piece of rank) {
      if (!piece) continue;
      material += MATERIAL_VALUES[piece.type];
      if (piece.type !== "k") pieces += 1;
    }
  }
  return { material, pieces };
}

export function classifyPhases(
  game: PhaseGame,
  opening: OpeningMatch | null,
): GamePhase[] {
  const positions = [
    game.initialFen,
    ...game.moves.map((move) => move.fenAfter),
  ];
  const lastPly = positions.length - 1;
  const openingEnd =
    opening && opening.ply <= lastPly ? Math.max(0, opening.ply) : undefined;
  let endgameStart: number | undefined;

  for (const [ply, fen] of positions.entries()) {
    if (openingEnd !== undefined && ply <= openingEnd) continue;
    const summary = materialSummary(fen);
    if (summary.material <= 20 && summary.pieces <= 10) {
      endgameStart = ply;
      break;
    }
  }

  const phases: GamePhase[] = [];
  if (openingEnd !== undefined) {
    phases.push({ phase: "opening", startPly: 0, endPly: openingEnd });
  }

  const middlegameStart = openingEnd !== undefined ? openingEnd + 1 : 0;
  if (endgameStart !== undefined) {
    const middlegameEnd = endgameStart - 1;
    if (middlegameStart <= middlegameEnd) {
      phases.push({
        phase: "middlegame",
        startPly: middlegameStart,
        endPly: middlegameEnd,
      });
    }
    phases.push({
      phase: "endgame",
      startPly: endgameStart,
      endPly: lastPly,
    });
  } else if (middlegameStart <= lastPly) {
    phases.push({
      phase: "middlegame",
      startPly: middlegameStart,
      endPly: lastPly,
    });
  }

  return phases;
}
