import { describe, expect, it } from "vitest";
import { validateTextOverlays } from "@/features/studio/rendering/text-safety";
import type { TextOverlay } from "@/features/studio/scene/scene.types";

const canvas = { aspectRatio: "9:16" as const, width: 1080, height: 1920 };

function overlay(overrides: Partial<TextOverlay> = {}): TextOverlay {
  return {
    id: "overlay",
    kind: "caption",
    text: "A short caption",
    font: "body",
    fontSize: 24,
    color: "foreground",
    align: "center",
    position: "bottom",
    x: 0,
    y: 0,
    maxWidth: 80,
    background: false,
    startFrame: 0,
    durationInFrames: 60,
    ...overrides,
  };
}

describe("validateTextOverlays", () => {
  it("accepts a short overlay inside the safe area", () => {
    expect(validateTextOverlays([overlay()], canvas)).toEqual([]);
  });

  it("warns when text needs more than four lines", () => {
    expect(
      validateTextOverlays(
        [
          overlay({
            text: "This caption is deliberately much too long for a narrow box and cannot fit on four lines",
            maxWidth: 18,
          }),
        ],
        canvas,
      )[0],
    ).toContain("more than four lines");
  });

  it("warns when an offset pushes text outside the safe area", () => {
    expect(
      validateTextOverlays([overlay({ position: "top", y: 100 })], canvas)[0],
    ).toContain("safe area");
  });

  it("reports the overlay id", () => {
    expect(
      validateTextOverlays(
        [overlay({ id: "caption-1", position: "top", y: 100 })],
        canvas,
      )[0],
    ).toContain("caption-1");
  });

  it("accepts right-aligned and centred horizontal offsets", () => {
    expect(
      validateTextOverlays(
        [
          overlay({ align: "right", position: "top", x: 10 }),
          overlay({ align: "center", position: "bottom", x: -10 }),
        ],
        canvas,
      ),
    ).toEqual([]);
  });
});
