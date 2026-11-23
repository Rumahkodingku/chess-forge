import { describe, expect, it } from "vitest";
import { BUILT_IN_TEMPLATES } from "@/features/templates/builtins";
import { templateSchema } from "@/features/templates/types";

describe("built-in templates", () => {
  it("defines seven valid read-only templates", () => {
    expect(BUILT_IN_TEMPLATES).toHaveLength(7);
    expect(
      new Set(BUILT_IN_TEMPLATES.map((template) => template.id)).size,
    ).toBe(7);
    for (const template of BUILT_IN_TEMPLATES) {
      expect(templateSchema.safeParse(template).success).toBe(true);
      expect(template.isBuiltIn).toBe(true);
      expect(template.sceneRules.movesPerScene).toBeGreaterThan(0);
    }
  });

  it("keeps the approved source modes", () => {
    expect(
      BUILT_IN_TEMPLATES.find((template) => template.id === "cinematic-chess")
        ?.sceneRules.defaultSourceMode,
    ).toBe("full");
    expect(
      BUILT_IN_TEMPLATES.find(
        (template) => template.id === "tactical-breakdown",
      )?.sceneRules.defaultSourceMode,
    ).toBe("moments");
    expect(
      BUILT_IN_TEMPLATES.find(
        (template) => template.id === "checkmate-sequence",
      )?.sceneRules.defaultSourceMode,
    ).toBe("range");
  });
});
