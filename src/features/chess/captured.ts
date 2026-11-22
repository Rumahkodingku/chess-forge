import { Chess, type PieceSymbol } from "chess.js";
import type { Game } from "@/features/games/types";

export interface CapturedPieces {
  byWhite: PieceSymbol[];
  byBlack: PieceSymbol[];
}

const VALUE_ORDER: Record<PieceSymbol, number> = {
  q: 0,
  r: 1,
  b: 2,
  n: 3,
  p: 4,
  k: 5,
};

function sortByValue(pieces: PieceSymbol[]): PieceSymbol[] {
  return [...pieces].sort(
    (left, right) => VALUE_ORDER[left] - VALUE_ORDER[right],
  );
}

export function capturedPieces(
  game: Pick<Game, "initialFen" | "moves">,
  ply: number,
): CapturedPieces {
  const chess = new Chess(game.initialFen);
  const byWhite: PieceSymbol[] = [];
  const byBlack: PieceSymbol[] = [];

  for (const move of game.moves.slice(0, ply)) {
    let result: ReturnType<Chess["move"]>;
    try {
      result = chess.move({
        from: move.uci.slice(0, 2),
        to: move.uci.slice(2, 4),
        promotion: move.uci[4],
      });
    } catch {
      break;
    }
    if (result.captured) {
      (result.color === "w" ? byWhite : byBlack).push(result.captured);
    }
  }

  return {
    byWhite: sortByValue(byWhite),
    byBlack: sortByValue(byBlack),
  };
}
