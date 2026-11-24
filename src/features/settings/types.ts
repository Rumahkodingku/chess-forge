import { z } from "zod";
import {
  DEFAULT_ENGINE_CONFIGURATION,
  engineConfigurationSchema,
} from "@/features/analysis/types";
import {
  aspectRatioSchema,
  canvasSettingsSchema,
} from "@/features/studio/scene/scene.types";

export const applicationSettingsSchema = z
  .object({
    boardTheme: z.string().min(1),
    pieceTheme: z.string().min(1),
    defaultAspectRatio: aspectRatioSchema,
    defaultCanvas: canvasSettingsSchema,
    defaultResolution: z.enum(["720p", "1080p"]),
    defaultFrameRate: z.union([z.literal(30), z.literal(60)]),
    enginePreferences: engineConfigurationSchema,
    evaluationPerspective: z.enum(["white", "side-to-move"]).default("white"),
    motionPreferences: z
      .object({
        reducedMotion: z.boolean(),
      })
      .strict(),
    playerNames: z.array(z.string().trim().min(1).max(80)).max(20),
    schemaVersion: z.literal(2),
  })
  .strict();

export type ApplicationSettings = z.infer<typeof applicationSettingsSchema>;

export const DEFAULT_SETTINGS: ApplicationSettings = {
  boardTheme: "forge",
  pieceTheme: "cburnett",
  defaultAspectRatio: "9:16",
  defaultCanvas: {
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
  },
  defaultResolution: "1080p",
  defaultFrameRate: 30,
  enginePreferences: DEFAULT_ENGINE_CONFIGURATION,
  evaluationPerspective: "white",
  motionPreferences: {
    reducedMotion: false,
  },
  playerNames: [],
  schemaVersion: 2,
};

export function normalizeApplicationSettings(
  value: unknown,
): ApplicationSettings {
  if (
    value &&
    typeof value === "object" &&
    "schemaVersion" in value &&
    (value as { schemaVersion?: unknown }).schemaVersion === 1
  ) {
    return applicationSettingsSchema.parse({
      ...value,
      playerNames: [],
      schemaVersion: 2,
    });
  }
  return applicationSettingsSchema.parse(value);
}

export const ASPECT_PRESETS = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
} as const;
