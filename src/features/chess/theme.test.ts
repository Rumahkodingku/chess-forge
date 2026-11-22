import { describe, expect, it } from "vitest";
import { boardThemeFromSetting } from "@/features/chess/theme";

describe("boardThemeFromSetting", () => {
  it("maps the classic setting to the classic board", () => {
    expect(boardThemeFromSetting("classic")).toBe("classic");
  });

  it("falls back to forge for unknown or missing settings", () => {
    expect(boardThemeFromSetting("forge")).toBe("forge");
    expect(boardThemeFromSetting("paper")).toBe("forge");
    expect(boardThemeFromSetting(undefined)).toBe("forge");
  });
});
