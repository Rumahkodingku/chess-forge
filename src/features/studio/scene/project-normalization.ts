import { z } from "zod";
import {
  normalizeSceneStartFrames,
  sceneMinimumFrames,
} from "@/features/studio/rendering/timeline";
import {
  type Annotation,
  type AudioTrack,
  annotationSchema,
  audioTrackSchema,
  type CameraKeyframe,
  cameraKeyframeSchema,
  canvasSettingsSchema,
  effectsSchema,
  gameSnapshotSchema,
  type Scene,
  type SourceContext,
  type SourceSelection,
  sceneAudioEventSchema,
  sceneSchema,
  sourceContextSchema,
  sourceSelectionSchema,
  type TemplateSnapshot,
  type TextOverlay,
  templateSnapshotSchema,
  textOverlaySchema,
  type VideoProject,
  videoProjectSchema,
} from "@/features/studio/scene/scene.types";
import { ValidationError } from "@/lib/errors";

const legacyCameraSchema = z
  .object({
    zoom: z.number().positive(),
    x: z.number(),
    y: z.number(),
  })
  .strict();

const legacyAnnotationSchema = z
  .object({
    type: z.enum(["arrow", "square", "highlight"]),
    from: z.string().optional(),
    to: z.string().optional(),
    square: z.string().optional(),
    color: z.string(),
  })
  .passthrough();

const legacyTextSchema = z
  .object({
    id: z.string(),
    kind: z.enum(["title", "move-label", "explanation", "caption"]),
    text: z.string(),
    position: z.enum(["top", "bottom", "left", "right"]),
    startFrame: z.number().int().nonnegative(),
    durationInFrames: z.number().int().positive(),
  })
  .passthrough();

const legacyAudioReferenceSchema = z
  .object({
    assetId: z.string(),
    startFrame: z.number().int().nonnegative(),
    durationInFrames: z.number().int().positive(),
    volume: z.number().min(0).max(1),
  })
  .strict();

const rawProjectSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    sourceGameId: z.string().uuid().optional(),
    templateId: z.string().min(1),
    projectVersion: z.number().int().positive().optional(),
    canvas: canvasSettingsSchema,
    frameRate: z.union([z.literal(30), z.literal(60)]),
    scenes: z.array(z.unknown()),
    gameSnapshot: z.unknown().optional(),
    template: z.unknown().optional(),
    sourceSelection: z.unknown().optional(),
    sourceContext: z.unknown().optional(),
    tracks: z
      .object({
        text: z.array(z.string()),
        annotation: z.array(z.string()),
        audio: z.array(z.string()),
      })
      .strict()
      .optional(),
    audioTracks: z.array(z.unknown()).optional(),
    assets: z
      .array(
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
      )
      .default([]),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    schemaVersion: z.number().int().positive().optional(),
  })
  .passthrough();

const rawSceneSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(["intro", "move", "analysis", "recap", "outro"]),
    startFrame: z.number().int().nonnegative().optional(),
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
        theme: z.enum(["forge", "classic"]).optional(),
        coordinates: z.boolean().optional(),
      })
      .passthrough(),
    timing: z.unknown().optional(),
    camera: z.unknown(),
    annotations: z.array(z.unknown()).optional(),
    textOverlays: z.array(z.unknown()).optional(),
    effects: z.unknown().optional(),
    focusSquares: z.array(z.string()).optional(),
    audioEvents: z.array(z.unknown()).optional(),
    audioReferences: z.array(z.unknown()).optional(),
    overrides: z.record(z.string(), z.unknown()).optional(),
    schemaVersion: z.number().int().positive().optional(),
  })
  .passthrough();

function colorToken(value: string): Annotation["color"] {
  return value === "red" ||
    value === "green" ||
    value === "blue" ||
    value === "white"
    ? value
    : "brand";
}

