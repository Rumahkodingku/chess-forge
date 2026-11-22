import { describe, expect, it } from "vitest";
import { nagLabel, nagLabels } from "@/features/chess/nags";

describe("nagLabel", () => {
  it("maps common NAG codes to short labels", () => {
    expect(nagLabel(1)).toBe("!");
    expect(nagLabel(3)).toBe("!!");
    expect(nagLabel(4)).toBe("??");
    expect(nagLabel(6)).toBe("?!");
    expect(nagLabel(16)).toBe("±");
    expect(nagLabel(18)).toBe("+−");
  });

  it("falls back to the numeric code", () => {
    expect(nagLabel(146)).toBe("$146");
  });

  it("maps a list and keeps order", () => {
    expect(nagLabels([1, 5, 146])).toEqual(["!", "!?", "$146"]);
  });

  it("returns an empty list for missing NAGs", () => {
    expect(nagLabels(undefined)).toEqual([]);
  });
});
