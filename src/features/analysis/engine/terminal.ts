import { Chess } from "chess.js";
import type { Evaluation } from "@/features/analysis/types";

export type TerminalKind = "checkmate" | "stalemate" | "draw";

export interface TerminalState {
  terminal: TerminalKind;
  winner?: "w" | "b";
  score: Evaluation;
}

export function terminalState(fen: string): TerminalState | null {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) {
    return {
      terminal: "checkmate",
      winner: chess.turn() === "w" ? "b" : "w",
      score: { type: "mate", value: 0, perspective: "white" },
    };
  }
  if (chess.isStalemate()) {
    return {
      terminal: "stalemate",
      score: { type: "cp", value: 0, perspective: "white" },
    };
  }
  if (chess.isDraw()) {
    return {
      terminal: "draw",
      score: { type: "cp", value: 0, perspective: "white" },
    };
  }
  return null;
}