function normalizeAnnotations(
  raw: unknown[] | undefined,
  durationInFrames: number,
): Annotation[] {
  const annotations: Annotation[] = [];
  for (const value of raw ?? []) {
    const parsed = legacyAnnotationSchema.safeParse(value);
    if (!parsed.success) continue;
    const annotation = {
      id:
        typeof (value as { id?: unknown }).id === "string"
          ? (value as { id: string }).id
          : `legacy-${annotations.length}`,
      type: parsed.data.type,
      from: parsed.data.from,
      to: parsed.data.to,
      square: parsed.data.square,
      color: colorToken(parsed.data.color),
      startFrame: 0,
      durationInFrames,
    };
    const v2 = annotationSchema.safeParse({
      ...annotation,
      startFrame:
        (value as { startFrame?: number }).startFrame ?? annotation.startFrame,
      durationInFrames:
        (value as { durationInFrames?: number }).durationInFrames ??
        annotation.durationInFrames,
      opacity: (value as { opacity?: number }).opacity,
    });
    if (v2.success) {
      const startFrame = v2.data.startFrame;
      if (startFrame >= durationInFrames) continue;
      annotations.push({
        ...v2.data,
        durationInFrames: Math.min(
          v2.data.durationInFrames,
          durationInFrames - startFrame,
        ),
      });
    }
  }
  return annotations;
}

function textStyleForKind(
  kind: TextOverlay["kind"],
): Pick<TextOverlay, "font" | "fontSize" | "color" | "align" | "maxWidth"> {
  if (kind === "title") {
    return {
      font: "display",
      fontSize: 64,
      color: "foreground",
      align: "center",
      maxWidth: 80,
    };
  }
  if (kind === "explanation") {
    return {
      font: "body",
      fontSize: 32,
      color: "muted",
      align: "left",
      maxWidth: 80,
    };
  }
  if (kind === "caption") {
    return {
      font: "body",
      fontSize: 24,
      color: "foreground",
      align: "center",
      maxWidth: 80,
    };
  }
  return {
    font: "display",
    fontSize: 64,
    color: "foreground",
    align: "center",
    maxWidth: 80,
  };
}

function normalizeTextOverlays(
  raw: unknown[] | undefined,
  durationInFrames: number,
): TextOverlay[] {
  const overlays: TextOverlay[] = [];
  for (const value of raw ?? []) {
    const v2 = textOverlaySchema.safeParse(value);
    if (v2.success) {
      if (v2.data.startFrame >= durationInFrames) continue;
      overlays.push({
        ...v2.data,
        durationInFrames: Math.min(
          v2.data.durationInFrames,
          durationInFrames - v2.data.startFrame,
        ),
      });
      continue;
    }
    const parsed = legacyTextSchema.safeParse(value);
    if (!parsed.success) continue;
    if (parsed.data.startFrame >= durationInFrames) continue;
    const style = textStyleForKind(parsed.data.kind);
    const overlay = textOverlaySchema.safeParse({
      ...parsed.data,
      durationInFrames: Math.min(
        parsed.data.durationInFrames,
        durationInFrames - parsed.data.startFrame,
      ),
      ...style,
      position:
        parsed.data.position === "top" ||
        parsed.data.position === "bottom" ||
        parsed.data.position === "left" ||
        parsed.data.position === "right" ||
        parsed.data.position === "center"
          ? parsed.data.position
          : "bottom",
      x: 0,
      y: 0,
      background: false,
    });
    if (overlay.success) overlays.push(overlay.data);
  }
  return overlays;
}

function legacyTiming(
  durationInFrames: number,
  moveCount: number,
): {
  leadInFrames: number;
  moveDurationFrames: number;
  gapFrames: number;
  holdFrames: number;
  easing: "easeInOut";
} {
  const leadInFrames = Math.min(10, Math.max(0, durationInFrames - 1));
  const gapFrames = 0;
  let moveDurationFrames = 45;
  let holdFrames = Math.max(0, durationInFrames - 55);
  const minimum =
    leadInFrames +
    (moveCount > 0 ? moveCount * moveDurationFrames : 0) +
    holdFrames;
  if (minimum > durationInFrames && moveCount > 0) {
    moveDurationFrames = Math.max(
      1,
      Math.floor((durationInFrames - leadInFrames) / moveCount),
    );
    holdFrames = Math.max(
      0,
      durationInFrames - leadInFrames - moveCount * moveDurationFrames,
    );
  }
  return {
    leadInFrames,
    moveDurationFrames,
    gapFrames,
    holdFrames,
    easing: "easeInOut",
  };
}

