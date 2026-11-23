import type {
  Effects,
  SceneTiming,
  TemplateStyle,
  TemplateTextStyle,
} from "@/features/studio/scene/scene.types";
import {
  legacyTemplateSchema,
  type Template,
  templateSchema,
} from "@/features/templates/types";

const LEGACY_TIMESTAMP = "2026-11-23T00:00:00.000Z";

const DEFAULT_TIMING: SceneTiming = {
  leadInFrames: 12,
  moveDurationFrames: 24,
  gapFrames: 6,
  holdFrames: 24,
  easing: "easeInOut",
};

const DEFAULT_EFFECTS: Effects = {
  lastMoveHighlight: true,
  checkIndicator: true,
  captureEmphasis: true,
  checkmateEmphasis: true,
  glow: false,
  focus: false,
};

function textStyle(
  overrides: Partial<TemplateTextStyle> = {},
): TemplateTextStyle {
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

function legacyStyle(defaultStyle: Record<string, unknown>): TemplateStyle {
  const boardTheme =
    defaultStyle.boardTheme === "classic" ? "classic" : "forge";
  const coordinates =
    typeof defaultStyle.coordinates === "boolean"
      ? defaultStyle.coordinates
      : true;
  return {
    boardTheme,
    coordinates,
    effects: DEFAULT_EFFECTS,
    camera: {
      introZoom: 1.2,
      sceneZoom: 1.1,
      focusActiveMove: true,
      easing: "easeInOut",
    },
    timing: DEFAULT_TIMING,
    text: {
      title: textStyle({
        font: "display",
        fontSize: 64,
        align: "center",
        position: "center",
      }),
      moveLabel: textStyle({
        font: "display",
        fontSize: 56,
        align: "center",
        position: "bottom",
        y: 8,
      }),
      explanation: textStyle({ color: "muted" }),
      caption: textStyle({
        fontSize: 24,
        color: "muted",
        align: "center",
        position: "bottom",
        y: 6,
      }),
    },
    audio: {
      sceneSfx: [],
      projectTracks: [],
    },
  };
}

export function normalizeTemplate(value: unknown): Template | null {
  const current = templateSchema.safeParse(value);
  if (current.success) return current.data;

  const legacy = legacyTemplateSchema.safeParse(value);
  if (!legacy.success) return null;

  return {
    id: legacy.data.id,
    name: legacy.data.name,
    description: legacy.data.description,
    version: legacy.data.version,
    isBuiltIn: legacy.data.isBuiltIn,
    previewKey: legacy.data.preview || "legacy",
    defaultCanvas: legacy.data.defaultCanvas,
    defaultFrameRate: 30,
    style: legacyStyle(legacy.data.defaultStyle),
    sceneRules: {
      defaultSourceMode: "full",
      movesPerScene: 3,
      includeIntro: true,
      includeOutro: true,
      introDurationInFrames: 45,
      outroDurationInFrames: 45,
      leadInPlies: 2,
      trailInPlies: 2,
    },
    createdAt: legacy.data.createdAt || LEGACY_TIMESTAMP,
    updatedAt: legacy.data.updatedAt || LEGACY_TIMESTAMP,
    schemaVersion: 2,
  };
}
