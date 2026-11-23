import { z } from "zod";

export const evaluationSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("cp"),
      value: z.number(),
      perspective: z.literal("white"),
    })
    .strict(),
  z
    .object({
      type: z.literal("mate"),
      value: z.number(),
      perspective: z.literal("white"),
    })
    .strict(),
]);

export const engineConfigurationSchema = z
  .object({
    depth: z.number().int().positive().optional(),
    movetimeMs: z.number().int().positive().optional(),
    multiPv: z.number().int().min(1).max(8),
    threads: z.number().int().min(1).max(16),
    hashMb: z.number().int().min(16).max(2048),
    perspective: z.literal("white"),
  })
  .strict();

export const principalVariationSchema = z
  .object({
    multipv: z.number().int().positive(),
    score: evaluationSchema,
    pv: z.array(z.string()),
    depth: z.number().int().nonnegative(),
    nodes: z.number().int().nonnegative().optional(),
    nps: z.number().int().nonnegative().optional(),
  })
  .strict();

export const positionAnalysisSchema = z
  .object({
    cacheKey: z.string().min(1),
    gameId: z.string().uuid().optional(),
    ply: z.number().int().positive().optional(),
    fen: z.string().min(1),
    engineVersion: z.string().min(1),
    engineConfiguration: engineConfigurationSchema,
    depth: z.number().int().nonnegative(),
    seldepth: z.number().int().nonnegative().optional(),
    nodes: z.number().int().nonnegative().optional(),
    nps: z.number().int().nonnegative().optional(),
    timeMs: z.number().int().nonnegative().optional(),
    score: evaluationSchema,
    bestMoveUci: z.string().optional(),
    principalVariations: z.array(principalVariationSchema),
    partial: z.boolean().optional(),
    terminal: z.enum(["checkmate", "stalemate", "draw"]).optional(),
    terminalWinner: z.enum(["w", "b"]).optional(),
    createdAt: z.string().min(1),
    schemaVersion: z.number().int().positive(),
  })
  .strict();

export const moveClassificationSchema = z.enum([
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
]);

export const brilliantDecisionSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
]);

export const threatSchema = z
  .object({
    kind: z.enum(["mate", "material", "hanging"]),
    forced: z.boolean(),
    ply: z.number().int().nonnegative(),
    san: z.string().min(1),
    uci: z.string().min(1),
    line: z.array(z.string()),
    materialDelta: z.number().int().nonnegative().optional(),
    description: z.string().min(1),
    confidence: z.enum(["low", "medium", "high"]),
  })
  .strict();

export const moveAssessmentSchema = z
  .object({
    id: z.string().uuid(),
    gameId: z.string().uuid(),
    ply: z.number().int().positive(),
    evaluationBefore: evaluationSchema,
    evaluationAfter: evaluationSchema,
    centipawnLoss: z.number().nonnegative().optional(),
    classification: moveClassificationSchema,
    candidateBrilliant: z.boolean(),
    brilliantDecision: brilliantDecisionSchema.optional(),
    confidence: z.enum(["low", "medium", "high"]),
    caveat: z.string().optional(),
    engineVersion: z.string().min(1),
    engineConfiguration: engineConfigurationSchema,
    depth: z.number().int().nonnegative(),
    threats: z.array(threatSchema).optional(),
    createdAt: z.string().min(1),
    schemaVersion: z.number().int().positive(),
  })
  .strict();

export const openingMatchSchema = z
  .object({
    eco: z.string().min(1),
    name: z.string().min(1),
    epd: z.string().min(1),
    ply: z.number().int().nonnegative(),
  })
  .strict();

export const gamePhaseSchema = z
  .object({
    phase: z.enum(["opening", "middlegame", "endgame"]),
    startPly: z.number().int().nonnegative(),
    endPly: z.number().int().nonnegative(),
  })
  .strict();

export const criticalMomentSchema = z
  .object({
    ply: z.number().int().positive(),
    san: z.string().min(1),
    classification: z.union([
      moveClassificationSchema,
      z.literal("candidate-brilliant"),
      z.literal("brilliant"),
    ]),
    centipawnLoss: z.number().nonnegative().optional(),
    mateTransition: z.string().optional(),
    reason: z.string().min(1),
  })
  .strict();

export type Evaluation = z.infer<typeof evaluationSchema>;
export type EngineConfiguration = z.infer<typeof engineConfigurationSchema>;
export type PrincipalVariation = z.infer<typeof principalVariationSchema>;
export type PositionAnalysis = z.infer<typeof positionAnalysisSchema>;
export type MoveClassification = z.infer<typeof moveClassificationSchema>;
export type BrilliantDecision = z.infer<typeof brilliantDecisionSchema>;
export type Threat = z.infer<typeof threatSchema>;
export type MoveAssessment = z.infer<typeof moveAssessmentSchema>;
export type OpeningMatch = z.infer<typeof openingMatchSchema>;
export type GamePhase = z.infer<typeof gamePhaseSchema>;
export type CriticalMoment = z.infer<typeof criticalMomentSchema>;

export type DisplayMoveClassification =
  | MoveClassification
  | "candidate-brilliant"
  | "brilliant";

export type AnalysisPerspective = "white" | "side-to-move";

export interface GameSummary {
  gameId: string;
  white: string;
  black: string;
  result: string;
  termination?: string;
  opening: OpeningMatch | null;
  phases: GamePhase[];
  moveCount: number;
  classificationCounts: Record<MoveClassification, number>;
  candidateBrilliantCount: number;
  acceptedBrilliantCount: number;
  majorEvalSwings: CriticalMoment[];
  criticalMoments: CriticalMoment[];
  notableThreats: Threat[];
  engineVersion: string;
  depth: number;
  multiPv: number;
  limitLabel: string;
  caveats: string[];
  text: string;
}

export const DEFAULT_ENGINE_CONFIGURATION: EngineConfiguration = {
  depth: 14,
  multiPv: 3,
  threads: 1,
  hashMb: 32,
  perspective: "white",
};

export function displayMoveClassification(
  assessment: Pick<
    MoveAssessment,
    "classification" | "candidateBrilliant" | "brilliantDecision"
  >,
): DisplayMoveClassification {
  if (assessment.brilliantDecision === "accepted") return "brilliant";
  if (
    assessment.candidateBrilliant &&
    assessment.brilliantDecision !== "rejected"
  ) {
    return "candidate-brilliant";
  }
  return assessment.classification;
}
