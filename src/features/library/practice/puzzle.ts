import { Chess } from "chess.js";
import type { LibraryPuzzle } from "@/features/library/schemas";

export interface PuzzleSetup {
  puzzleId: string;
  fen: string;
  lastMove?: string;
  sideToMove: "w" | "b";
  expectedUci: string;
  solution: string[];
}

function moveInput(uci: string) {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length === 5 ? uci[4] : undefined,
  };
}

function play(chess: Chess, uci: string) {
  return chess.move(moveInput(uci));
}

export function applyPuzzleSetup(puzzle: LibraryPuzzle): PuzzleSetup {
  const chess = new Chess(puzzle.fen);
  let setup: ReturnType<Chess["move"]>;
  try {
    setup = play(chess, puzzle.moves[0]);
  } catch {
    throw new Error("Puzzle setup move is illegal");
  }
  if (!setup) throw new Error("Puzzle setup move is illegal");
  const expectedUci = puzzle.moves[1];
  if (!expectedUci) throw new Error("Puzzle has no user move");
  return {
    puzzleId: puzzle.id,
    fen: chess.fen(),
    lastMove: setup.san,
    sideToMove: chess.turn(),
    expectedUci,
    solution: puzzle.moves.slice(1),
  };
}

export function isCorrectPuzzleMove(
  puzzle: LibraryPuzzle,
  moveUci: string,
): boolean {
  const setup = applyPuzzleSetup(puzzle);
  if (moveUci === setup.expectedUci) return true;

  const expected = new Chess(setup.fen);
  try {
    play(expected, setup.expectedUci);
  } catch {
    return false;
  }
  if (!expected.isCheckmate()) return false;

  const candidate = new Chess(setup.fen);
  try {
    play(candidate, moveUci);
  } catch {
    return false;
  }
  return candidate.isCheckmate();
}
