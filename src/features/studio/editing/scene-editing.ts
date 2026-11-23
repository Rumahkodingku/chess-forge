import {
  normalizeSceneStartFrames,
  sceneMinimumFrames,
} from "@/features/studio/rendering/timeline";
import type {
  Scene,
  TemplateTextStyle,
  TextOverlay,
  VideoProject,
} from "@/features/studio/scene/scene.types";
import { createId } from "@/lib/id";

export type SceneField =
  | "boardState"
  | "effects"
  | "timing"
  | "camera"
  | "annotations"
  | "textOverlays"
  | "audioEvents";

export function updateScene(
  project: VideoProject,
  sceneId: string,
  field: SceneField,
  mutator: (scene: Scene) => Scene,
): VideoProject {
  return {
    ...project,
    scenes: normalizeSceneStartFrames(
      project.scenes.map((scene) => {
        if (scene.id !== sceneId) return scene;
        const changed = {
          ...mutator(scene),
          overrides: { ...scene.overrides, [field]: true },
        };
        const durationInFrames = Math.max(
          changed.durationInFrames,
          sceneMinimumFrames(changed),
        );
        return {
          ...changed,
          durationInFrames,
          annotations: changed.annotations
            .filter((annotation) => annotation.startFrame < durationInFrames)
            .map((annotation) => ({
              ...annotation,
              durationInFrames: Math.min(
                annotation.durationInFrames,
                durationInFrames - annotation.startFrame,
              ),
            })),
          textOverlays: changed.textOverlays
            .filter((overlay) => overlay.startFrame < durationInFrames)
            .map((overlay) => ({
              ...overlay,
              durationInFrames: Math.min(
                overlay.durationInFrames,
                durationInFrames - overlay.startFrame,
              ),
            })),
          camera: {
            keyframes: changed.camera.keyframes.map((keyframe) => ({
              ...keyframe,
              frame: Math.max(
                0,
                Math.min(durationInFrames - 1, keyframe.frame),
              ),
              zoom: Math.min(3, Math.max(1, keyframe.zoom)),
            })),
          },
        };
      }),
    ),
    updatedAt: new Date().toISOString(),
  };
}

function overlayFromStyle(
  style: TemplateTextStyle,
  input: {
    id: string;
    kind: TextOverlay["kind"];
    text: string;
    durationInFrames: number;
  },
): TextOverlay {
  return {
    id: input.id,
    kind: input.kind,
    text: input.text,
    ...style,
    startFrame: 0,
    durationInFrames: input.durationInFrames,
  };
}

export function resetSceneField(
  project: VideoProject,
  sceneId: string,
  field: SceneField,
): VideoProject {
  const template = project.template;
  if (!template) return project;
  return {
    ...project,
    scenes: normalizeSceneStartFrames(
      project.scenes.map((scene) => {
        if (scene.id !== sceneId) return scene;
        const overrides = { ...scene.overrides };
        delete overrides[field];
        let next = scene;
        if (field === "boardState") {
          next = {
            ...scene,
            boardState: {
              ...scene.boardState,
              theme: template.style.boardTheme,
              coordinates: template.style.coordinates,
            },
          };
        }
        if (field === "effects") {
          next = { ...scene, effects: template.style.effects };
        }
        if (field === "timing") {
          next = { ...scene, timing: template.style.timing };
          const minimum = sceneMinimumFrames(next);
          if (next.durationInFrames < minimum) {
            next = { ...next, durationInFrames: minimum };
          }
        }
        if (field === "camera") {
          next = {
            ...scene,
            camera: {
              keyframes: [
                {
                  frame: 0,
                  zoom: scene.moveRange ? template.style.camera.sceneZoom : 1,
                  x: 0,
                  y: 0,
                  easing: template.style.camera.easing,
                },
              ],
            },
          };
        }
        if (field === "annotations") {
          next = { ...scene, annotations: [] };
        }
        if (field === "audioEvents") {
          next = {
            ...scene,
            audioEvents: template.style.audio.sceneSfx.map((event, index) => ({
              ...event,
              id: `${scene.id}-reset-sfx-${index}`,
            })),
          };
        }
        if (field === "textOverlays") {
          const move =
            scene.moveRange && project.gameSnapshot
              ? project.gameSnapshot.moves[scene.moveRange.fromPly - 1]
              : undefined;
          const overlay = move
            ? overlayFromStyle(template.style.text.moveLabel, {
                id: createId(),
                kind: "move-label",
                text: `${move.fullMoveNumber}${move.color === "w" ? "." : "..."} ${move.san}`,
                durationInFrames: scene.durationInFrames,
              })
            : overlayFromStyle(template.style.text.caption, {
                id: createId(),
                kind: "caption",
                text: project.name,
                durationInFrames: scene.durationInFrames,
              });
          next = { ...scene, textOverlays: [overlay] };
        }
        return { ...next, overrides };
      }),
    ),
    updatedAt: new Date().toISOString(),
  };
}
