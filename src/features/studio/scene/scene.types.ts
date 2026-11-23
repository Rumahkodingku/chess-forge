import { z } from "zod";
import { gameMetadataSchema, moveSchema } from "@/features/games/types";

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

export const gameSnapshotSchema = z
  .object({
    metadata: gameMetadataSchema,
    initialFen: z.string().min(1),
    moves: z.array(moveSchema),
  })
  .strict();

export const easingSchema = z.enum([
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
]);

export const boardThemeSchema = z.enum(["forge", "classic"]);

export const sceneTimingSchema = z
  .object({
    leadInFrames: z.number().int().nonnegative(),
    moveDurationFrames: z.number().int().positive(),
    gapFrames: z.number().int().nonnegative(),
    holdFrames: z.number().int().nonnegative(),
    easing: easingSchema,
  })
  .strict();

export const boardStateSchema = z
  .object({
    fen: z.string().min(1),
    orientation: z.enum(["w", "b"]),
    theme: boardThemeSchema,
    coordinates: z.boolean(),
  })
  .strict();

export const cameraKeyframeSchema = z
  .object({
    frame: z.number().int().nonnegative(),
    zoom: z.number().min(1).max(3),
    x: z.number(),
    y: z.number(),
    easing: easingSchema,
  })
  .strict();

export const cameraSchema = z
  .object({
    keyframes: z.array(cameraKeyframeSchema),
  })
  .strict();

export const annotationColorSchema = z.enum([
  "brand",
  "red",
  "green",
  "blue",
  "white",
]);

export const annotationSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["arrow", "square", "highlight"]),
    from: z.string().optional(),
    to: z.string().optional(),
    square: z.string().optional(),
    color: annotationColorSchema,
    startFrame: z.number().int().nonnegative(),
    durationInFrames: z.number().int().positive(),
    opacity: z.number().min(0).max(1).optional(),
  })
  .strict();

export const textFontSchema = z.enum(["display", "body", "mono"]);
export const textColorSchema = z.enum([
  "foreground",
  "muted",
  "brand",
  "danger",
]);
export const textAlignSchema = z.enum(["left", "center", "right"]);
export const textPositionSchema = z.enum([
  "top",
  "bottom",
  "left",
  "right",
  "center",
]);

export const textOverlaySchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(["title", "move-label", "explanation", "caption"]),
    text: z.string(),
    font: textFontSchema,
    fontSize: z.number().positive().max(240),
    color: textColorSchema,
    align: textAlignSchema,
    position: textPositionSchema,
    x: z.number(),
    y: z.number(),
    maxWidth: z.number().positive().max(100),
    background: z.boolean(),
    startFrame: z.number().int().nonnegative(),
    durationInFrames: z.number().int().positive(),
  })
  .strict();

export const effectsSchema = z
  .object({
    lastMoveHighlight: z.boolean(),
    checkIndicator: z.boolean(),
    captureEmphasis: z.boolean(),
    checkmateEmphasis: z.boolean(),
    glow: z.boolean(),
    focus: z.boolean(),
  })
  .strict();

export const sceneAudioEventSchema = z
  .object({
    id: z.string().min(1),
    trigger: z.enum(["move", "capture", "check", "checkmate"]),
    frameOffset: z.number().int(),
    volume: z.number().min(0).max(1),
    muted: z.boolean(),
  })
  .strict();

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
    boardState: boardStateSchema,
    timing: sceneTimingSchema,
    camera: cameraSchema,
    annotations: z.array(annotationSchema),
    textOverlays: z.array(textOverlaySchema),
    effects: effectsSchema,
    focusSquares: z.array(z.string()),
    audioEvents: z.array(sceneAudioEventSchema),
    overrides: z.record(z.string(), z.unknown()),
    schemaVersion: z.literal(2),
  })
  .strict();

export const audioSourceSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("builtin"),
      id: z.enum(["move", "capture", "check", "checkmate"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("asset"),
      assetId: z.string().min(1),
    })
    .strict(),
]);

export const audioTrackSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(["music", "sfx"]),
    source: audioSourceSchema,
    startFrame: z.number().int().nonnegative(),
    durationInFrames: z.number().int().positive(),
    volume: z.number().min(0).max(1),
    muted: z.boolean(),
    loop: z.boolean(),
  })
  .strict();

export const templateTextStyleSchema = z
  .object({
    font: textFontSchema,
    fontSize: z.number().positive().max(240),
    color: textColorSchema,
    align: textAlignSchema,
    position: textPositionSchema,
    x: z.number(),
    y: z.number(),
    maxWidth: z.number().positive().max(100),
    background: z.boolean(),
  })
  .strict();

