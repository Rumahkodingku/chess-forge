import { z } from "zod";

export const aspectRatioSchema = z.enum(["9:16", "16:9", "1:1", "4:5"]);

export const canvasSettingsSchema = z
  .object({
    aspectRatio: aspectRatioSchema,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();

export const sceneTypeSchema = z.enum([
  "intro",
  "move",
  "analysis",
  "recap",
  "outro",
]);

export const sceneSchema = z
  .object({
    id: z.string().uuid(),
    type: sceneTypeSchema,
    startFrame: z.number().int().nonnegative(),
    durationInFrames: z.number().int().positive(),
    moveRange: z
      .object({
        fromPly: z.number().int().positive(),
        toPly: z.number().int().positive(),
      })
      .strict()
      .optional(),
    boardState: z
      .object({
        fen: z.string().min(1),
        orientation: z.enum(["w", "b"]),
        lastMove: z.string().optional(),
      })
      .strict(),
    camera: z
      .object({
        zoom: z.number().positive(),
        x: z.number(),
        y: z.number(),
      })
      .strict(),
    annotations: z.array(
      z
        .object({
          type: z.enum(["arrow", "square", "highlight"]),
          from: z.string().optional(),
          to: z.string().optional(),
          square: z.string().optional(),
          color: z.string(),
        })
        .strict(),
    ),
    textOverlays: z.array(
      z
        .object({
          id: z.string().uuid(),
          kind: z.enum(["title", "move-label", "explanation", "caption"]),
          text: z.string(),
          position: z.enum(["top", "bottom", "left", "right"]),
          startFrame: z.number().int().nonnegative(),
          durationInFrames: z.number().int().positive(),
        })
        .strict(),
    ),
    effects: z
      .object({
        lastMoveHighlight: z.boolean(),
        checkIndicator: z.boolean(),
        captureEmphasis: z.boolean(),
        glow: z.boolean(),
      })
      .strict(),
    audioReferences: z.array(
      z
        .object({
          assetId: z.string().uuid(),
          startFrame: z.number().int().nonnegative(),
          durationInFrames: z.number().int().positive(),
          volume: z.number().min(0).max(1),
        })
        .strict(),
    ),
    overrides: z.record(z.string(), z.unknown()),
    schemaVersion: z.number().int().positive(),
  })
  .strict();

export const videoProjectSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    sourceGameId: z.string().uuid().optional(),
    templateId: z.string().min(1),
    projectVersion: z.number().int().positive(),
    canvas: canvasSettingsSchema,
    frameRate: z.union([z.literal(30), z.literal(60)]),
    scenes: z.array(sceneSchema),
    tracks: z
      .object({
        text: z.array(z.string()),
        annotation: z.array(z.string()),
        audio: z.array(z.string()),
      })
      .strict(),
    assets: z.array(
      z
        .object({
          id: z.string().uuid(),
          kind: z.enum(["audio", "image"]),
          mimeType: z.string(),
          size: z.number().int().nonnegative(),
          hash: z.string(),
          createdAt: z.string().min(1),
        })
        .strict(),
    ),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    schemaVersion: z.number().int().positive(),
  })
  .strict();

export type AspectRatio = z.infer<typeof aspectRatioSchema>;
export type CanvasSettings = z.infer<typeof canvasSettingsSchema>;
export type SceneType = z.infer<typeof sceneTypeSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type VideoProject = z.infer<typeof videoProjectSchema>;
