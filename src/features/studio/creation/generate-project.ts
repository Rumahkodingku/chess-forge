import type { GameSummary } from "@/features/analysis/types";
import type { Game } from "@/features/games/types";
import {
  referenceFromMoment,
  type SourceBlock,
  selectSourcePlies,
} from "@/features/studio/creation/source-selection";
import { focusCameraKeyframe } from "@/features/studio/rendering/camera";
import {
  moveFrameMap,
  sceneMinimumFrames,
} from "@/features/studio/rendering/timeline";
import type {
  Annotation,
  CriticalMomentReference,
  Scene,
  SourceContext,
  SourceSelection,
  TemplateSnapshot,
  TemplateTextStyle,
  TextOverlay,
  VideoProject,
} from "@/features/studio/scene/scene.types";
import { videoProjectSchema } from "@/features/studio/scene/scene.types";
import { toTemplateSnapshot } from "@/features/templates/snapshot";
import type { Template } from "@/features/templates/types";
import { createId } from "@/lib/id";

export interface GenerateProjectInput {
  game: Game;
  summary?: GameSummary | null;
  template: Template;
  selection: SourceSelection;
}

export interface GenerateScenesInput extends GenerateProjectInput {
  snapshot: TemplateSnapshot;
  context: SourceContext;
}

const TOKEN_PATTERN =
  /\{(white|black|result|opening|eco|san|moveNumber|classification|reason|plyCount)\}/g;

interface TokenValues {
  white: string;
  black: string;
  result: string;
  opening: string;
  eco: string;
  san: string;
  moveNumber: string;
  classification: string;
  reason: string;
  plyCount: string;
}

function tokenValues(
  game: Game,
  context: SourceContext,
  move?: CriticalMomentReference,
): TokenValues {
  return {
    white: game.metadata.white,
    black: game.metadata.black,
    result: game.metadata.result,
    opening: context.opening?.name ?? "Unknown opening",
    eco: context.opening?.eco ?? "",
    san: move?.san ?? "",
    moveNumber: move?.ply
      ? `${Math.ceil(move.ply / 2)}${move.ply % 2 === 1 ? "." : "..."}`
      : "",
    classification: move?.classification ?? "",
    reason: move?.reason ?? "",
    plyCount: String(game.moves.length),
  };
}

export function renderTemplateText(text: string, values: TokenValues): string {
  return text.replace(
    TOKEN_PATTERN,
    (_match, token: keyof TokenValues) => values[token],
  );
}

function overlay(
  style: TemplateTextStyle,
  input: {
    kind: TextOverlay["kind"];
    text: string;
    startFrame: number;
    durationInFrames: number;
  },
): TextOverlay {
  return {
    id: createId(),
    kind: input.kind,
    text: input.text,
    ...style,
    startFrame: input.startFrame,
    durationInFrames: input.durationInFrames,
  };
}

function moveLabel(move: Game["moves"][number]): string {
  return `${move.fullMoveNumber}${move.color === "w" ? "." : "..."} ${move.san}`;
}

function blockDuration(block: SourceBlock, snapshot: TemplateSnapshot): number {
  const moveCount = block.toPly - block.fromPly + 1;
  const timing = snapshot.style.timing;
  return Math.max(
    1,
    timing.leadInFrames +
      moveCount * timing.moveDurationFrames +
      Math.max(0, moveCount - 1) * timing.gapFrames +
      timing.holdFrames,
  );
}

