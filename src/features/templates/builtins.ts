import type {
  Effects,
  SceneAudioEvent,
  SceneTiming,
} from "@/features/studio/scene/scene.types";
import type { Template } from "@/features/templates/types";

const CANVAS = {
  aspectRatio: "9:16" as const,
  width: 1080,
  height: 1920,
};

const TIMESTAMP = "2026-11-23T00:00:00.000Z";

const BASE_TIMING: SceneTiming = {
  leadInFrames: 12,
  moveDurationFrames: 24,
  gapFrames: 6,
  holdFrames: 24,
  easing: "easeInOut",
};

const BASE_EFFECTS: Effects = {
  lastMoveHighlight: true,
  checkIndicator: true,
  captureEmphasis: true,
  checkmateEmphasis: true,
  glow: false,
  focus: false,
};

function textStyle(
  overrides: Partial<Template["style"]["text"]["title"]> = {},
): Template["style"]["text"]["title"] {
  return {
    font: "body",
    fontSize: 32,
    color: "foreground",
    align: "left",
    position: "top",
    x: 0,
    y: 0,
    maxWidth: 80,
    background: false,
    ...overrides,
  };
}

function sfx(
  templateId: string,
  trigger: SceneAudioEvent["trigger"],
  volume: number,
): SceneAudioEvent {
  return {
    id: `${templateId}-sfx-${trigger}`,
    trigger,
    frameOffset: 0,
    volume,
    muted: false,
  };
}

function template(input: {
  id: string;
  name: string;
  description: string;
  previewKey: string;
  defaultSourceMode: Template["sceneRules"]["defaultSourceMode"];
  movesPerScene: number;
  intro: number;
  outro: number;
  leadInPlies?: number;
  trailInPlies?: number;
  timing?: Partial<SceneTiming>;
  effects?: Partial<Effects>;
  boardTheme?: Template["style"]["boardTheme"];
  coordinates?: boolean;
  introZoom: number;
  sceneZoom: number;
  focusActiveMove?: boolean;
  text?: Partial<Template["style"]["text"]>;
  sfxVolume: number;
}): Template {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    version: 1,
    isBuiltIn: true,
    previewKey: input.previewKey,
    defaultCanvas: CANVAS,
    defaultFrameRate: 30,
    style: {
      boardTheme: input.boardTheme ?? "forge",
      coordinates: input.coordinates ?? true,
      effects: { ...BASE_EFFECTS, ...input.effects },
      camera: {
        introZoom: input.introZoom,
        sceneZoom: input.sceneZoom,
        focusActiveMove: input.focusActiveMove ?? true,
        easing: "easeInOut",
      },
      timing: { ...BASE_TIMING, ...input.timing },
      text: {
        title: textStyle({
          font: "display",
          fontSize: 64,
          align: "center",
          position: "center",
          maxWidth: 80,
        }),
        moveLabel: textStyle({
          font: "display",
          fontSize: 56,
          align: "center",
          position: "bottom",
          y: 8,
          maxWidth: 80,
        }),
        explanation: textStyle({
          color: "muted",
          position: "top",
        }),
        caption: textStyle({
          fontSize: 24,
          color: "muted",
          align: "center",
          position: "bottom",
          y: 6,
          maxWidth: 80,
        }),
        ...input.text,
      },
      audio: {
        sceneSfx: [
          sfx(input.id, "move", input.sfxVolume),
          sfx(input.id, "capture", Math.min(1, input.sfxVolume + 0.05)),
          sfx(input.id, "check", Math.min(1, input.sfxVolume + 0.1)),
          sfx(input.id, "checkmate", Math.min(1, input.sfxVolume + 0.15)),
        ],
        projectTracks: [],
      },
    },
    sceneRules: {
      defaultSourceMode: input.defaultSourceMode,
      movesPerScene: input.movesPerScene,
      includeIntro: true,
      includeOutro: true,
      introDurationInFrames: input.intro,
      outroDurationInFrames: input.outro,
      leadInPlies: input.leadInPlies ?? 2,
      trailInPlies: input.trailInPlies ?? 2,
    },
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    schemaVersion: 2,
  };
}

