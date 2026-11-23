import type { Game } from "@/features/games/types";
import { generateScenes } from "@/features/studio/creation/generate-project";
import {
  normalizeSceneStartFrames,
  sceneMinimumFrames,
} from "@/features/studio/rendering/timeline";
import type {
  Scene,
  TemplateSnapshot,
  TemplateTextStyle,
  TextOverlay,
  VideoProject,
} from "@/features/studio/scene/scene.types";
import { toTemplateSnapshot } from "@/features/templates/snapshot";
import type { Template } from "@/features/templates/types";

function gameFromProject(project: VideoProject): Game | null {
  const snapshot = project.gameSnapshot;
  if (!snapshot) return null;
  return {
    id: project.sourceGameId ?? project.id,
    source: "pgn-text",
    metadata: snapshot.metadata,
    initialFen: snapshot.initialFen,
    moves: snapshot.moves,
    originalPgn: "",
    importStatus: "valid",
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    schemaVersion: 1,
  };
}

function textStyleForKind(
  snapshot: TemplateSnapshot,
  kind: TextOverlay["kind"],
): TemplateTextStyle {
  if (kind === "title") return snapshot.style.text.title;
  if (kind === "move-label") return snapshot.style.text.moveLabel;
  if (kind === "explanation") return snapshot.style.text.explanation;
  return snapshot.style.text.caption;
}

function restyleOverlay(
  overlay: TextOverlay,
  snapshot: TemplateSnapshot,
): TextOverlay {
  return {
    ...overlay,
    ...textStyleForKind(snapshot, overlay.kind),
    id: overlay.id,
    kind: overlay.kind,
    text: overlay.text,
    startFrame: overlay.startFrame,
    durationInFrames: overlay.durationInFrames,
  };
}

function applySceneStyle(scene: Scene, snapshot: TemplateSnapshot): Scene {
  const overrides = scene.overrides;
  let next = scene;
  if (!overrides.boardState) {
    next = {
      ...next,
      boardState: {
        ...next.boardState,
        theme: snapshot.style.boardTheme,
        coordinates: snapshot.style.coordinates,
      },
    };
  }
  if (!overrides.effects) {
    next = { ...next, effects: snapshot.style.effects };
  }
  if (!overrides.timing) {
    next = { ...next, timing: snapshot.style.timing };
    if (next.durationInFrames < sceneMinimumFrames(next)) {
      next = {
        ...next,
        durationInFrames: sceneMinimumFrames(next),
      };
    }
  }
  if (!overrides.camera) {
    next = {
      ...next,
      camera: {
        keyframes: [
          {
            frame: 0,
            zoom: next.moveRange ? snapshot.style.camera.sceneZoom : 1,
            x: 0,
            y: 0,
            easing: snapshot.style.camera.easing,
          },
          {
            frame: Math.max(1, next.durationInFrames - 1),
            zoom: 1,
            x: 0,
            y: 0,
            easing: snapshot.style.camera.easing,
          },
        ],
      },
    };
  }
  if (!overrides.textOverlays) {
    next = {
      ...next,
      textOverlays: next.textOverlays.map((overlay) =>
        restyleOverlay(overlay, snapshot),
      ),
    };
  }
  if (!overrides.audioEvents) {
    next = {
      ...next,
      audioEvents: snapshot.style.audio.sceneSfx.map((event, index) => ({
        ...event,
        id: `${next.id}-style-sfx-${index}`,
      })),
    };
  }
  return next;
}

export function applyTemplateStyle(
  project: VideoProject,
  template: Template,
): VideoProject {
  const snapshot = toTemplateSnapshot(template);
  return {
    ...project,
    templateId: snapshot.id,
    template: snapshot,
    scenes: normalizeSceneStartFrames(
      project.scenes.map((scene) => applySceneStyle(scene, snapshot)),
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function regenerateScenes(
  project: VideoProject,
  template: Template,
): VideoProject {
  const game = gameFromProject(project);
  if (!game || !project.sourceSelection) {
    throw new Error("This project has no source selection to regenerate.");
  }
  const snapshot = toTemplateSnapshot(template);
  const scenes = generateScenes({
    game,
    template,
    selection: project.sourceSelection,
    snapshot,
    context: project.sourceContext ?? {
      opening: null,
      result: game.metadata.result,
    },
  });
  return {
    ...project,
    templateId: snapshot.id,
    template: snapshot,
    scenes,
    updatedAt: new Date().toISOString(),
  };
}