export const templateStyleSchema = z
  .object({
    boardTheme: boardThemeSchema,
    coordinates: z.boolean(),
    effects: effectsSchema,
    camera: z
      .object({
        introZoom: z.number().min(1).max(3),
        sceneZoom: z.number().min(1).max(3),
        focusActiveMove: z.boolean(),
        easing: easingSchema,
      })
      .strict(),
    timing: sceneTimingSchema,
    text: z
      .object({
        title: templateTextStyleSchema,
        moveLabel: templateTextStyleSchema,
        explanation: templateTextStyleSchema,
        caption: templateTextStyleSchema,
      })
      .strict(),
    audio: z
      .object({
        sceneSfx: z.array(sceneAudioEventSchema),
        projectTracks: z.array(audioTrackSchema.omit({ id: true })),
      })
      .strict(),
  })
  .strict();

export const templateSceneRulesSchema = z
  .object({
    defaultSourceMode: z.enum(["full", "moments", "range"]),
    movesPerScene: z.number().int().min(1).max(12),
    includeIntro: z.boolean(),
    includeOutro: z.boolean(),
    introDurationInFrames: z.number().int().positive(),
    outroDurationInFrames: z.number().int().positive(),
    leadInPlies: z.number().int().nonnegative(),
    trailInPlies: z.number().int().nonnegative(),
  })
  .strict();

export const templateSnapshotSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.number().int().positive(),
    description: z.string(),
    defaultCanvas: canvasSettingsSchema,
    defaultFrameRate: z.union([z.literal(30), z.literal(60)]),
    style: templateStyleSchema,
    sceneRules: templateSceneRulesSchema,
  })
  .strict();

export const criticalMomentReferenceSchema = z
  .object({
    ply: z.number().int().positive(),
    san: z.string().min(1),
    classification: z.string().optional(),
    reason: z.string().optional(),
  })
  .strict();

export const sourceSelectionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("full") }).strict(),
  z
    .object({
      mode: z.literal("range"),
      fromPly: z.number().int().positive(),
      toPly: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      mode: z.literal("moments"),
      moments: z.array(criticalMomentReferenceSchema),
      leadInPlies: z.number().int().nonnegative(),
      trailInPlies: z.number().int().nonnegative(),
    })
    .strict(),
]);

export const sourceContextSchema = z
  .object({
    opening: z
      .object({ eco: z.string(), name: z.string() })
      .strict()
      .nullable()
      .optional(),
    result: z.string().optional(),
    criticalMoments: z.array(criticalMomentReferenceSchema).optional(),
  })
  .strict();

export const videoProjectSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    sourceGameId: z.string().uuid().optional(),
    templateId: z.string().min(1),
    projectVersion: z.literal(3),
    template: templateSnapshotSchema.nullable(),
    sourceSelection: sourceSelectionSchema.optional(),
    sourceContext: sourceContextSchema.optional(),
    canvas: canvasSettingsSchema,
    frameRate: z.union([z.literal(30), z.literal(60)]),
    scenes: z.array(sceneSchema),
    gameSnapshot: gameSnapshotSchema.optional(),
    tracks: z
      .object({
        text: z.array(z.string()),
        annotation: z.array(z.string()),
        audio: z.array(z.string()),
      })
      .strict(),
    audioTracks: z.array(audioTrackSchema),
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
    schemaVersion: z.literal(3),
  })
  .strict();

export type AspectRatio = z.infer<typeof aspectRatioSchema>;
export type CanvasSettings = z.infer<typeof canvasSettingsSchema>;
export type SceneType = z.infer<typeof sceneTypeSchema>;
export type EasingName = z.infer<typeof easingSchema>;
export type BoardTheme = z.infer<typeof boardThemeSchema>;
export type SceneTiming = z.infer<typeof sceneTimingSchema>;
export type CameraKeyframe = z.infer<typeof cameraKeyframeSchema>;
export type Annotation = z.infer<typeof annotationSchema>;
export type TextOverlay = z.infer<typeof textOverlaySchema>;
export type Effects = z.infer<typeof effectsSchema>;
export type SceneAudioEvent = z.infer<typeof sceneAudioEventSchema>;
export type AudioTrack = z.infer<typeof audioTrackSchema>;
export type TemplateTextStyle = z.infer<typeof templateTextStyleSchema>;
export type TemplateStyle = z.infer<typeof templateStyleSchema>;
export type TemplateSceneRules = z.infer<typeof templateSceneRulesSchema>;
export type TemplateSnapshot = z.infer<typeof templateSnapshotSchema>;
export type CriticalMomentReference = z.infer<
  typeof criticalMomentReferenceSchema
>;
export type SourceSelection = z.infer<typeof sourceSelectionSchema>;
export type SourceContext = z.infer<typeof sourceContextSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type GameSnapshot = z.infer<typeof gameSnapshotSchema>;
export type VideoProject = z.infer<typeof videoProjectSchema>;
