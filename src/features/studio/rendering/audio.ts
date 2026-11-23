import { Chess, type Square } from "chess.js";
import type { Move } from "@/features/games/types";
import { moveFrameMap } from "@/features/studio/rendering/timeline";
import type {
  AudioTrack,
  GameSnapshot,
  Scene,
  SceneAudioEvent,
} from "@/features/studio/scene/scene.types";

export const BUILTIN_SFX = {
  move: "/audio/sfx/move.wav",
  capture: "/audio/sfx/capture.wav",
  check: "/audio/sfx/check.wav",
  checkmate: "/audio/sfx/checkmate.wav",
} as const;

const BUILTIN_DURATIONS: Record<SceneAudioEvent["trigger"], number> = {
  move: 18,
  capture: 24,
  check: 30,
  checkmate: 45,
};

export interface ResolvedSfx {
  src: string;
  startFrame: number;
  durationInFrames: number;
  volume: number;
}

export interface ScheduledAudioTrack {
  id: string;
  src: string;
  startFrame: number;
  durationInFrames: number;
  volume: number;
  loop: boolean;
}

export function resolveAudioSource(
  source: AudioTrack["source"],
  resolvedAssets: Record<string, string>,
): string | undefined {
  if (source.type === "builtin") return BUILTIN_SFX[source.id];
  return resolvedAssets[source.assetId];
}

export function semanticMoveTrigger(move: Move): SceneAudioEvent["trigger"] {
  let chess: Chess;
  try {
    chess = new Chess(move.fenAfter);
  } catch {
    return "move";
  }
  if (chess.isCheckmate()) return "checkmate";
  if (chess.inCheck()) return "check";
  let before: Chess;
  try {
    before = new Chess(move.fenBefore);
  } catch {
    return "move";
  }
  const from = move.uci.slice(0, 2) as Square;
  const to = move.uci.slice(2, 4) as Square;
  const piece = before.get(from);
  const target = before.get(to);
  const isEnPassant =
    piece?.type === "p" && from[0] !== to[0] && target === undefined;
  return target || isEnPassant ? "capture" : "move";
}

export function sceneSfxSchedule(
  scene: Scene,
  snapshot: GameSnapshot,
): ResolvedSfx[] {
  const schedule: ResolvedSfx[] = [];
  for (const frame of moveFrameMap(scene)) {
    const move = snapshot.moves[frame.ply - 1];
    if (!move) continue;
    const trigger = semanticMoveTrigger(move);
    const event = scene.audioEvents.find(
      (candidate) => candidate.trigger === trigger && !candidate.muted,
    );
    if (!event) continue;
    const startFrame = frame.endFrame + event.frameOffset;
    if (startFrame < 0 || startFrame >= scene.durationInFrames) continue;
    schedule.push({
      src: BUILTIN_SFX[trigger],
      startFrame,
      durationInFrames: BUILTIN_DURATIONS[trigger],
      volume: event.volume,
    });
  }
  return schedule;
}

export function projectAudioSchedule(
  tracks: AudioTrack[],
  resolvedAssets: Record<string, string>,
): ScheduledAudioTrack[] {
  const scheduled: ScheduledAudioTrack[] = [];
  for (const track of tracks) {
    if (track.muted) continue;
    const src = resolveAudioSource(track.source, resolvedAssets);
    if (!src) continue;
    scheduled.push({
      id: track.id,
      src,
      startFrame: track.startFrame,
      durationInFrames: track.durationInFrames,
      volume: track.volume,
      loop: track.loop,
    });
  }
  return scheduled;
}