function normalizeCamera(
  value: unknown,
  durationInFrames: number,
): { keyframes: CameraKeyframe[] } {
  const container = z
    .object({ keyframes: z.array(z.unknown()) })
    .passthrough()
    .safeParse(value);
  if (container.success) {
    const parsedKeyframes = container.data.keyframes.map((keyframe) =>
      cameraKeyframeSchema.safeParse(keyframe),
    );
    const keyframes = parsedKeyframes
      .filter((result) => result.success)
      .map((result) => result.data);
    if (keyframes.length < parsedKeyframes.length) {
      console.warn(
        `Skipped ${parsedKeyframes.length - keyframes.length} invalid camera keyframe(s).`,
      );
    }
    return { keyframes };
  }
  const legacy = legacyCameraSchema.safeParse(value);
  if (legacy.success) {
    return {
      keyframes: [
        {
          frame: 0,
          zoom: legacy.data.zoom,
          x: legacy.data.x,
          y: legacy.data.y,
          easing: "easeInOut",
        },
        {
          frame: Math.max(0, durationInFrames - 1),
          zoom: legacy.data.zoom,
          x: legacy.data.x,
          y: legacy.data.y,
          easing: "easeInOut",
        },
      ],
    };
  }
  return { keyframes: [] };
}

function normalizeScene(value: unknown): Scene {
  const raw = rawSceneSchema.parse(value);
  const durationInFrames = raw.durationInFrames;
  const moveCount = raw.moveRange
    ? Math.max(0, raw.moveRange.toPly - raw.moveRange.fromPly + 1)
    : 0;
  const timing =
    raw.schemaVersion === 2 && raw.timing
      ? raw.timing
      : legacyTiming(durationInFrames, moveCount);
  const effects = effectsSchema.safeParse(raw.effects).success
    ? effectsSchema.parse(raw.effects)
    : {
        lastMoveHighlight: true,
        checkIndicator: true,
        captureEmphasis: true,
        checkmateEmphasis: true,
        glow: false,
        focus: false,
      };
  const audioEvents = raw.audioEvents?.length
    ? raw.audioEvents
        .map((event) => sceneAudioEventSchema.safeParse(event))
        .filter((result) => result.success)
        .map((result) => result.data)
    : raw.schemaVersion === 2
      ? []
      : raw.moveRange
        ? [
            {
              id: `legacy-${raw.id}-move`,
              trigger: "move" as const,
              frameOffset: 0,
              volume: 0.5,
              muted: false,
            },
          ]
        : [];

  const candidate = {
    id: raw.id,
    type: raw.type,
    startFrame: raw.startFrame ?? 0,
    durationInFrames,
    moveRange: raw.moveRange,
    boardState: {
      fen: raw.boardState.fen,
      orientation: raw.boardState.orientation,
      theme: raw.boardState.theme ?? "forge",
      coordinates: raw.boardState.coordinates ?? true,
    },
    timing,
    camera: normalizeCamera(raw.camera, durationInFrames),
    annotations: normalizeAnnotations(raw.annotations, durationInFrames),
    textOverlays: normalizeTextOverlays(raw.textOverlays, durationInFrames),
    effects,
    focusSquares: raw.focusSquares ?? [],
    audioEvents,
    overrides: raw.overrides ?? {},
    schemaVersion: 2 as const,
  };

  const scene = sceneSchema.parse(candidate);
  const minimum = sceneMinimumFrames(scene);
  if (scene.durationInFrames < minimum) {
    throw new ValidationError(
      `Scene ${scene.id} is shorter than its move timing allows.`,
      "Increase the scene duration or reduce the move duration.",
    );
  }
  return scene;
}

