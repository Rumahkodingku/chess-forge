import { z } from "zod";

export const libraryNoteTargetTypeSchema = z.enum([
  "opening",
  "position",
  "game",
  "move",
  "article",
  "repertoire",
  "puzzle",
]);

export type LibraryNoteTargetType = z.infer<typeof libraryNoteTargetTypeSchema>;

export const libraryNoteSchema = z
  .object({
    id: z.string().uuid(),
    targetType: libraryNoteTargetTypeSchema,
    targetId: z.string().min(1),
    targetLabel: z.string().min(1),
    body: z.string().trim().min(1).max(20_000),
    tags: z.array(z.string().trim().min(1).max(40)).max(20),
    pinned: z.boolean(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    schemaVersion: z.literal(1),
  })
  .strict();

export type LibraryNote = z.infer<typeof libraryNoteSchema>;

export const repertoirePrioritySchema = z.enum(["core", "secondary", "idea"]);

export type RepertoirePriority = z.infer<typeof repertoirePrioritySchema>;

export const repertoireMoveSchema = z
  .object({
    san: z.string().min(1),
    uci: z.string().min(4).max(5),
    note: z.string().max(2_000).optional(),
  })
  .strict();

export type RepertoireMove = z.infer<typeof repertoireMoveSchema>;

export const repertoireLineSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    side: z.enum(["white", "black"]),
    eco: z.string().max(3).optional(),
    openingName: z.string().max(160).optional(),
    startFen: z.string().min(1),
    moves: z.array(repertoireMoveSchema).min(1).max(80),
    notes: z.string().max(20_000),
    priority: repertoirePrioritySchema,
    tags: z.array(z.string().trim().min(1).max(40)).max(20),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    schemaVersion: z.literal(1),
  })
  .strict();

export type RepertoireLine = z.infer<typeof repertoireLineSchema>;

export const learningItemTypeSchema = z.enum([
  "puzzle",
  "repertoire-line",
  "opening-recall",
  "reference",
  "game-mistake",
]);

export type LearningItemType = z.infer<typeof learningItemTypeSchema>;

export const learningProgressSchema = z
  .object({
    id: z.string().min(1),
    itemType: learningItemTypeSchema,
    itemId: z.string().min(1),
    attempts: z.number().int().nonnegative(),
    correct: z.number().int().nonnegative(),
    streak: z.number().int().nonnegative(),
    intervalDays: z.number().int().nonnegative(),
    nextReviewAt: z.string().min(1),
    lastResult: z.enum(["correct", "incorrect"]).optional(),
    lastReviewedAt: z.string().optional(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    schemaVersion: z.literal(1),
  })
  .strict();

export type LearningProgress = z.infer<typeof learningProgressSchema>;

export function progressId(itemType: LearningItemType, itemId: string): string {
  return `${itemType}:${itemId}`;
}

export const libraryPuzzleSchema = z
  .object({
    id: z.string().min(1),
    fen: z.string().min(1),
    moves: z.array(z.string().min(4).max(5)).min(2),
    rating: z.number().int().min(600).max(2400),
    ratingDeviation: z.number().int().nonnegative(),
    popularity: z.number().int(),
    nbPlays: z.number().int().nonnegative(),
    themes: z.array(z.string().min(1)),
    openingTags: z.array(z.string().min(1)),
    gameUrl: z.string().optional(),
  })
  .strict();

export type LibraryPuzzle = z.infer<typeof libraryPuzzleSchema>;

export const puzzleFileSchema = z
  .object({
    source: z.string().min(1),
    licence: z.string().min(1),
    selectionVersion: z.number().int().positive(),
    count: z.number().int().nonnegative(),
    puzzles: z.array(libraryPuzzleSchema),
  })
  .strict();
