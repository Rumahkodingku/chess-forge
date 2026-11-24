import { Chess } from "chess.js";
import type { RepertoireMove } from "@/features/library/schemas";

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function cleanTokens(text: string): string[] {
  return text
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\d+\.(?:\.\.)?/g, " ")
    .replace(/\b(?:1-0|0-1|1\/2-1\/2|\*)\b/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function parseRepertoireMoves(
  startFen: string,
  text: string,
): RepertoireMove[] {
  const chess = new Chess(startFen);
  const moves: RepertoireMove[] = [];
  for (const san of cleanTokens(text)) {
    try {
      const result = chess.move(san);
      moves.push({
        san: result.san,
        uci: `${result.from}${result.to}${result.promotion ?? ""}`,
      });
    } catch {
      throw new Error(`Illegal move "${san}" in repertoire line.`);
    }
  }
  if (!moves.length) {
    throw new Error("Repertoire line needs at least one legal move.");
  }
  return moves;
}

export function lineFen(startFen: string, moves: RepertoireMove[]): string {
  const chess = new Chess(startFen);
  for (const move of moves) {
    chess.move({
      from: move.uci.slice(0, 2),
      to: move.uci.slice(2, 4),
      promotion: move.uci.length === 5 ? move.uci[4] : undefined,
    });
  }
  return chess.fen();
}
