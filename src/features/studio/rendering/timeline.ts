import type { Scene, VideoProject } from "@/features/studio/scene/scene.types";

export function sceneMinimumFrames(scene: Scene): number {
  const moveCount = scene.moveRange
    ? Math.max(0, scene.moveRange.toPly - scene.moveRange.fromPly + 1)
    : 0;
  return (
    scene.timing.leadInFrames +
    moveCount * scene.timing.moveDurationFrames +
    Math.max(0, moveCount - 1) * scene.timing.gapFrames +
    scene.timing.holdFrames
  );
}

export interface MoveFrame {
  ply: number;
  startFrame: number;
  endFrame: number;
}

export function moveFrameMap(scene: Scene): MoveFrame[] {
  if (!scene.moveRange) return [];
  const frames: MoveFrame[] = [];
  const count = Math.max(
    0,
    scene.moveRange.toPly - scene.moveRange.fromPly + 1,
  );
  for (let index = 0; index < count; index += 1) {
    const startFrame =
      scene.timing.leadInFrames +
      index * (scene.timing.moveDurationFrames + scene.timing.gapFrames);
    frames.push({
      ply: scene.moveRange.fromPly + index,
      startFrame,
      endFrame: startFrame + scene.timing.moveDurationFrames,
    });
  }
  return frames;
}

export function normalizeSceneStartFrames(scenes: Scene[]): Scene[] {
  let startFrame = 0;
  return scenes.map((scene) => {
    const next = { ...scene, startFrame };
    startFrame += scene.durationInFrames;
    return next;
  });
}

export function projectDurationInFrames(
  project: Pick<VideoProject, "scenes">,
): number {
  return project.scenes.reduce(
    (end, scene) => Math.max(end, scene.startFrame + scene.durationInFrames),
    0,
  );
}
