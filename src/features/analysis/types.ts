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
    score: evaluationSchema,
    bestMoveUci: z.string().optional(),
    principalVariations: z.array(principalVariationSchema),
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
  "candidate-brilliant",
]);

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
    confidence: z.enum(["low", "medium", "high"]),
    caveat: z.string().optional(),
    createdAt: z.string().min(1),
    schemaVersion: z.number().int().positive(),
  })
  .strict();

export type Evaluation = z.infer<typeof evaluationSchema>;
export type EngineConfiguration = z.infer<typeof engineConfigurationSchema>;
export type PrincipalVariation = z.infer<typeof principalVariationSchema>;
export type PositionAnalysis = z.infer<typeof positionAnalysisSchema>;
export type MoveClassification = z.infer<typeof moveClassificationSchema>;
export type MoveAssessment = z.infer<typeof moveAssessmentSchema>;

export const DEFAULT_ENGINE_CONFIGURATION: EngineConfiguration = {
  depth: 14,
  multiPv: 3,
  threads: 1,
  hashMb: 32,
  perspective: "white",
};
