import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { terminalState } from "@/features/analysis/engine/terminal";
import { parseSinglePgn } from "@/features/games/pgn";

describe("terminalState", () => {
  it("detects checkmate and the winner", () => {
    const state = terminalState(
      "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3",
    );
    expect(state).toEqual({
      terminal: "checkmate",
      winner: "b",
      score: { type: "mate", value: 0, perspective: "white" },
    });
  });

  it("detects stalemate as a draw", () => {
    const state = terminalState("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    expect(state).toEqual({
      terminal: "stalemate",
      score: { type: "cp", value: 0, perspective: "white" },
    });
  });

  it("detects insufficient material as a draw", () => {
    const state = terminalState("8/8/8/8/8/8/4k3/4K3 w - - 0 1");
    expect(state).toEqual({
      terminal: "draw",
      score: { type: "cp", value: 0, perspective: "white" },
    });
  });

  it("detects checkmate from the terminal fixture", () => {
    const game = parseSinglePgn(
      readFileSync("src/features/games/fixtures/r3-terminal.pgn", "utf8"),
    );
    expect(terminalState(game.moves.at(-1)?.fenAfter ?? "")).toMatchObject({
      terminal: "checkmate",
      winner: "b",
    });
  });

  it("returns null for a playable position", () => {
    expect(
      terminalState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"),
    ).toBeNull();
  });

  it("rejects an invalid FEN", () => {
    expect(() => terminalState("not a fen")).toThrow();
  });
});
