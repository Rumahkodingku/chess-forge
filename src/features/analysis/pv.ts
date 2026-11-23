import { Chess } from "chess.js";
import { parseUciMove } from "@/features/analysis/engine/uci";

export interface PvPosition {
  fen: string;
  sans: string[];
}

export function applyPv(fen: string, pv: string[], step: number): PvPosition {
  const chess = new Chess(fen);
  const sans: string[] = [];
  for (const uci of pv.slice(0, Math.max(0, step))) {
    const move = parseUciMove(uci);
    if (!move) break;
    try {
      sans.push(chess.move(move).san);
    } catch {
      break;
    }
  }
  return { fen: chess.fen(), sans };
}
