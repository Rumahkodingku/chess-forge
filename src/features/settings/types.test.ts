import { describe, expect, it } from "vitest";
import {
  applicationSettingsSchema,
  DEFAULT_SETTINGS,
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
});