export const BUILT_IN_TEMPLATES: Template[] = [
  template({
    id: "cinematic-chess",
    name: "Cinematic Chess",
    description:
      "A dark stage, a calm camera, and text that arrives only when it adds information.",
    previewKey: "cinematic",
    defaultSourceMode: "full",
    movesPerScene: 4,
    intro: 75,
    outro: 75,
    timing: { leadInFrames: 14, moveDurationFrames: 26, holdFrames: 30 },
    introZoom: 1.25,
    sceneZoom: 1.15,
    sfxVolume: 0.35,
    text: {
      title: textStyle({
        font: "display",
        fontSize: 64,
        align: "center",
        position: "center",
      }),
      caption: textStyle({
        fontSize: 24,
        color: "muted",
        align: "center",
        position: "bottom",
        y: 6,
      }),
    },
  }),
  template({
    id: "tactical-breakdown",
    name: "Tactical Breakdown",
    description:
      "Arrows and focus lead the explanation around the moves that changed the game.",
    previewKey: "tactical",
    defaultSourceMode: "moments",
    movesPerScene: 2,
    intro: 45,
    outro: 45,
    timing: { leadInFrames: 10, moveDurationFrames: 28, holdFrames: 18 },
    effects: { focus: true },
    introZoom: 1.2,
    sceneZoom: 1.3,
    sfxVolume: 0.5,
    text: {
      explanation: textStyle({
        color: "muted",
        position: "top",
        maxWidth: 74,
      }),
    },
  }),
  template({
    id: "brilliant-move",
    name: "Brilliant Move",
    description:
      "One dramatic beat around a candidate brilliant move and its consequences.",
    previewKey: "brilliant",
    defaultSourceMode: "moments",
    movesPerScene: 1,
    intro: 60,
    outro: 60,
    timing: { leadInFrames: 12, moveDurationFrames: 30, holdFrames: 30 },
    effects: { focus: true, glow: true },
    introZoom: 1.25,
    sceneZoom: 1.4,
    sfxVolume: 0.45,
    text: {
      title: textStyle({
        font: "display",
        fontSize: 64,
        color: "brand",
        align: "center",
        position: "center",
      }),
      explanation: textStyle({
        color: "brand",
        position: "top",
      }),
    },
  }),
  template({
    id: "checkmate-sequence",
    name: "Checkmate Sequence",
    description:
      "The final moves, checkmate emphasis, and a clean result card.",
    previewKey: "checkmate",
    defaultSourceMode: "range",
    movesPerScene: 2,
    intro: 45,
    outro: 60,
    timing: { leadInFrames: 10, moveDurationFrames: 20, holdFrames: 40 },
    effects: { focus: true, glow: true, checkmateEmphasis: true },
    introZoom: 1.2,
    sceneZoom: 1.3,
    sfxVolume: 0.55,
    text: {
      explanation: textStyle({
        color: "muted",
        align: "center",
        position: "bottom",
        y: 8,
      }),
    },
  }),
  template({
    id: "minimalist-analysis",
    name: "Minimalist Analysis",
    description:
      "Quiet pacing, no music, and small captions. The position carries the scene.",
    previewKey: "minimal",
    defaultSourceMode: "full",
    movesPerScene: 4,
    intro: 45,
    outro: 45,
    timing: {
      leadInFrames: 10,
      moveDurationFrames: 20,
      gapFrames: 4,
      holdFrames: 14,
    },
    coordinates: false,
    introZoom: 1,
    sceneZoom: 1,
    focusActiveMove: false,
    sfxVolume: 0.25,
    text: {
      title: textStyle({
        font: "body",
        fontSize: 40,
        align: "center",
        position: "center",
      }),
      caption: textStyle({
        fontSize: 20,
        color: "muted",
        align: "center",
        position: "bottom",
        y: 6,
      }),
    },
  }),
  template({
    id: "opening-tutorial",
    name: "Opening Tutorial",
    description:
      "ECO and opening name, a classic board, and a move list that stays readable.",
    previewKey: "opening",
    defaultSourceMode: "range",
    movesPerScene: 2,
    intro: 60,
    outro: 45,
    timing: { leadInFrames: 12, moveDurationFrames: 22, holdFrames: 20 },
    boardTheme: "classic",
    introZoom: 1.1,
    sceneZoom: 1.1,
    focusActiveMove: false,
    sfxVolume: 0.3,
    text: {
      explanation: textStyle({
        color: "muted",
        position: "bottom",
        y: 8,
      }),
    },
  }),
  template({
    id: "game-recap",
    name: "Game Recap",
    description:
      "Metadata, critical moments, and the result in a short review arc.",
    previewKey: "recap",
    defaultSourceMode: "moments",
    movesPerScene: 3,
    intro: 60,
    outro: 60,
    timing: { leadInFrames: 10, moveDurationFrames: 24, holdFrames: 20 },
    effects: { focus: true },
    introZoom: 1.2,
    sceneZoom: 1.2,
    sfxVolume: 0.4,
    text: {
      explanation: textStyle({
        color: "muted",
        position: "top",
        maxWidth: 76,
      }),
    },
  }),
];

export function builtInTemplateById(id: string): Template | undefined {
  return BUILT_IN_TEMPLATES.find((template) => template.id === id);
}
