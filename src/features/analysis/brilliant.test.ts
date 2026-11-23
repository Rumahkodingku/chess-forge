import { describe, expect, it } from "vitest";
import {
  detectCandidateBrilliant,
  staticExchangeGain,
} from "@/features/analysis/brilliant";
import type { Evaluation } from "@/features/analysis/types";

const cp = (value: number): Evaluation => ({
  type: "cp",
  value,
  perspective: "white",
});
const mate = (value: number): Evaluation => ({
  type: "mate",
  value,
  perspective: "white",
});

const SACRIFICE_FEN = "4k3/8/6p1/8/8/8/8/3QK3 w - - 0 1";
const SAFE_FEN = "4k3/8/8/8/8/8/8/3QK3 w - - 0 1";

function detect(overrides: Record<string, unknown> = {}) {
  return detectCandidateBrilliant({
    fenBefore: SACRIFICE_FEN,
    playedUci: "d1h5",
    bestMoveUci: "d1h5",
    mover: "w",
    after: cp(100),
    inOpeningBook: false,
    ...overrides,
  });
}

describe("staticExchangeGain", () => {
  it("measures a queen left en prise", () => {
    expect(staticExchangeGain("4k3/8/6p1/7Q/8/8/8/4K3 b - - 1 1", "w")).toBe(
      900,
    );
  });

  it("nets out an available recapture", () => {
    expect(staticExchangeGain("4k3/8/6p1/7Q/6B1/8/8/4K3 b - - 1 1", "w")).toBe(
      800,
    );
  });
});

describe("detectCandidateBrilliant", () => {
  it("accepts a best move that sacrifices material while winning", () => {
    expect(detect()).toEqual({ candidate: true, sacrifice: 900 });
  });

  it("accepts a positive mate evaluation", () => {
    expect(detect({ after: mate(2) }).candidate).toBe(true);
  });

  it("rejects a move that is not the engine best", () => {
    expect(detect({ bestMoveUci: "d1d2" }).candidate).toBe(false);
  });

  it("rejects a sacrifice that is not winning", () => {
    expect(detect({ after: cp(-100) }).candidate).toBe(false);
  });

  it("rejects a book position", () => {
    expect(detect({ inOpeningBook: true }).candidate).toBe(false);
  });

  it("rejects a move that does not sacrifice material", () => {
    expect(
      detect({
        fenBefore: SAFE_FEN,
        playedUci: "d1d2",
        bestMoveUci: "d1d2",
      }).candidate,
    ).toBe(false);
  });

  it("rejects a forced move", () => {
    expect(
      detect({
        fenBefore: "7k/8/8/8/8/8/6q1/7K w - - 0 1",
        playedUci: "h1g2",
        bestMoveUci: "h1g2",
        after: cp(0),
      }).candidate,
    ).toBe(false);
  });
});
