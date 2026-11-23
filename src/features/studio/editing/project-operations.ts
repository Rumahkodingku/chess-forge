import { ASPECT_PRESETS } from "@/features/settings/types";
import {
  normalizeSceneStartFrames,
  sceneMinimumFrames,
} from "@/features/studio/rendering/timeline";
import type {
  AspectRatio,
  Scene,
  VideoProject,
} from "@/features/studio/scene/scene.types";
import { createId } from "@/lib/id";

function trimSceneContent(scene: Scene, durationInFrames: number): Scene {
  return {
    ...scene,
    durationInFrames,
    annotations: scene.annotations
      .filter((annotation) => annotation.startFrame < durationInFrames)
      .map((annotation) => ({
        ...annotation,
        durationInFrames: Math.min(
          annotation.durationInFrames,
          durationInFrames - annotation.startFrame,
        ),
      })),
    textOverlays: scene.textOverlays
      .filter((overlay) => overlay.startFrame < durationInFrames)
      .map((overlay) => ({
        ...overlay,
        durationInFrames: Math.min(
          overlay.durationInFrames,
          durationInFrames - overlay.startFrame,
        ),
      })),
    camera: {
      keyframes: scene.camera.keyframes.map((keyframe) => ({
        ...keyframe,
        frame: Math.max(0, Math.min(durationInFrames - 1, keyframe.frame)),
      })),
    },
  };
}

function withScenes(project: VideoProject, scenes: Scene[]): VideoProject {
  return {
    ...project,
    scenes: normalizeSceneStartFrames(scenes),
    updatedAt: new Date().toISOString(),
  };
}

export function setSceneDuration(
  project: VideoProject,
  sceneId: string,
  durationInFrames: number,
): VideoProject {
  const scenes = project.scenes.map((scene) =>
    scene.id === sceneId
      ? trimSceneContent(
          scene,
          Math.max(sceneMinimumFrames(scene), Math.floor(durationInFrames)),
        )
      : scene,
  );
  return withScenes(project, scenes);
}

export function reorderScenes(
  project: VideoProject,
  fromIndex: number,
  toIndex: number,
): VideoProject {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= project.scenes.length ||
    toIndex >= project.scenes.length ||
    fromIndex === toIndex
  ) {
    return project;
  }
  const scenes = [...project.scenes];
  const [moved] = scenes.splice(fromIndex, 1);
  if (!moved) return project;
  scenes.splice(toIndex, 0, moved);
  return withScenes(project, scenes);
}

export function duplicateScene(
  project: VideoProject,
  sceneId: string,
): VideoProject {
  const index = project.scenes.findIndex((scene) => scene.id === sceneId);
  if (index < 0) return project;
  const source = project.scenes[index];
  if (!source) return project;
  const cloned: Scene = {
    ...source,
    id: createId(),
    textOverlays: source.textOverlays.map((overlay) => ({
      ...overlay,
      id: createId(),
    })),
    annotations: source.annotations.map((annotation) => ({
      ...annotation,
      id: createId(),
    })),
    audioEvents: source.audioEvents.map((event) => ({
      ...event,
      id: createId(),
    })),
    overrides: { ...source.overrides },
  };
  const scenes = [...project.scenes];
  scenes.splice(index + 1, 0, cloned);
  return withScenes(project, scenes);
}

export function deleteScene(
  project: VideoProject,
  sceneId: string,
): VideoProject {
  return withScenes(
    project,
    project.scenes.filter((scene) => scene.id !== sceneId),
  );
}

function finalFen(project: VideoProject, scene: Scene | undefined): string {
  if (!scene) return project.gameSnapshot?.initialFen ?? "";
  if (scene.moveRange && project.gameSnapshot) {
    const last = project.gameSnapshot.moves[scene.moveRange.toPly - 1];
    if (last) return last.fenAfter;
  }
  return scene.boardState.fen;
}

export function addScene(
  project: VideoProject,
  afterSceneId?: string,
): VideoProject {
  const index = afterSceneId
    ? project.scenes.findIndex((scene) => scene.id === afterSceneId)
    : project.scenes.length - 1;
  const selected = project.scenes[index] ?? project.scenes.at(-1);
  const fen = finalFen(project, selected);
  if (!fen) return project;
  const timing = selected?.timing ?? {
    leadInFrames: 12,
    moveDurationFrames: 24,
    gapFrames: 6,
    holdFrames: 24,
    easing: "easeInOut" as const,
  };
  const scene: Scene = {
    id: createId(),
    type: "analysis",
    startFrame: 0,
    durationInFrames: Math.max(45, timing.leadInFrames + timing.holdFrames),
    boardState: {
      fen,
      orientation: selected?.boardState.orientation ?? "w",
      theme: selected?.boardState.theme ?? "forge",
      coordinates: selected?.boardState.coordinates ?? true,
    },
    timing,
    camera: {
      keyframes: [{ frame: 0, zoom: 1, x: 0, y: 0, easing: "easeInOut" }],
    },
    annotations: [],
    textOverlays: [],
    effects: selected?.effects ?? {
      lastMoveHighlight: true,
      checkIndicator: true,
      captureEmphasis: true,
      checkmateEmphasis: true,
      glow: false,
      focus: false,
    },
    focusSquares: [],
    audioEvents: [],
    overrides: {},
    schemaVersion: 2,
  };
  const scenes = [...project.scenes];
  scenes.splice(index + 1, 0, scene);
  return withScenes(project, scenes);
}

export function setCanvas(
  project: VideoProject,
  aspectRatio: AspectRatio,
): VideoProject {
  const preset = ASPECT_PRESETS[aspectRatio];
  return {
    ...project,
    canvas: { aspectRatio, ...preset },
    updatedAt: new Date().toISOString(),
  };
}

export function setProjectName(
  project: VideoProject,
  name: string,
): VideoProject {
  const trimmed = name.trim();
  if (!trimmed || trimmed === project.name) return project;
  return { ...project, name: trimmed, updatedAt: new Date().toISOString() };
}

export function replaceScenes(
  project: VideoProject,
  scenes: Scene[],
): VideoProject {
  return withScenes(project, scenes);
}