function legacyAudioTracks(
  rawScenes: unknown[],
  scenes: Scene[],
): AudioTrack[] {
  const tracks: AudioTrack[] = [];
  for (const [sceneIndex, rawScene] of rawScenes.entries()) {
    const parsed = rawSceneSchema.safeParse(rawScene);
    if (!parsed.success) continue;
    const scene = scenes[sceneIndex];
    if (!scene) continue;
    for (const [index, rawReference] of (
      parsed.data.audioReferences ?? []
    ).entries()) {
      const reference = legacyAudioReferenceSchema.safeParse(rawReference);
      if (!reference.success) continue;
      tracks.push({
        id: `legacy-${scene.id}-audio-${index}`,
        kind: "sfx",
        source: { type: "asset", assetId: reference.data.assetId },
        startFrame: scene.startFrame + reference.data.startFrame,
        durationInFrames: reference.data.durationInFrames,
        volume: reference.data.volume,
        muted: false,
        loop: false,
      });
    }
  }
  return tracks;
}

function normalizeTemplateSnapshot(value: unknown): TemplateSnapshot | null {
  if (value === undefined || value === null) return null;
  const parsed = templateSnapshotSchema.safeParse(value);
  if (!parsed.success) {
    console.warn(
      "Project template snapshot is invalid; template reset is disabled.",
    );
    return null;
  }
  return parsed.data;
}

function normalizeSourceSelection(value: unknown): SourceSelection | undefined {
  if (value === undefined) return undefined;
  const parsed = sourceSelectionSchema.safeParse(value);
  if (!parsed.success) {
    console.warn(
      "Project source selection is invalid; regeneration is disabled.",
    );
    return undefined;
  }
  return parsed.data;
}

function normalizeSourceContext(value: unknown): SourceContext | undefined {
  if (value === undefined) return undefined;
  const parsed = sourceContextSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function normalizeProject(input: unknown): VideoProject {
  const raw = rawProjectSchema.parse(input);
  const rawScenes = raw.scenes;
  const gameSnapshot = raw.gameSnapshot
    ? gameSnapshotSchema.parse(raw.gameSnapshot)
    : undefined;
  const scenes = normalizeSceneStartFrames(rawScenes.map(normalizeScene)).map(
    (scene) => {
      if (!scene.moveRange || !gameSnapshot) return scene;
      const firstMove = gameSnapshot.moves[scene.moveRange.fromPly - 1];
      const rangeInvalid =
        scene.moveRange.toPly < scene.moveRange.fromPly ||
        scene.moveRange.toPly > gameSnapshot.moves.length ||
        !firstMove;
      if (rangeInvalid) {
        throw new ValidationError(
          `Scene ${scene.id} has a move range outside the game snapshot.`,
          "Edit the scene range or re-import the game.",
        );
      }
      return {
        ...scene,
        boardState: { ...scene.boardState, fen: firstMove.fenBefore },
      };
    },
  );
  const audioTracks = raw.audioTracks
    ? raw.audioTracks.map((track) => audioTrackSchema.parse(track))
    : legacyAudioTracks(rawScenes, scenes);

  const template = normalizeTemplateSnapshot(raw.template);
  const sourceSelection = normalizeSourceSelection(raw.sourceSelection);
  const sourceContext = normalizeSourceContext(raw.sourceContext);

  const project = {
    id: raw.id,
    name: raw.name,
    sourceGameId: raw.sourceGameId,
    templateId: template?.id ?? raw.templateId,
    projectVersion: 3 as const,
    template,
    sourceSelection,
    sourceContext,
    canvas: raw.canvas,
    frameRate: raw.frameRate,
    scenes,
    gameSnapshot,
    tracks: raw.tracks ?? { text: [], annotation: [], audio: [] },
    audioTracks,
    assets: raw.assets,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    schemaVersion: 3 as const,
  };

  return videoProjectSchema.parse(project);
}