function cameraForMoveScene(
  block: SourceBlock,
  durationInFrames: number,
  snapshot: TemplateSnapshot,
  game: Game,
): Scene["camera"] {
  const timing = snapshot.style.timing;
  const camera = snapshot.style.camera;
  const keyframes: Scene["camera"]["keyframes"] = [
    {
      frame: 0,
      zoom: camera.sceneZoom,
      x: 0,
      y: 0,
      easing: camera.easing,
    },
  ];
  if (camera.focusActiveMove) {
    for (let index = 0; index < block.toPly - block.fromPly + 1; index += 1) {
      const move = game.moves[block.fromPly - 1 + index];
      if (!move) continue;
      const frame =
        timing.leadInFrames +
        index * (timing.moveDurationFrames + timing.gapFrames) +
        Math.floor(timing.moveDurationFrames / 2);
      keyframes.push({
        ...focusCameraKeyframe(move.uci.slice(2, 4), frame, camera.sceneZoom),
        easing: camera.easing,
      });
    }
  }
  keyframes.push({
    frame: Math.max(1, durationInFrames - 1),
    zoom: 1,
    x: 0,
    y: 0,
    easing: camera.easing,
  });
  return { keyframes };
}

function moveTextOverlays(
  block: SourceBlock,
  durationInFrames: number,
  snapshot: TemplateSnapshot,
  game: Game,
  context: SourceContext,
): TextOverlay[] {
  const overlays: TextOverlay[] = [];
  const timing = snapshot.style.timing;
  const moveCount = block.toPly - block.fromPly + 1;
  for (let index = 0; index < moveCount; index += 1) {
    const move = game.moves[block.fromPly - 1 + index];
    if (!move) continue;
    const startFrame =
      timing.leadInFrames +
      index * (timing.moveDurationFrames + timing.gapFrames);
    const endFrame =
      index === moveCount - 1
        ? durationInFrames
        : startFrame + timing.moveDurationFrames + timing.gapFrames;
    overlays.push(
      overlay(snapshot.style.text.moveLabel, {
        kind: "move-label",
        text: renderTemplateText(
          moveLabel(move),
          tokenValues(game, context, {
            ply: move.ply,
            san: move.san,
          }),
        ),
        startFrame,
        durationInFrames: Math.max(1, endFrame - startFrame),
      }),
    );
  }

  if (block.moment) {
    const moment = block.moment;
    const text =
      moment.reason ||
      [moment.classification, moment.san].filter(Boolean).join(": ");
    overlays.push(
      overlay(snapshot.style.text.explanation, {
        kind: "explanation",
        text: renderTemplateText(text, tokenValues(game, context, moment)),
        startFrame: 0,
        durationInFrames,
      }),
    );
  }
  return overlays;
}

function annotationsForBlock(
  block: SourceBlock,
  durationInFrames: number,
  snapshot: TemplateSnapshot,
  game: Game,
  templateId: string,
): Annotation[] {
  if (!block.moment) return [];
  if (
    templateId !== "tactical-breakdown" &&
    templateId !== "brilliant-move" &&
    templateId !== "game-recap"
  ) {
    return [];
  }
  const move = game.moves[block.moment.ply - 1];
  if (!move) return [];
  const index = move.ply - block.fromPly;
  const timing = snapshot.style.timing;
  const startFrame =
    timing.leadInFrames +
    Math.max(0, index) * (timing.moveDurationFrames + timing.gapFrames);
  return [
    {
      id: createId(),
      type: "arrow",
      from: move.uci.slice(0, 2),
      to: move.uci.slice(2, 4),
      color: templateId === "brilliant-move" ? "brand" : "red",
      startFrame,
      durationInFrames: Math.max(1, durationInFrames - startFrame),
    },
  ];
}

function sceneAudio(snapshot: TemplateSnapshot, sceneId: string) {
  return snapshot.style.audio.sceneSfx.map((event, index) => ({
    ...event,
    id: `${sceneId}-sfx-${index}`,
  }));
}

function baseScene(
  snapshot: TemplateSnapshot,
  input: {
    type: Scene["type"];
    durationInFrames: number;
    fen: string;
    moveRange?: Scene["moveRange"];
  },
): Scene {
  return {
    id: createId(),
    type: input.type,
    startFrame: 0,
    durationInFrames: input.durationInFrames,
    moveRange: input.moveRange,
    boardState: {
      fen: input.fen,
      orientation: "w",
      theme: snapshot.style.boardTheme,
      coordinates: snapshot.style.coordinates,
    },
    timing: snapshot.style.timing,
    camera: { keyframes: [] },
    annotations: [],
    textOverlays: [],
    effects: snapshot.style.effects,
    focusSquares: [],
    audioEvents: [],
    overrides: {},
    schemaVersion: 2,
  };
}

