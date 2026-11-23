import type { Evaluation, MoveClassification } from "@/features/analysis/types";

export const CLASSIFICATION_THRESHOLDS = {
  excellent: 20,
  good: 50,
  inaccuracy: 100,
  mistake: 200,
} as const;

export interface ClassifyMoveInput {
  playedUci: string;
  bestMoveUci?: string;
  mover: "w" | "b";
  before: Evaluation;
  after: Evaluation;
  afterTerminal?: "checkmate" | "stalemate" | "draw";
  legalMoveCount: number;
  depth: number;
  targetDepth: number;
}

export interface ClassifyMoveResult {
  classification: MoveClassification;
  centipawnLoss?: number;
  mateTransition?: string;
  confidence: "low" | "medium" | "high";
  caveat?: string;
}

interface MoverEvaluation {
  type: "cp" | "mate";
  value: number;
}

function moverEvaluation(
  evaluation: Evaluation,
  mover: "w" | "b",
): MoverEvaluation {
  const sign = mover === "w" ? 1 : -1;
  return {
    type: evaluation.type,
    value: evaluation.value * sign,
  };
}

function centipawnClassification(cpl: number): MoveClassification {
  if (cpl <= CLASSIFICATION_THRESHOLDS.excellent) return "excellent";
  if (cpl <= CLASSIFICATION_THRESHOLDS.good) return "good";
  if (cpl <= CLASSIFICATION_THRESHOLDS.inaccuracy) return "inaccuracy";
  if (cpl <= CLASSIFICATION_THRESHOLDS.mistake) return "mistake";
  return "blunder";
}

function nearThreshold(cpl: number): boolean {
  return Object.values(CLASSIFICATION_THRESHOLDS).some(
    (threshold) => Math.abs(cpl - threshold) <= 5,
  );
}

function formatMate(value: number): string {
  if (value === 0) return "#";
  return `${value > 0 ? "+" : "-"}M${Math.abs(value)}`;
}

function mateTransition(
  before: MoverEvaluation,
  after: MoverEvaluation,
): string {
  const left = before.type === "mate" ? formatMate(before.value) : "cp";
  const right = after.type === "mate" ? formatMate(after.value) : "cp";
  return `${left} -> ${right}`;
}

function confidenceForDepth(
  depth: number,
  targetDepth: number,
): "low" | "medium" | "high" {
  if (depth >= targetDepth) return "high";
  if (depth >= targetDepth - 2) return "medium";
  return "low";
}

function withDepthCaveat(
  result: ClassifyMoveResult,
  depth: number,
  targetDepth: number,
): ClassifyMoveResult {
  if (depth >= targetDepth) return result;
  return {
    ...result,
    caveat: result.caveat
      ? `${result.caveat} Search depth ${depth} is below target ${targetDepth}.`
      : `Search depth ${depth} is below target ${targetDepth}.`,
  };
}

export function classifyMove(input: ClassifyMoveInput): ClassifyMoveResult {
  const bestMatch = input.playedUci === input.bestMoveUci;
  const before = moverEvaluation(input.before, input.mover);
  const after = moverEvaluation(input.after, input.mover);

  if (input.afterTerminal === "checkmate") {
    return {
      classification: bestMatch ? "best" : "excellent",
      mateTransition: "checkmate",
      confidence: "low",
      caveat: "Checkmate ends the game.",
    };
  }

  if (before.type === "mate" || after.type === "mate") {
    const transition = mateTransition(before, after);
    let classification: MoveClassification;

    if (after.type === "mate" && after.value > 0) {
      if (before.type === "mate" && before.value > 0) {
        const slowerBy = after.value - before.value;
        if (slowerBy <= 0) {
          classification = bestMatch ? "best" : "excellent";
        } else if (slowerBy === 1) {
          classification = "good";
        } else {
          classification = "inaccuracy";
        }
      } else {
        classification = "best";
      }
    } else if (after.type === "mate" && after.value < 0) {
      if (before.type === "mate" && before.value < 0) {
        const delayedBy = Math.abs(after.value) - Math.abs(before.value);
        classification = delayedBy >= 0 ? "excellent" : "good";
      } else {
        classification = "blunder";
      }
    } else if (before.type === "mate" && before.value > 0) {
      const afterCp = after.type === "cp" ? after.value : 0;
      classification = afterCp >= 200 ? "mistake" : "blunder";
    } else {
      const afterCp = after.type === "cp" ? after.value : -1000;
      classification = afterCp >= -50 ? "best" : "excellent";
    }

    return {
      classification,
      mateTransition: transition,
      confidence: "low",
      caveat: "Mate transition. Mate distance is engine-dependent.",
    };
  }

  const moverBefore = before.value;
  const moverAfter = after.value;
  const cpl = Math.max(0, moverBefore - moverAfter);
  const forced = input.legalMoveCount === 1;

  if (forced) {
    return {
      classification: "best",
      centipawnLoss: cpl,
      confidence: "low",
      caveat: "Only legal move.",
    };
  }

  const classification = bestMatch ? "best" : centipawnClassification(cpl);
  const depthConfidence = confidenceForDepth(input.depth, input.targetDepth);
  const boundary = nearThreshold(cpl);
  const confidence = boundary ? "medium" : depthConfidence;
  const caveat = boundary
    ? "Centipawn loss is near a classification threshold."
    : undefined;

  return withDepthCaveat(
    {
      classification,
      centipawnLoss: cpl,
      confidence,
      caveat,
    },
    input.depth,
    input.targetDepth,
  );
}
