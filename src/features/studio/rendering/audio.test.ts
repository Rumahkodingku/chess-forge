import { describe, expect, it } from "vitest";
import { parseSinglePgn } from "@/features/games/pgn";
import {
  BUILTIN_SFX,
  projectAudioSchedule,
  resolveAudioSource,
  sceneSfxSchedule,
  semanticMoveTrigger,
} from "@/features/studio/rendering/audio";
import type {
  AudioTrack,
  GameSnapshot,
  Scene,
  SceneAudioEvent,
} from "@/features/studio/scene/scene.types";

const STANDARD = parseSinglePgn(`[Event "Audio"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 *`);
const CAPTURE = parseSinglePgn(`[Event "Capture"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 d5 2. exd5 *`);
const MATE = parseSinglePgn(`[Event "Mate"]
[White "White"]
[Black "Black"]
[Result "0-1"]

1. f3 e5 2. g4 Qh4# 0-1`);

function snapshot(game: ReturnType<typeof parseSinglePgn>): GameSnapshot {
  return {
    metadata: game.metadata,
    initialFen: game.initialFen,
    moves: game.moves,
  };
}

function event(trigger: SceneAudioEvent["trigger"]): SceneAudioEvent {
  return {
    id: trigger,
    trigger,
    frameOffset: 0,
    volume: 0.5,
    muted: false,
  };
}

function scene(
  fromPly: number,
  toPly: number,
  events: SceneAudioEvent[],
): Scene {
  const game = STANDARD;
  return {
    id: crypto.randomUUID(),
    type: "move",
    startFrame: 0,
    durationInFrames: 120,
    moveRange: { fromPly, toPly },
    boardState: {
      fen: game.initialFen,
      orientation: "w",
      theme: "forge",
      coordinates: true,
    },
    timing: {
      leadInFrames: 10,
      moveDurationFrames: 20,
      gapFrames: 0,
      holdFrames: 20,
      easing: "easeInOut",
    },
    camera: { keyframes: [] },
    annotations: [],
    textOverlays: [],
    effects: {
      lastMoveHighlight: true,
      checkIndicator: true,
      captureEmphasis: true,
      checkmateEmphasis: true,
      glow: false,
      focus: false,
    },
    focusSquares: [],
    audioEvents: events,
    overrides: {},
    schemaVersion: 2,
  };
}

function moveAt(game: ReturnType<typeof parseSinglePgn>, index: number) {
  const move = game.moves[index];
  if (!move) throw new Error(`Missing move ${index}`);
  return move;
}

describe("semanticMoveTrigger", () => {
  it("distinguishes move, capture, check, and checkmate", () => {
    expect(semanticMoveTrigger(moveAt(STANDARD, 0))).toBe("move");
    expect(semanticMoveTrigger(moveAt(CAPTURE, 2))).toBe("capture");
    expect(semanticMoveTrigger(moveAt(MATE, 3))).toBe("checkmate");
  });
});

describe("audio scheduling", () => {
  it("maps built-in SFX paths", () => {
    expect(BUILTIN_SFX.move).toBe("/audio/sfx/move.wav");
    expect(resolveAudioSource({ type: "builtin", id: "capture" }, {})).toBe(
      BUILTIN_SFX.capture,
    );
  });

  it("resolves asset URLs from the resolver", () => {
    expect(
      resolveAudioSource(
        { type: "asset", assetId: "asset-1" },
        { "asset-1": "blob:music" },
      ),
    ).toBe("blob:music");
    expect(
      resolveAudioSource({ type: "asset", assetId: "missing" }, {}),
    ).toBeUndefined();
  });

  it("schedules scene SFX at the move end", () => {
    const schedule = sceneSfxSchedule(
      scene(1, 1, [event("move")]),
      snapshot(STANDARD),
    );
    expect(schedule).toEqual([
      {
        src: BUILTIN_SFX.move,
        startFrame: 30,
        durationInFrames: 18,
        volume: 0.5,
      },
    ]);
  });

  it("uses the semantic precedence and skips unrelated triggers", () => {
    expect(
      sceneSfxSchedule(scene(3, 3, [event("move")]), snapshot(CAPTURE)),
    ).toEqual([]);
    expect(
      sceneSfxSchedule(scene(3, 3, [event("capture")]), snapshot(CAPTURE))[0]
        ?.src,
    ).toBe(BUILTIN_SFX.capture);
  });

  it("schedules project audio tracks and skips missing assets", () => {
    const tracks: AudioTrack[] = [
      {
        id: "music",
        kind: "music",
        source: { type: "asset", assetId: "asset-1" },
        startFrame: 0,
        durationInFrames: 60,
        volume: 0.4,
        muted: false,
        loop: true,
      },
      {
        id: "missing",
        kind: "music",
        source: { type: "asset", assetId: "missing" },
        startFrame: 0,
        durationInFrames: 20,
        volume: 1,
        muted: false,
        loop: false,
      },
      {
        id: "muted",
        kind: "sfx",
        source: { type: "builtin", id: "check" },
        startFrame: 4,
        durationInFrames: 10,
        volume: 1,
        muted: true,
        loop: false,
      },
    ];
    expect(projectAudioSchedule(tracks, { "asset-1": "blob:music" })).toEqual([
      {
        id: "music",
        src: "blob:music",
        startFrame: 0,
        durationInFrames: 60,
        volume: 0.4,
        loop: true,
      },
    ]);
  });
});
