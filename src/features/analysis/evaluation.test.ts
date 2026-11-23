import { describe, expect, it } from "vitest";
import {
  evaluationBarShare,
  formatEvaluationForPerspective,
  toDisplayEvaluation,
} from "@/features/analysis/evaluation";
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

describe("evaluation display", () => {
  it("keeps White perspective values unchanged", () => {
    expect(toDisplayEvaluation(cp(34), "w", "white")).toEqual(cp(34));
  });

  it("converts side-to-move values for Black", () => {
    expect(toDisplayEvaluation(cp(34), "b", "side-to-move")).toEqual(cp(-34));
    expect(toDisplayEvaluation(mate(-3), "b", "side-to-move")).toEqual(mate(3));
  });

  it("formats the active perspective", () => {
    expect(formatEvaluationForPerspective(cp(34), "w", "white")).toBe("+0.34");
    expect(formatEvaluationForPerspective(cp(34), "b", "side-to-move")).toBe(
      "-0.34",
    );
    expect(formatEvaluationForPerspective(mate(-3), "w", "white")).toBe("-M3");
  });

  it("maps centipawns to a bounded bar share", () => {
    expect(evaluationBarShare(cp(0))).toBeCloseTo(0.5, 5);
    expect(evaluationBarShare(cp(400))).toBeGreaterThan(0.7);
    expect(evaluationBarShare(cp(-400))).toBeLessThan(0.3);
    expect(evaluationBarShare(cp(5000))).toBeGreaterThan(0.9);
    expect(evaluationBarShare(cp(-5000))).toBeLessThan(0.1);
  });

  it("uses full bars for mate scores", () => {
    expect(evaluationBarShare(mate(2))).toBe(1);
    expect(evaluationBarShare(mate(-2))).toBe(0);
  });
});
