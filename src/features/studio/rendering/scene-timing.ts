import type { Move } from "@/features/games/types";
import type { Scene } from "@/features/studio/scene/scene.types";

export function boardFenForProgress(
  scene: Scene,
  move: Move | undefined,
  progress: number,
): string {
  return progress >= 1 && move ? move.fenAfter : scene.boardState.fen;
}
