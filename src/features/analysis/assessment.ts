import { Chess } from "chess.js";
import { detectCandidateBrilliant } from "@/features/analysis/brilliant";
import { classifyMove } from "@/features/analysis/classification";
import { detectThreats } from "@/features/analysis/threats";
import type {
  BrilliantDecision,
  MoveAssessment,
  PositionAnalysis,
} from "@/features/analysis/types";

export interface BuildAssessmentInput {
  gameId: string;
  ply: number;
  mover: "w" | "b";
  playedUci: string;
  fenBefore: string;
  fenAfter: string;
  before: PositionAnalysis;
  after: PositionAnalysis;
  inOpeningBook: boolean;
  existingDecision?: BrilliantDecision;
}

export function buildMoveAssessment(
  input: BuildAssessmentInput,
): MoveAssessment {
  const legalMoveCount = new Chess(input.fenBefore).moves().length;
  const targetDepth = input.before.engineConfiguration.depth ?? 14;
  const classification = classifyMove({
    playedUci: input.playedUci,
    bestMoveUci: input.before.bestMoveUci,
    mover: input.mover,
    before: input.before.score,
    after: input.after.score,
    afterTerminal: input.after.terminal,
    legalMoveCount,
    depth: input.before.depth,
    targetDepth,
  });
  const brilliant = detectCandidateBrilliant({
    fenBefore: input.fenBefore,
    playedUci: input.playedUci,
    bestMoveUci: input.before.bestMoveUci,
    mover: input.mover,
    after: input.after.score,
    inOpeningBook: input.inOpeningBook,
  });
  const threats = input.after.terminal
    ? undefined
    : detectThreats({
        fen: input.fenAfter,
        pv: input.after.principalVariations[0]?.pv ?? [],
        ply: input.ply,
        mover: input.mover,
      });

  return {
    id: crypto.randomUUID(),
    gameId: input.gameId,
    ply: input.ply,
    evaluationBefore: input.before.score,
    evaluationAfter: input.after.score,
    centipawnLoss: classification.centipawnLoss,
    classification: classification.classification,
    candidateBrilliant: brilliant.candidate,
    brilliantDecision: brilliant.candidate
      ? (input.existingDecision ?? "pending")
      : input.existingDecision,
    confidence: classification.confidence,
    caveat: classification.caveat,
    engineVersion: input.before.engineVersion,
    engineConfiguration: input.before.engineConfiguration,
    depth: input.before.depth,
    threats: threats?.length ? threats : undefined,
    createdAt: new Date().toISOString(),
    schemaVersion: 2,
  };
}
