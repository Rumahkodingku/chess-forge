import { z } from "zod";

export const gameSourceSchema = z.enum([
  "pgn-text",
  "pgn-file",
  "chesscom",
  "lichess",
]);

export const gameMetadataSchema = z
  .object({
    white: z.string(),
    black: z.string(),
    result: z.string(),
    event: z.string().optional(),
    site: z.string().optional(),
    date: z.string().optional(),
    round: z.string().optional(),
    timeControl: z.string().optional(),
    eco: z.string().optional(),
    opening: z.string().optional(),
    whiteElo: z.number().int().positive().optional(),
    blackElo: z.number().int().positive().optional(),
    termination: z.string().optional(),
  })
  .strict();

export const moveSchema = z
  .object({
    ply: z.number().int().positive(),
    fullMoveNumber: z.number().int().positive(),
    color: z.enum(["w", "b"]),
    san: z.string().min(1),
    uci: z.string().min(4).max(5),
    fenBefore: z.string().min(1),
    fenAfter: z.string().min(1),
    comment: z.string().optional(),
    nags: z.array(z.number().int()).optional(),
    variations: z.array(z.string()).optional(),
  })
  .strict();

export const gameSchema = z
  .object({
    id: z.string().uuid(),
    source: gameSourceSchema,
    sourceReference: z.string().optional(),
    metadata: gameMetadataSchema,
    initialFen: z.string().min(1),
    moves: z.array(moveSchema),
    originalPgn: z.string(),
    importStatus: z.enum(["valid", "valid-with-warnings", "invalid"]),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    schemaVersion: z.number().int().positive(),
  })
  .strict();

export type GameSource = z.infer<typeof gameSourceSchema>;
export type GameMetadata = z.infer<typeof gameMetadataSchema>;
export type Move = z.infer<typeof moveSchema>;
export type Game = z.infer<typeof gameSchema>;

export const gameListSchema = z.array(gameSchema);
