import { describe, expect, it } from "vitest";
import { classifyMove } from "@/features/analysis/classification";
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

function classify(overrides: Partial<Parameters<typeof classifyMove>[0]> = {}) {
  return classifyMove({
    playedUci: "e2e4",
    bestMoveUci: "e2e4",
    mover: "w",
    before: cp(20),
    after: cp(20),
    legalMoveCount: 20,
    depth: 14,
    targetDepth: 14,
    ...overrides,
  });
}

describe("classifyMove", () => {
  it("marks the engine best move as best", () => {
    expect(classify()).toMatchObject({
      classification: "best",
      centipawnLoss: 0,
      confidence: "high",
    });
  });

  it("uses the documented centipawn thresholds", () => {
    expect(classify({ bestMoveUci: "d2d4", after: cp(0) }).classification).toBe(
      "excellent",
    );
    expect(
      classify({ bestMoveUci: "d2d4", before: cp(20), after: cp(0) })
        .classification,
    ).toBe("excellent");
    expect(
      classify({ bestMoveUci: "d2d4", before: cp(21), after: cp(0) })
        .classification,
    ).toBe("good");
    expect(
      classify({ bestMoveUci: "d2d4", before: cp(50), after: cp(0) })
        .classification,
    ).toBe("good");
    expect(
      classify({ bestMoveUci: "d2d4", before: cp(51), after: cp(0) })
        .classification,
    ).toBe("inaccuracy");
    expect(
      classify({ bestMoveUci: "d2d4", before: cp(100), after: cp(0) })
        .classification,
    ).toBe("inaccuracy");
    expect(
      classify({ bestMoveUci: "d2d4", before: cp(101), after: cp(0) })
        .classification,
    ).toBe("mistake");
    expect(
      classify({ bestMoveUci: "d2d4", before: cp(200), after: cp(0) })
        .classification,
    ).toBe("mistake");
    expect(
      classify({ bestMoveUci: "d2d4", before: cp(201), after: cp(0) })
        .classification,
    ).toBe("blunder");
  });

  it("normalises centipawn loss for a Black mover", () => {
    expect(
      classify({
        mover: "b",
        before: cp(100),
        after: cp(150),
        bestMoveUci: "g8f6",
        playedUci: "d7d5",
      }).centipawnLoss,
    ).toBe(50);
    expect(
      classify({
        mover: "b",
        before: cp(100),
        after: cp(50),
        bestMoveUci: "g8f6",
        playedUci: "d7d5",
      }).centipawnLoss,
    ).toBe(0);
  });

  it("uses the mate transition table", () => {
    const faster = classify({
      before: mate(2),
      after: mate(1),
      bestMoveUci: "d2d4",
    });
    expect(faster.classification).toBe("excellent");
    expect(faster.centipawnLoss).toBeUndefined();
    expect(classify({ before: mate(2), after: mate(3) }).classification).toBe(
      "good",
    );
    expect(classify({ before: mate(2), after: mate(4) }).classification).toBe(
      "inaccuracy",
    );
    expect(
      classify({ before: mate(2), after: cp(250), bestMoveUci: "d2d4" })
        .classification,
    ).toBe("mistake");
    expect(
      classify({ before: mate(2), after: cp(100), bestMoveUci: "d2d4" })
        .classification,
    ).toBe("blunder");
    expect(classify({ before: cp(0), after: mate(3) }).classification).toBe(
      "best",
    );
    expect(classify({ before: cp(0), after: mate(-2) }).classification).toBe(
      "blunder",
    );
    expect(classify({ before: mate(-3), after: mate(-5) }).classification).toBe(
      "excellent",
    );
    expect(classify({ before: mate(-3), after: cp(-20) }).classification).toBe(
      "best",
    );
    expect(classify({ before: mate(-3), after: cp(-300) }).classification).toBe(
      "excellent",
    );
    expect(classify({ before: mate(-3), after: mate(-2) }).classification).toBe(
      "good",
    );
  });

  it("handles terminal checkmate after the move", () => {
    expect(
      classify({
        before: cp(300),
        after: mate(0),
        afterTerminal: "checkmate",
        bestMoveUci: "d2d4",
      }).classification,
    ).toBe("excellent");
    expect(
      classify({
        before: cp(300),
        after: mate(0),
        afterTerminal: "checkmate",
      }).classification,
    ).toBe("best");
  });

  it("uses best with a low-confidence caveat for a forced move", () => {
    expect(
      classify({
        bestMoveUci: "d2d4",
        playedUci: "e2e4",
        before: cp(500),
        after: cp(0),
        legalMoveCount: 1,
      }),
    ).toMatchObject({
      classification: "best",
      confidence: "low",
      caveat: "Only legal move.",
    });
  });

  it("lowers confidence when depth is below target", () => {
    expect(classify({ depth: 12, targetDepth: 14 }).confidence).toBe("medium");
    expect(classify({ depth: 9, targetDepth: 14 }).confidence).toBe("low");
  });

  it("adds a threshold caveat near a boundary", () => {
    expect(
      classify({ bestMoveUci: "d2d4", before: cp(21), after: cp(0) }).caveat,
    ).toContain("threshold");
  });
});
