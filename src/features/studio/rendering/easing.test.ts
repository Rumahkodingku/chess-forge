import { describe, expect, it } from "vitest";
import { easingValue } from "@/features/studio/rendering/easing";

describe("easingValue", () => {
  it("clamps and applies the selected curve", () => {
    expect(easingValue("linear", 0.5)).toBe(0.5);
    expect(easingValue("easeIn", 0.5)).toBe(0.25);
    expect(easingValue("easeOut", 0.5)).toBe(0.75);
    expect(easingValue("easeInOut", 0.25)).toBe(0.125);
    expect(easingValue("easeInOut", 0.75)).toBe(0.875);
    expect(easingValue("linear", -1)).toBe(0);
    expect(easingValue("linear", 2)).toBe(1);
  });
});
