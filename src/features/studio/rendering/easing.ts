import type { EasingName } from "@/features/studio/scene/scene.types";

export function easingValue(name: EasingName, progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  if (name === "easeIn") return t * t;
  if (name === "easeOut") return 1 - (1 - t) * (1 - t);
  if (name === "easeInOut") {
    return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  }
  return t;
}
