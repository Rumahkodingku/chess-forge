import { formatEvaluation } from "@/features/analysis/engine/uci";
import type {
  AnalysisPerspective,
  Evaluation,
} from "@/features/analysis/types";

export function toDisplayEvaluation(
  evaluation: Evaluation,
  sideToMove: "w" | "b",
  perspective: AnalysisPerspective,
): Evaluation {
  if (perspective === "white" || sideToMove === "w") return evaluation;
  return { ...evaluation, value: -evaluation.value };
}

export function formatEvaluationForPerspective(
  evaluation: Evaluation,
  sideToMove: "w" | "b",
  perspective: AnalysisPerspective,
): string {
  return formatEvaluation(
    toDisplayEvaluation(evaluation, sideToMove, perspective),
  );
}

export function evaluationBarShare(evaluation: Evaluation): number {
  if (evaluation.type === "mate") {
    if (evaluation.value > 0) return 1;
    if (evaluation.value < 0) return 0;
    return 0.5;
  }
  const clamped = Math.min(1000, Math.max(-1000, evaluation.value));
  return 1 / (1 + Math.exp(-clamped / 400));
}
