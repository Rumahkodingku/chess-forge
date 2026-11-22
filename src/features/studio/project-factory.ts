import type { Game, Move } from "@/features/games/types";
import type { Scene, VideoProject } from "@/features/studio/scene/scene.types";
import { videoProjectSchema } from "@/features/studio/scene/scene.types";
import { ValidationError } from "@/lib/errors";
import { createId } from "@/lib/id";

export const R1_TEMPLATE_ID = "r1-skeleton";
export const R1_SCENE_DURATION_FRAMES = 90;
export const R1_FRAME_RATE = 30;

export interface CreateMoveSceneInput {
  game: Game;
  selectedPly: number;
}

export interface CreateWalkingSkeletonProjectInput {
  game: Game;
  selectedPly: number;
}

function selectedMove(game: Game, selectedPly: number): Move {
  if (selectedPly < 1) {
    throw new ValidationError(
      "Select a move before creating a scene.",
      "Use the move list or the next control to select a move.",
    );
  }
  const move = game.moves[selectedPly - 1];
  if (!move) {
    throw new ValidationError(
      "The selected move does not exist in this game.",
      "Reload the game and choose a move from the list.",
    );
  }
  return move;
}

function moveLabel(move: Move): string {
  return `${move.fullMoveNumber}${move.color === "w" ? "." : "..."} ${move.san}`;
}

export function createWalkingSkeletonScene({
  game,
  selectedPly,
}: CreateMoveSceneInput): Scene {
  const move = selectedMove(game, selectedPly);

  return {
    id: createId(),
    type: "move",
    startFrame: 0,
    durationInFrames: R1_SCENE_DURATION_FRAMES,
    moveRange: { fromPly: selectedPly, toPly: selectedPly },
    boardState: {
      fen: move.fenBefore,
      orientation: "w",
      lastMove: move.uci,
    },
    camera: {
      zoom: 1,
      x: 0,
      y: 0,
    },
    annotations: [],
    textOverlays: [
      {
        id: createId(),
        kind: "move-label",
        text: moveLabel(move),
        position: "bottom",
        startFrame: 0,
        durationInFrames: R1_SCENE_DURATION_FRAMES,
      },
    ],
    effects: {
      lastMoveHighlight: true,
      checkIndicator: true,
      captureEmphasis: true,
      glow: false,
    },
    audioReferences: [],
    overrides: {},
    schemaVersion: 1,
  };
}

export function createWalkingSkeletonProject({
  game,
  selectedPly,
}: CreateWalkingSkeletonProjectInput): VideoProject {
  const scene = createWalkingSkeletonScene({ game, selectedPly });
  const now = new Date().toISOString();

  const project: VideoProject = {
    id: createId(),
    name: `${game.metadata.white} vs ${game.metadata.black}`,
    sourceGameId: game.id,
    templateId: R1_TEMPLATE_ID,
    projectVersion: 1,
    canvas: {
      aspectRatio: "9:16",
      width: 1080,
      height: 1920,
    },
    frameRate: R1_FRAME_RATE,
    scenes: [scene],
    tracks: {
      text: [],
      annotation: [],
      audio: [],
    },
    assets: [],
    gameSnapshot: {
      metadata: game.metadata,
      initialFen: game.initialFen,
      moves: game.moves,
    },
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };

  return videoProjectSchema.parse(project);
}