function introScene(
  snapshot: TemplateSnapshot,
  game: Game,
  context: SourceContext,
  templateId: string,
): Scene {
  const durationInFrames = Math.max(
    snapshot.sceneRules.introDurationInFrames,
    snapshot.style.timing.leadInFrames + snapshot.style.timing.holdFrames,
  );
  const scene = baseScene(snapshot, {
    type: "intro",
    durationInFrames,
    fen: game.initialFen,
  });
  const titleText =
    templateId === "opening-tutorial" && context.opening
      ? `${context.opening.name} (${context.opening.eco})`
      : `${game.metadata.white} vs ${game.metadata.black}`;
  const captionText =
    templateId === "opening-tutorial"
      ? `${game.metadata.result}`
      : (context.opening?.name ?? "ChessForge");
  scene.textOverlays = [
    overlay(snapshot.style.text.title, {
      kind: "title",
      text: renderTemplateText(titleText, tokenValues(game, context)),
      startFrame: 0,
      durationInFrames,
    }),
    overlay(snapshot.style.text.caption, {
      kind: "caption",
      text: renderTemplateText(captionText, tokenValues(game, context)),
      startFrame: 0,
      durationInFrames,
    }),
  ];
  scene.camera = {
    keyframes: [
      {
        frame: 0,
        zoom: snapshot.style.camera.introZoom,
        x: 0,
        y: 0,
        easing: snapshot.style.camera.easing,
      },
      {
        frame: Math.max(1, durationInFrames - 1),
        zoom: 1,
        x: 0,
        y: 0,
        easing: snapshot.style.camera.easing,
      },
    ],
  };
  return scene;
}

function outroScene(
  snapshot: TemplateSnapshot,
  game: Game,
  context: SourceContext,
): Scene {
  const durationInFrames = Math.max(
    snapshot.sceneRules.outroDurationInFrames,
    snapshot.style.timing.leadInFrames + snapshot.style.timing.holdFrames,
  );
  const finalMove = game.moves.at(-1);
  const scene = baseScene(snapshot, {
    type: "outro",
    durationInFrames,
    fen: finalMove?.fenAfter ?? game.initialFen,
  });
  scene.textOverlays = [
    overlay(snapshot.style.text.title, {
      kind: "title",
      text: renderTemplateText(
        `{white} vs {black}`,
        tokenValues(game, context),
      ),
      startFrame: 0,
      durationInFrames,
    }),
    overlay(snapshot.style.text.caption, {
      kind: "caption",
      text: renderTemplateText(
        `Result {result} · {opening}`,
        tokenValues(game, context),
      ),
      startFrame: 0,
      durationInFrames,
    }),
  ];
  return scene;
}

function moveScene(
  block: SourceBlock,
  snapshot: TemplateSnapshot,
  game: Game,
  context: SourceContext,
): Scene {
  const durationInFrames = blockDuration(block, snapshot);
  const firstMove = game.moves[block.fromPly - 1];
  const scene = baseScene(snapshot, {
    type: block.moment ? "analysis" : "move",
    durationInFrames,
    fen: firstMove?.fenBefore ?? game.initialFen,
    moveRange: { fromPly: block.fromPly, toPly: block.toPly },
  });
  scene.camera = cameraForMoveScene(block, durationInFrames, snapshot, game);
  scene.textOverlays = moveTextOverlays(
    block,
    durationInFrames,
    snapshot,
    game,
    context,
  );
  scene.annotations = annotationsForBlock(
    block,
    durationInFrames,
    snapshot,
    game,
    snapshot.id,
  );
  scene.audioEvents = sceneAudio(snapshot, scene.id);
  const momentPly = block.moment?.ply;
  scene.focusSquares =
    block.moment && momentPly
      ? [game.moves[momentPly - 1]?.uci.slice(2, 4) ?? ""].filter(Boolean)
      : [];
  const minimum = sceneMinimumFrames(scene);
  if (scene.durationInFrames < minimum) scene.durationInFrames = minimum;
  return scene;
}

