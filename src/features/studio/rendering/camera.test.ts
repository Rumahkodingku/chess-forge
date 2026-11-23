import { describe, expect, it } from "vitest";
import {
  cameraAtFrame,
  clampCamera,
  clampCameraToSquares,
  focusCameraKeyframe,
} from "@/features/studio/rendering/camera";

describe("cameraAtFrame", () => {
  it("returns the default camera without keyframes", () => {
    expect(cameraAtFrame([], 10)).toEqual({ zoom: 1, x: 0, y: 0 });
  });

  it("interpolates zoom and pan with easing", () => {
    const keyframes = [
      { frame: 0, zoom: 1, x: 0, y: 0, easing: "linear" as const },
      { frame: 10, zoom: 2, x: 0.2, y: -0.1, easing: "linear" as const },
    ];
    expect(cameraAtFrame(keyframes, 5)).toEqual({
      zoom: 1.5,
      x: 0.1,
      y: -0.05,
    });
  });

  it("clamps frames before the first and after the last keyframe", () => {
    const keyframes = [
      { frame: 10, zoom: 1.5, x: 0.1, y: 0.1, easing: "linear" as const },
      { frame: 20, zoom: 2, x: 0, y: 0, easing: "linear" as const },
    ];
    expect(cameraAtFrame(keyframes, 0)).toEqual({ zoom: 1.5, x: 0.1, y: 0.1 });
    expect(cameraAtFrame(keyframes, 30)).toEqual({ zoom: 2, x: 0, y: 0 });
  });

  it("clamps translation so the board stays covered", () => {
    expect(clampCamera({ zoom: 2, x: 1, y: -1 })).toEqual({
      zoom: 2,
      x: 0.25,
      y: -0.25,
    });
    expect(clampCamera({ zoom: 1, x: 0.5, y: 0.5 })).toEqual({
      zoom: 1,
      x: 0,
      y: 0,
    });
  });

  it("creates a focus keyframe from a square", () => {
    expect(focusCameraKeyframe("a1", 0)).toMatchObject({
      frame: 0,
      zoom: 1.6,
      x: -0.4375,
      y: 0.4375,
    });
    expect(focusCameraKeyframe("h8", 0)).toMatchObject({
      x: 0.4375,
      y: -0.4375,
    });
  });
});

describe("clampCameraToSquares", () => {
  it("keeps the active move squares inside the visible board", () => {
    const camera = clampCameraToSquares({ zoom: 1.5, x: -0.1667, y: -0.06 }, [
      "b8",
      "c6",
    ]);
    const py = -0.4375;
    expect(py * camera.zoom - camera.y).toBeGreaterThanOrEqual(-0.5);
    expect(py * camera.zoom - camera.y).toBeLessThanOrEqual(0.5);
  });

  it("respects board orientation", () => {
    const white = clampCameraToSquares({ zoom: 2, x: 0, y: 0 }, ["a1"], "w");
    const black = clampCameraToSquares({ zoom: 2, x: 0, y: 0 }, ["a1"], "b");
    expect(white.x).not.toBe(black.x);
    expect(white.y).not.toBe(black.y);
  });

  it("keeps the pan bound when a square cannot fit", () => {
    const camera = clampCameraToSquares({ zoom: 3, x: 0, y: 0 }, ["a8"], "w");
    const maxOffset = (1 - 1 / 3) / 2;
    expect(Math.abs(camera.x)).toBeLessThanOrEqual(maxOffset);
    expect(Math.abs(camera.y)).toBeLessThanOrEqual(maxOffset);
  });
});
