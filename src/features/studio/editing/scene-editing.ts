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
          const moments = project.sourceContext?.criticalMoments ?? [];
          const moment = scene.moveRange
            ? moments.find(
                (item) =>
                  item.ply >= scene.moveRange!.fromPly &&
                  item.ply <= scene.moveRange!.toPly,
              )
            : undefined;
          const move =
            moment && project.gameSnapshot
              ? project.gameSnapshot.moves[moment.ply - 1]
              : undefined;
          const moveIndex =
            moment && scene.moveRange
              ? moment.ply - scene.moveRange.fromPly
              : 0;
          const startFrame = moment
            ? template.style.timing.leadInFrames +
              Math.max(0, moveIndex) *
                (template.style.timing.moveDurationFrames +
                  template.style.timing.gapFrames)
            : 0;
          next = {
            ...scene,
            annotations: move
              ? [
                  {
                    id: createId(),
                    type: "arrow",
                    from: move.uci.slice(0, 2),
                    to: move.uci.slice(2, 4),
                    color: template.style.effects.glow ? "brand" : "red",
                    startFrame,
                    durationInFrames: Math.max(
                      1,
                      scene.durationInFrames - startFrame,
                    ),
                    opacity: 1,
                  },
                ]
              : [],
          };
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
          const overlays: TextOverlay[] = [];
          if (scene.moveRange && project.gameSnapshot) {
            const moves = project.gameSnapshot.moves.slice(
              scene.moveRange.fromPly - 1,
              scene.moveRange.toPly,
            );
            for (const [index, move] of moves.entries()) {
              const startFrame =
                template.style.timing.leadInFrames +
                index *
                  (template.style.timing.moveDurationFrames +
                    template.style.timing.gapFrames);
              const endFrame =
                index === moves.length - 1
                  ? scene.durationInFrames
                  : startFrame +
                    template.style.timing.moveDurationFrames +
                    template.style.timing.gapFrames;
              overlays.push({
                ...overlayFromStyle(template.style.text.moveLabel, {
                  id: createId(),
                  kind: "move-label",
                  text: `${move.fullMoveNumber}${move.color === "w" ? "." : "..."} ${move.san}`,
                  durationInFrames: Math.max(1, endFrame - startFrame),
                }),
                startFrame,
              });
            }
            const moment = project.sourceContext?.criticalMoments?.find(
              (item) =>
                item.ply >= scene.moveRange!.fromPly &&
                item.ply <= scene.moveRange!.toPly,
            );
            if (moment) {
              overlays.push(
                overlayFromStyle(template.style.text.explanation, {
                  id: createId(),
                  kind: "explanation",
                  text: moment.reason ?? moment.classification ?? moment.san,
                  durationInFrames: scene.durationInFrames,
                }),
              );
            }
          } else {
            overlays.push(
              overlayFromStyle(template.style.text.title, {
                id: createId(),
                kind: "title",
                text: project.name,
                durationInFrames: scene.durationInFrames,
              }),
            );
          }
          next = { ...scene, textOverlays: overlays };
        }
        return { ...next, overrides };
      }),
    ),
    updatedAt: new Date().toISOString(),
  };
}
