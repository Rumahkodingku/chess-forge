import { Chess, type PieceSymbol } from "chess.js";
import type { Evaluation } from "@/features/analysis/types";

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 300,
  b: 300,
  r: 500,
  q: 900,
  k: 0,
};

export function pieceValue(piece: PieceSymbol): number {
  return PIECE_VALUES[piece];
}

export interface BrilliantInput {
  fenBefore: string;
  playedUci: string;
  bestMoveUci?: string;
  mover: "w" | "b";
  after: Evaluation;
  inOpeningBook: boolean;
}

export interface BrilliantResult {
  candidate: boolean;
  sacrifice: number;
}

function isWinningForMover(evaluation: Evaluation, mover: "w" | "b"): boolean {
  const value = mover === "w" ? evaluation.value : -evaluation.value;
  if (evaluation.type === "mate") return value > 0;
  return value >= 50;
}

function uciOf(move: { from: string; to: string; promotion?: string }): string {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

export function staticExchangeGain(fenAfter: string, mover: "w" | "b"): number {
  const chess = new Chess(fenAfter);
  const opponent = mover === "w" ? "b" : "w";
  if (chess.turn() !== opponent) return 0;

  let best = 0;
  for (const capture of chess.moves({ verbose: true })) {
    if (!capture.captured) continue;
    const gain = PIECE_VALUES[capture.captured];
    chess.move(capture);
    const canRecapture = chess
      .moves({ verbose: true })
      .some((reply) => reply.to === capture.to && reply.captured);
    chess.undo();
    const net = gain - (canRecapture ? PIECE_VALUES[capture.piece] : 0);
    best = Math.max(best, net);
  }
  return best;
}

export function detectCandidateBrilliant(
  input: BrilliantInput,
): BrilliantResult {
  if (!input.bestMoveUci || input.playedUci !== input.bestMoveUci) {
    return { candidate: false, sacrifice: 0 };
  }
  if (input.inOpeningBook || !isWinningForMover(input.after, input.mover)) {
    return { candidate: false, sacrifice: 0 };
  }

  const chess = new Chess(input.fenBefore);
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length <= 1) {
    return { candidate: false, sacrifice: 0 };
  }

  const played = legalMoves.find((move) => uciOf(move) === input.playedUci);
  if (!played) {
    return { candidate: false, sacrifice: 0 };
  }

  chess.move(played);
  const sacrifice = staticExchangeGain(chess.fen(), input.mover);
  const fenAfter = chess.fen();
  chess.undo();

  if (sacrifice < 300) {
    return { candidate: false, sacrifice };
  }

  const hasSafeAlternative = legalMoves.some((move) => {
    if (uciOf(move) === input.playedUci) return false;
    chess.move(move);
    const gain =
      chess.fen() === fenAfter
        ? sacrifice
        : staticExchangeGain(chess.fen(), input.mover);
    chess.undo();
    return gain < 300;
  });

  return { candidate: hasSafeAlternative, sacrifice };
}
