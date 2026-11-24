import { classifyPhases } from "@/features/analysis/phases";
import type {
  MoveAssessment,
  MoveClassification,
  OpeningMatch,
} from "@/features/analysis/types";
import type { Game } from "@/features/games/types";

export interface OpeningInsight {
  eco: string;
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  asWhite: number;
  asBlack: number;
  mistakes: number;
  blunders: number;
}

export interface PhaseInsight {
  phase: "opening" | "middlegame" | "endgame";
  moves: number;
  mistakes: number;
  blunders: number;
  averageCentipawnLoss: number | null;
}

export interface MistakeCandidate {
  gameId: string;
  ply: number;
  fenBefore: string;
  san: string;
  classification: MoveClassification;
  centipawnLoss?: number;
  userSide: "w" | "b";
  opening?: string;
}

export interface GameInsights {
  analyzedGames: number;
  gamesWithKnownSide: number;
  gamesWithoutKnownSide: number;
  openingInsights: OpeningInsight[];
  phaseInsights: PhaseInsight[];
  classificationCounts: Record<MoveClassification, number>;
  criticalThemes: string[];
  mistakes: MistakeCandidate[];
  caveats: string[];
}

interface BuildGameInsightsInput {
  game: Game;
  assessments: MoveAssessment[];
  opening: OpeningMatch | null;
  userSide: "w" | "b" | null;
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

function resultForSide(game: Game, side: "w" | "b"): "win" | "draw" | "loss" {
  const result = game.metadata.result;
  if (result === "1/2-1/2") return "draw";
  if (result === "1-0") return side === "w" ? "win" : "loss";
  if (result === "0-1") return side === "b" ? "win" : "loss";
  return "draw";
}

export function buildGameInsights({
  game,
  assessments,
  opening,
  userSide,
}: BuildGameInsightsInput): GameInsights {
  const counts = emptyCounts();
  const phases = classifyPhases(game, opening);
  const phaseMap = new Map<number, "opening" | "middlegame" | "endgame">();
  for (const phase of phases) {
    for (let ply = phase.startPly; ply <= phase.endPly; ply += 1) {
      phaseMap.set(ply, phase.phase);
    }
  }
  const phaseStats = new Map<
    "opening" | "middlegame" | "endgame",
    { moves: number; mistakes: number; blunders: number; cpl: number[] }
  >();
  for (const assessment of assessments) {
    counts[assessment.classification] += 1;
    const phase = phaseMap.get(assessment.ply) ?? "middlegame";
    const stats = phaseStats.get(phase) ?? {
      moves: 0,
      mistakes: 0,
      blunders: 0,
      cpl: [],
    };
    stats.moves += 1;
    if (assessment.classification === "mistake") stats.mistakes += 1;
    if (assessment.classification === "blunder") stats.blunders += 1;
    if (assessment.centipawnLoss !== undefined)
      stats.cpl.push(assessment.centipawnLoss);
    phaseStats.set(phase, stats);
  }

  const mistakes: MistakeCandidate[] = [];
  if (userSide) {
    for (const assessment of assessments) {
      const move = game.moves[assessment.ply - 1];
      if (!move || move.color !== userSide) continue;
      if (
        assessment.classification !== "mistake" &&
        assessment.classification !== "blunder" &&
        (assessment.centipawnLoss ?? 0) < 100
      ) {
        continue;
      }
      mistakes.push({
        gameId: game.id,
        ply: assessment.ply,
        fenBefore: move.fenBefore,
        san: move.san,
        classification: assessment.classification,
        centipawnLoss: assessment.centipawnLoss,
        userSide,
        opening: opening?.name,
      });
    }
    mistakes.sort(
      (left, right) =>
        (right.centipawnLoss ?? 0) - (left.centipawnLoss ?? 0) ||
        right.ply - left.ply,
    );
  }

  const outcome = userSide ? resultForSide(game, userSide) : null;
  const openingInsights: OpeningInsight[] = opening
    ? [
        {
          eco: opening.eco,
          name: opening.name,
          games: 1,
          wins: outcome === "win" ? 1 : 0,
          draws: outcome === "draw" ? 1 : 0,
          losses: outcome === "loss" ? 1 : 0,
          asWhite: userSide === "w" ? 1 : 0,
          asBlack: userSide === "b" ? 1 : 0,
          mistakes: mistakes.filter((item) => item.classification === "mistake")
            .length,
          blunders: mistakes.filter((item) => item.classification === "blunder")
            .length,
        },
      ]
    : [];

  const phaseInsights: PhaseInsight[] = [...phaseStats.entries()].map(
    ([phase, stats]) => ({
      phase,
      moves: stats.moves,
      mistakes: stats.mistakes,
      blunders: stats.blunders,
      averageCentipawnLoss: stats.cpl.length
        ? Math.round(
            stats.cpl.reduce((sum, value) => sum + value, 0) / stats.cpl.length,
          )
        : null,
    }),
  );

  const criticalThemes: string[] = [];
  if (counts.blunder)
    criticalThemes.push(
      `${counts.blunder} blunder${counts.blunder === 1 ? "" : "s"}`,
    );
  if (counts.mistake)
    criticalThemes.push(
      `${counts.mistake} mistake${counts.mistake === 1 ? "" : "s"}`,
    );
  if (opening) criticalThemes.push(opening.name);

  return {
    analyzedGames: assessments.length ? 1 : 0,
    gamesWithKnownSide: userSide ? 1 : 0,
    gamesWithoutKnownSide: userSide ? 0 : 1,
    openingInsights,
    phaseInsights,
    classificationCounts: counts,
    criticalThemes,
    mistakes: mistakes.slice(0, 50),
    caveats: [
      "Classifications are heuristic and depth-dependent.",
      "Small samples do not establish a pattern.",
      ...(userSide
        ? []
        : [
            "The player side is unknown because no player name matched. Side-specific stats and mistake drills are hidden.",
          ]),
    ],
  };
}
