import { describe, expect, it } from "vitest";
import { R1_FIXTURE_PGN } from "@/features/games/fixtures/r1-walking-skeleton";
import { parseSinglePgn } from "@/features/games/pgn";
import { createWalkingSkeletonScene } from "@/features/studio/project-factory";
import { boardStateAtFrame } from "@/features/studio/rendering/board-state";
import type { GameSnapshot, Scene } from "@/features/studio/scene/scene.types";

function sceneFor(
  game: ReturnType<typeof parseSinglePgn>,
  selectedPly: number,
): Scene {
  return createWalkingSkeletonScene({ game, selectedPly });
}

function snapshotFor(game: ReturnType<typeof parseSinglePgn>): GameSnapshot {
  return {
    metadata: game.metadata,
    initialFen: game.initialFen,
    moves: game.moves,
  };
}

describe("boardStateAtFrame", () => {
  it("holds the pre-move position during lead-in", () => {
    const game = parseSinglePgn(R1_FIXTURE_PGN);
    const scene = sceneFor(game, 1);
    const snapshot = snapshotFor(game);
    const state = boardStateAtFrame(scene, snapshot, 0);
    expect(state.fen).toBe(scene.boardState.fen);
    expect(state.lastMove).toBeUndefined();
    expect(state.animations).toEqual([]);
  });

  it("animates a normal move and switches to the after FEN at the end", () => {
    const game = parseSinglePgn(R1_FIXTURE_PGN);
    const scene = sceneFor(game, 1);
    const snapshot = snapshotFor(game);
    const during = boardStateAtFrame(scene, snapshot, 25);
    expect(during.fen).toBe(game.moves[0]?.fenBefore);
    expect(during.lastMove).toBe("e2e4");
    expect(during.animations[0]).toMatchObject({
      from: "e2",
      to: "e4",
      color: "w",
      type: "p",
    });
    expect(during.animations[0]?.progress).toBeCloseTo(0.22, 1);

    const after = boardStateAtFrame(scene, snapshot, 55);
    expect(after.fen).toBe(game.moves[0]?.fenAfter);
    expect(after.animations).toEqual([]);
  });

  it("animates both pieces for castling", () => {
    const game = parseSinglePgn(R1_FIXTURE_PGN);
    const scene = sceneFor(game, 9);
    const snapshot = snapshotFor(game);
    const during = boardStateAtFrame(scene, snapshot, 25);
    expect(during.animations).toHaveLength(2);
    expect(during.animations.map((piece) => piece.from).sort()).toEqual([
      "e1",
      "h1",
    ]);
    expect(during.animations.map((piece) => piece.to).sort()).toEqual([
      "f1",
      "g1",
    ]);
  });

  it("detects a normal capture", () => {
    const game = parseSinglePgn(`[Event "Capture"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 d5 2. exd5 *`);
    const scene = sceneFor(game, 3);
    const snapshot = snapshotFor(game);
    const during = boardStateAtFrame(scene, snapshot, 25);
    expect(during.captured).toMatchObject({
      square: "d5",
      color: "b",
      type: "p",
    });
    expect(during.flashSquare).toBe("d5");
  });

  it("detects en passant", () => {
    const game = parseSinglePgn(`[Event "En passant"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 a6 2. e5 d5 3. exd6 *`);
    const scene = sceneFor(game, 5);
    const snapshot = snapshotFor(game);
    const during = boardStateAtFrame(scene, snapshot, 25);
    expect(during.captured).toMatchObject({
      square: "d5",
      color: "b",
      type: "p",
    });
    expect(during.animations[0]).toMatchObject({
      from: "e5",
      to: "d6",
    });
  });

  it("handles promotion at the end of the move", () => {
    const game = parseSinglePgn(`[Event "Promotion"]
[White "White"]
[Black "Black"]
[Result "*"]
[SetUp "1"]
[FEN "7k/P7/8/8/8/8/8/K7 w - - 0 1"]

1. a8=Q+ *`);
    const scene = sceneFor(game, 1);
    const snapshot = snapshotFor(game);
    const during = boardStateAtFrame(scene, snapshot, 25);
    expect(during.animations[0]).toMatchObject({
      from: "a7",
      to: "a8",
      type: "p",
    });
    const after = boardStateAtFrame(scene, snapshot, 55);
    expect(after.fen).toBe(game.moves[0]?.fenAfter);
  });

  it("marks check and checkmate on the completed position", () => {
    const game = parseSinglePgn(`[Event "Mate"]
[White "White"]
[Black "Black"]
[Result "0-1"]

1. f3 e5 2. g4 Qh4# 0-1`);
    const scene = sceneFor(game, 4);
    const snapshot = snapshotFor(game);
    const after = boardStateAtFrame(scene, snapshot, 55);
    expect(after.checkSquare).toBe("e1");
    expect(after.checkmate).toBe(true);
  });

  it("reports an invalid FEN without throwing", () => {
    const game = parseSinglePgn(R1_FIXTURE_PGN);
    const scene = {
      ...sceneFor(game, 1),
      boardState: { ...sceneFor(game, 1).boardState, fen: "not-a-fen" },
    };
    const state = boardStateAtFrame(scene, snapshotFor(game), 0);
    expect(state.error).toContain("Invalid board position");
    expect(state.animations).toEqual([]);
  });

  it("skips an illegal snapshot move", () => {
    const game = parseSinglePgn(R1_FIXTURE_PGN);
    const scene = sceneFor(game, 1);
    const snapshot = snapshotFor(game);
    const moves = snapshot.moves.map((move, index) =>
      index === 0 ? { ...move, uci: "e2e5" } : move,
    );
    const state = boardStateAtFrame(scene, { ...snapshot, moves }, 25);
    expect(state.animations).toEqual([]);
  });

  it("holds the last completed position when the next move is missing", () => {
    const game = parseSinglePgn(R1_FIXTURE_PGN);
    const scene = {
      ...sceneFor(game, 1),
      moveRange: { fromPly: 1, toPly: 3 },
    };
    const snapshot = snapshotFor(game);
    const state = boardStateAtFrame(
      scene,
      { ...snapshot, moves: snapshot.moves.slice(0, 1) },
      60,
    );
    expect(state.fen).toBe(game.moves[0]?.fenAfter);
    expect(state.animations).toEqual([]);
  });
});
