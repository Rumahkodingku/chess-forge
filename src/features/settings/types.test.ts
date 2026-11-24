import { describe, expect, it } from "vitest";
import {
  applicationSettingsSchema,
  DEFAULT_SETTINGS,
  normalizeApplicationSettings,
} from "@/features/settings/types";

describe("application settings schema", () => {
  it("defaults evaluation perspective for older stored settings", () => {
    const { evaluationPerspective: _ignored, ...legacy } = DEFAULT_SETTINGS;
    expect(applicationSettingsSchema.parse(legacy).evaluationPerspective).toBe(
      "white",
    );
  });

  it("accepts side-to-move evaluation perspective", () => {
    expect(
      applicationSettingsSchema.parse({
        ...DEFAULT_SETTINGS,
        evaluationPerspective: "side-to-move",
      }).evaluationPerspective,
    ).toBe("side-to-move");
  });

  it("normalises v1 settings with empty player names", () => {
    const { playerNames: _ignored, ...legacy } = {
      ...DEFAULT_SETTINGS,
      schemaVersion: 1 as const,
    };
    const parsed = normalizeApplicationSettings(legacy);
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.playerNames).toEqual([]);
  });

  it("keeps a configured player name list", () => {
    const parsed = normalizeApplicationSettings({
      ...DEFAULT_SETTINGS,
      playerNames: ["Riot", "rumahkodingku"],
    });
    expect(parsed.playerNames).toEqual(["Riot", "rumahkodingku"]);
  });
});
