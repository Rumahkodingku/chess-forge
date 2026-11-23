import { easingValue } from "@/features/studio/rendering/easing";
import type { CameraKeyframe } from "@/features/studio/scene/scene.types";

export interface CameraState {
  zoom: number;
  x: number;
  y: number;
}
export function clampCamera(camera: CameraState): CameraState {
  const zoom = Math.min(3, Math.max(1, camera.zoom));
  const maxOffset = (1 - 1 / zoom) / 2;
  return {
    zoom,
    x: Math.min(maxOffset, Math.max(-maxOffset, camera.x)),
    y: Math.min(maxOffset, Math.max(-maxOffset, camera.y)),
  };
}

export function clampCameraToSquares(
  camera: CameraState,
  squares: string[],
  orientation: "w" | "b" = "w",
): CameraState {
  const clamped = clampCamera(camera);
  if (!squares.length) return clamped;

  const maxOffset = (1 - 1 / clamped.zoom) / 2;
  let minX = -maxOffset;
  let maxX = maxOffset;
  let minY = -maxOffset;
  let maxY = maxOffset;
  let found = false;

  for (const square of squares) {
    if (!/^[a-h][1-8]$/.test(square)) continue;
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]) - 1;
    const column = orientation === "w" ? file : 7 - file;
    const row = orientation === "w" ? 7 - rank : rank;
    const px = (column + 0.5) / 8 - 0.5;
    const py = (row + 0.5) / 8 - 0.5;
    minX = Math.max(minX, px * clamped.zoom - 0.5);
    maxX = Math.min(maxX, px * clamped.zoom + 0.5);
    minY = Math.max(minY, py * clamped.zoom - 0.5);
    maxY = Math.min(maxY, py * clamped.zoom + 0.5);
    found = true;
  }

  if (!found) return clamped;

  const clampAxis = (value: number, min: number, max: number) => {
    if (min <= max) return Math.min(max, Math.max(min, value));
    const midpoint = (min + max) / 2;
    return Math.min(maxOffset, Math.max(-maxOffset, midpoint));
  };

  return {
    zoom: clamped.zoom,
    x: clampAxis(clamped.x, minX, maxX),
    y: clampAxis(clamped.y, minY, maxY),
  };
}

export function cameraAtFrame(
  keyframes: CameraKeyframe[],
  frame: number,
): CameraState {
  if (!keyframes.length) {
    return { zoom: 1, x: 0, y: 0 };
  }
  const sorted = [...keyframes].sort((left, right) => left.frame - right.frame);
  const first = sorted[0];
  const last = sorted.at(-1);
  if (!first || !last) return { zoom: 1, x: 0, y: 0 };
  if (frame <= first.frame) {
    return clampCamera(first);
  }
  if (frame >= last.frame) {
    return clampCamera(last);
  }

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const from = sorted[index];
    const to = sorted[index + 1];
    if (!from || !to || frame > to.frame) continue;
    const span = to.frame - from.frame;
    const progress = span === 0 ? 1 : (frame - from.frame) / span;
    const eased = easingValue(to.easing, progress);
    return clampCamera({
      zoom: from.zoom + (to.zoom - from.zoom) * eased,
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased,
    });
  }

  return clampCamera(last);
}

export function focusCameraKeyframe(
  square: string,
  frame: number,
  zoom = 1.6,
): CameraKeyframe {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  return {
    frame,
    zoom,
    x: (file - 3.5) / 8,
    y: (3.5 - rank) / 8,
    easing: "easeInOut",
  };
}