export function generateScenes(input: GenerateScenesInput): Scene[] {
  const { game, selection, snapshot, context } = input;
  const blocks = selectSourcePlies(game, selection, snapshot.sceneRules);
  const scenes: Scene[] = [];
  if (snapshot.sceneRules.includeIntro) {
    scenes.push(introScene(snapshot, game, context, snapshot.id));
  }
  for (const block of blocks) {
    scenes.push(moveScene(block, snapshot, game, context));
  }
  if (snapshot.sceneRules.includeOutro) {
    scenes.push(outroScene(snapshot, game, context));
  }
  let startFrame = 0;
  for (const scene of scenes) {
    scene.startFrame = startFrame;
    startFrame += scene.durationInFrames;
  }
  return scenes;
}

export function sourceContextFromSummary(
  game: Game,
  summary?: GameSummary | null,
  selection?: SourceSelection,
): SourceContext {
  return {
    opening: summary?.opening
      ? { eco: summary.opening.eco, name: summary.opening.name }
      : null,
    result: game.metadata.result,
    criticalMoments:
      selection?.mode === "moments" ? selection.moments : undefined,
  };
}

export function generateProject(input: GenerateProjectInput): VideoProject {
  const snapshot = toTemplateSnapshot(input.template);
  const context = sourceContextFromSummary(
    input.game,
    input.summary,
    input.selection,
  );
  const now = new Date().toISOString();
  const scenes = generateScenes({
    ...input,
    snapshot,
    context,
  });
  const audioTracks = snapshot.style.audio.projectTracks.map(
    (track, index) => ({
      ...track,
      id: `template-${index}-${createId()}`,
    }),
  );
  const project: VideoProject = {
    id: createId(),
    name: `${input.game.metadata.white} vs ${input.game.metadata.black}`,
    sourceGameId: input.game.id,
    templateId: snapshot.id,
    projectVersion: 3,
    template: snapshot,
    sourceSelection: input.selection,
    sourceContext: context,
    canvas: snapshot.defaultCanvas,
    frameRate: snapshot.defaultFrameRate,
    scenes,
    tracks: { text: [], annotation: [], audio: [] },
    audioTracks,
    assets: [],
    gameSnapshot: {
      metadata: input.game.metadata,
      initialFen: input.game.initialFen,
      moves: input.game.moves,
    },
    createdAt: now,
    updatedAt: now,
    schemaVersion: 3,
  };
  return videoProjectSchema.parse(project);
}

export function defaultSelectionForTemplate(
  template: Template,
  summary?: GameSummary | null,
  moveCount = Number.MAX_SAFE_INTEGER,
): SourceSelection {
  const rules = template.sceneRules;
  if (rules.defaultSourceMode === "moments") {
    return {
      mode: "moments",
      moments: (summary?.criticalMoments ?? [])
        .slice(0, 3)
        .map((moment) => referenceFromMoment(moment)),
      leadInPlies: rules.leadInPlies,
      trailInPlies: rules.trailInPlies,
    };
  }
  if (rules.defaultSourceMode === "range") {
    if (template.id === "opening-tutorial") {
      return {
        mode: "range",
        fromPly: 1,
        toPly: Math.min(10, Math.max(1, moveCount)),
      };
    }
    return {
      mode: "range",
      fromPly: Math.max(1, moveCount - 5),
      toPly: Math.max(1, moveCount),
    };
  }
  return { mode: "full" };
}

export function moveFrameForPly(
  scene: Scene,
  ply: number,
): { startFrame: number; endFrame: number } | undefined {
  return moveFrameMap(scene).find((frame) => frame.ply === ply);
}
