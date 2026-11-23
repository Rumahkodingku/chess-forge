import { formatEvaluation } from "@/features/analysis/engine/uci";
import { classifyPhases } from "@/features/analysis/phases";
import {
  type CriticalMoment,
  displayMoveClassification,
  type GameSummary,
  type MoveAssessment,
  type MoveClassification,
  type OpeningMatch,
  type Threat,
} from "@/features/analysis/types";
import type { Game } from "@/features/games/types";

export interface BuildSummaryInput {
  game: Game;
  assessments: MoveAssessment[];
  opening: OpeningMatch | null;
}

function emptyCounts(): Record<MoveClassification, number> {
  return {
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };
}

function mateTransition(assessment: MoveAssessment): string | undefined {
  if (
    assessment.evaluationBefore.type !== "mate" &&
    assessment.evaluationAfter.type !== "mate"
  ) {
    return undefined;
  }
  return `${formatEvaluation(assessment.evaluationBefore)} -> ${formatEvaluation(assessment.evaluationAfter)}`;
}

function moment(assessment: MoveAssessment, game: Game): CriticalMoment {
  const transition = mateTransition(assessment);
  const classification = displayMoveClassification(assessment);
  return {
    ply: assessment.ply,
    san: game.moves[assessment.ply - 1]?.san ?? `Ply ${assessment.ply}`,
    classification,
    centipawnLoss: assessment.centipawnLoss,
    mateTransition: transition,
    reason: transition
      ? `Mate transition ${transition}.`
      : assessment.centipawnLoss !== undefined
        ? `Lost ${assessment.centipawnLoss} centipawns.`
        : `Classified as ${classification}.`,
  };
}

function severity(assessment: MoveAssessment): number {
  if (mateTransition(assessment)) return Number.MAX_SAFE_INTEGER;
  return assessment.centipawnLoss ?? 0;
}

function needsCriticalMoment(assessment: MoveAssessment): boolean {
  return (
    Boolean(mateTransition(assessment)) ||
    assessment.classification === "mistake" ||
    assessment.classification === "blunder" ||
    (assessment.centipawnLoss ?? 0) >= 100
  );
}

function notableThreats(assessments: MoveAssessment[]): Threat[] {
  const threats = assessments.flatMap((assessment) => assessment.threats ?? []);
  const unique = new Map<string, Threat>();
  for (const threat of threats.sort(
    (left, right) =>
      Number(right.kind === "mate") - Number(left.kind === "mate") ||
      (right.materialDelta ?? 0) - (left.materialDelta ?? 0),
  )) {
    if (!unique.has(threat.uci)) unique.set(threat.uci, threat);
  }
  return [...unique.values()].slice(0, 3);
}

function summaryText(input: {
  game: Game;
  assessments: MoveAssessment[];
  opening: OpeningMatch | null;
  counts: Record<MoveClassification, number>;
  candidateBrilliantCount: number;
  acceptedBrilliantCount: number;
  majorEvalSwings: CriticalMoment[];
}): string {
  const { game, assessments, opening, counts } = input;
  const openingLabel = opening
    ? `${opening.name} (${opening.eco})`
    : "Unknown opening";
  if (!assessments.length) {
    return `${game.metadata.white} vs ${game.metadata.black} has not been analysed. ${game.moves.length} ply. Result ${game.metadata.result}. Opening: ${openingLabel}.`;
  }

  const largest = input.majorEvalSwings[0];
  const swing = largest
    ? `Largest swing: ${largest.san} at ply ${largest.ply} (${largest.classification}).`
    : "No evaluation swing was recorded.";
  const termination = game.metadata.termination
    ? `Termination: ${game.metadata.termination}.`
    : game.moves.at(-1)?.san.includes("#")
      ? "Game ended by checkmate."
      : "";
  const partial =
    assessments.length < game.moves.length ? "Analysis is incomplete." : "";
  return [
    `${game.metadata.white} vs ${game.metadata.black} ended ${game.metadata.result}.`,
    `Opening: ${openingLabel}.`,
    `${game.moves.length} ply.`,
    `${counts.best} best, ${counts.excellent} excellent, ${counts.good} good, ${counts.inaccuracy} inaccuracy, ${counts.mistake} mistake, ${counts.blunder} blunder.`,
    `Candidate Brilliant: ${input.candidateBrilliantCount}. Accepted Brilliant: ${input.acceptedBrilliantCount}.`,
    swing,
    termination,
    partial,
    "Classifications are heuristic and depth-dependent.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildGameSummary(input: BuildSummaryInput): GameSummary {
  const { game, assessments, opening } = input;
  const counts = emptyCounts();
  for (const assessment of assessments) {
    counts[assessment.classification] += 1;
  }
  const candidateBrilliantCount = assessments.filter(
    (assessment) => assessment.candidateBrilliant,
  ).length;
  const acceptedBrilliantCount = assessments.filter(
    (assessment) => assessment.brilliantDecision === "accepted",
  ).length;
  const ordered = [...assessments].sort(
    (left, right) => severity(right) - severity(left) || left.ply - right.ply,
  );
  const majorEvalSwings = ordered
    .slice(0, 3)
    .map((assessment) => moment(assessment, game));
  const criticalMoments = ordered
    .filter(needsCriticalMoment)
    .slice(0, 3)
    .map((assessment) => moment(assessment, game));
  const first = assessments[0];
  const configuration = first?.engineConfiguration;
  const limitLabel = configuration
    ? configuration.movetimeMs
      ? `${configuration.movetimeMs} ms`
      : `Depth ${configuration.depth ?? 14}`
    : "No analysis yet";
  const caveats = [
    "Classifications are heuristic and depth-dependent.",
    "Critical moments are recommendations, not objective key moments.",
    "Threats are not exhaustive tactical detection.",
  ];
  if (assessments.length && assessments.length < game.moves.length) {
    caveats.push("Analysis is incomplete.");
  }

  return {
    gameId: game.id,
    white: game.metadata.white,
    black: game.metadata.black,
    result: game.metadata.result,
    termination: game.metadata.termination,
    opening,
    phases: classifyPhases(game, opening),
    moveCount: game.moves.length,
    classificationCounts: counts,
    candidateBrilliantCount,
    acceptedBrilliantCount,
    majorEvalSwings,
    criticalMoments,
    notableThreats: notableThreats(assessments),
    engineVersion: first?.engineVersion ?? "Unknown",
    depth: first?.depth ?? 0,
    multiPv: configuration?.multiPv ?? 0,
    limitLabel,
    caveats,
    text: summaryText({
      game,
      assessments,
      opening,
      counts,
      candidateBrilliantCount,
      acceptedBrilliantCount,
      majorEvalSwings,
    }),
  };
}
