import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { easingValue } from "@/features/studio/rendering/easing";
import { moveFrameMap } from "@/features/studio/rendering/timeline";
import type { GameSnapshot, Scene } from "@/features/studio/scene/scene.types";

export interface AnimatedBoardPiece {
  from: string;
  to: string;
  color: Color;
  type: PieceSymbol;
  progress: number;
}

export interface CapturedBoardPiece {
  square: string;
  color: Color;
  type: PieceSymbol;
  progress: number;
}

export interface BoardFrameState {
  fen: string;
  lastMove?: string;
  checkSquare?: string;
  checkmate: boolean;
  animations: AnimatedBoardPiece[];
  captured?: CapturedBoardPiece;
  flashSquare?: string;
  moveProgress?: number;
  error?: string;
}

function loadChess(fen: string): Chess | null {
  try {
    return new Chess(fen);
  } catch {
    return null;
  }
}

function fileOf(square: string): number {
  return square.charCodeAt(0) - 97;
}

function kingSquare(chess: Chess): string | undefined {
  const color = chess.turn();
  for (const rank of chess.board()) {
    for (const piece of rank) {
      if (piece?.type === "k" && piece.color === color) {
        return piece.square;
      }
    }
  }
  return undefined;
}

function checkState(fen: string): {
  checkSquare?: string;
  checkmate: boolean;
  error?: string;
} {
  const chess = loadChess(fen);
  if (!chess) {
    return {
      checkmate: false,
      error: "Invalid board position. Check the scene FEN.",
    };
  }
  if (!chess.inCheck()) return { checkmate: false };
  return {
    checkSquare: kingSquare(chess),
    checkmate: chess.isCheckmate(),
  };
}

function animationsForMove(
  fenBefore: string,
  uci: string,
  progress: number,
): {
  animations: AnimatedBoardPiece[];
  captured?: CapturedBoardPiece;
  flashSquare?: string;
} {
  const chess = loadChess(fenBefore);
  if (!chess) return { animations: [] };
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const piece = chess.get(from as Square);
  if (!piece) return { animations: [] };

  const validator = loadChess(fenBefore);
  try {
    validator?.move({
      from: from as Square,
      to: to as Square,
      promotion: uci[4],
    });
  } catch {
    return { animations: [] };
  }

  const animations: AnimatedBoardPiece[] = [
    {
      from,
      to,
      color: piece.color,
      type: piece.type,
      progress,
    },
  ];

  if (piece.type === "k" && Math.abs(fileOf(to) - fileOf(from)) === 2) {
    const rank = from[1];
    const kingSide = to[0] === "g";
    animations.push({
      from: `${kingSide ? "h" : "a"}${rank}`,
      to: `${kingSide ? "f" : "d"}${rank}`,
      color: piece.color,
      type: "r",
      progress,
    });
  }

  const target = chess.get(to as Square);
  const isEnPassant =
    piece.type === "p" && from[0] !== to[0] && target === undefined;
  const capturedSquare = isEnPassant ? `${to[0]}${from[1]}` : to;
  const capturedPiece = chess.get(capturedSquare as Square);

  return {
    animations,
    captured: capturedPiece
      ? {
          square: capturedSquare,
          color: capturedPiece.color,
          type: capturedPiece.type,
          progress,
        }
      : undefined,
    flashSquare: capturedPiece ? to : undefined,
  };
}

function lastCompletedFen(
  frames: ReturnType<typeof moveFrameMap>,
  snapshot: GameSnapshot,
  index: number,
): string | undefined {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const entry = frames[cursor];
    const move = entry ? snapshot.moves[entry.ply - 1] : undefined;
    if (move?.fenAfter) return move.fenAfter;
  }
  return undefined;
}

export function boardStateAtFrame(
  scene: Scene,
  snapshot: GameSnapshot,
  frame: number,
): BoardFrameState {
  const frames = moveFrameMap(scene);
  if (!frames.length) {
    const check = checkState(scene.boardState.fen);
    return {
      fen: scene.boardState.fen,
      checkSquare: check.checkSquare,
      checkmate: check.checkmate,
      animations: [],
      error: check.error,
    };
  }

  let activeIndex = -1;
  let completedIndex = -1;
  for (const [index, entry] of frames.entries()) {
    if (frame >= entry.startFrame && frame < entry.endFrame) {
      activeIndex = index;
      break;
    }
    if (frame >= entry.endFrame) completedIndex = index;
  }

  if (activeIndex >= 0) {
    const entry = frames[activeIndex];
    const move = entry ? snapshot.moves[entry.ply - 1] : undefined;
    if (!entry || !move) {
      const fen =
        (entry && lastCompletedFen(frames, snapshot, activeIndex)) ??
        scene.boardState.fen;
      const check = checkState(fen);
      return {
        fen,
        checkSquare: check.checkSquare,
        checkmate: check.checkmate,
        animations: [],
        error: check.error,
      };
    }
    const progress = easingValue(
      scene.timing.easing,
      (frame - entry.startFrame) / (entry.endFrame - entry.startFrame),
    );
    const animated = animationsForMove(move.fenBefore, move.uci, progress);
    const check = checkState(move.fenBefore);
    return {
      fen: move.fenBefore,
      lastMove: move.uci,
      checkSquare: check.checkSquare,
      checkmate: false,
      animations: animated.animations,
      captured: animated.captured,
      flashSquare: animated.flashSquare,
      moveProgress: progress,
      error: check.error,
    };
  }

  if (completedIndex >= 0) {
    const entry = frames[completedIndex];
    const move = entry ? snapshot.moves[entry.ply - 1] : undefined;
    if (!entry || !move) {
      const fen =
        (entry && lastCompletedFen(frames, snapshot, completedIndex)) ??
        scene.boardState.fen;
      const check = checkState(fen);
      return {
        fen,
        checkSquare: check.checkSquare,
        checkmate: check.checkmate,
        animations: [],
        error: check.error,
      };
    }
    const check = checkState(move.fenAfter);
    return {
      fen: move.fenAfter,
      lastMove: move.uci,
      checkSquare: check.checkSquare,
      checkmate: check.checkmate,
      animations: [],
      error: check.error,
    };
  }

  const check = checkState(scene.boardState.fen);
  return {
    fen: scene.boardState.fen,
    checkSquare: check.checkSquare,
    checkmate: check.checkmate,
    animations: [],
    error: check.error,
  };
}
