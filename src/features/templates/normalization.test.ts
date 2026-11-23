import { describe, expect, it } from "vitest";
import { normalizeTemplate } from "@/features/templates/normalization";
import { templateSchema } from "@/features/templates/types";

describe("normalizeTemplate", () => {
  it("migrates a v1 template to v2", () => {
    const template = normalizeTemplate({
      id: "legacy-template",
      name: "Legacy",
      description: "Old shape",
      version: 1,
      isBuiltIn: false,
      defaultCanvas: { aspectRatio: "9:16", width: 1080, height: 1920 },
      defaultStyle: { boardTheme: "classic", coordinates: false },
      sceneRules: {},
      createdAt: "2026-11-23T00:00:00.000Z",
      updatedAt: "2026-11-23T00:00:00.000Z",
      schemaVersion: 1,
    });
    expect(template?.schemaVersion).toBe(2);
    expect(template?.style.boardTheme).toBe("classic");
    expect(template?.style.coordinates).toBe(false);
    expect(template?.sceneRules.movesPerScene).toBe(3);
    expect(templateSchema.safeParse(template).success).toBe(true);
  });

  it("rejects an unreadable template", () => {
    expect(normalizeTemplate({ id: "broken" })).toBeNull();
  });
});
