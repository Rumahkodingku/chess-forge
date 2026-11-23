import { describe, expect, it } from "vitest";
import { mergeAssessments } from "@/features/analysis/assessment-set";
import type { MoveAssessment } from "@/features/analysis/types";

function assessment(ply: number): MoveAssessment {
  return {
    id: crypto.randomUUID(),
    gameId: crypto.randomUUID(),
    ply,
    evaluationBefore: { type: "cp", value: 0, perspective: "white" },
    evaluationAfter: { type: "cp", value: 0, perspective: "white" },
    centipawnLoss: 0,
    classification: "best",
    candidateBrilliant: false,
    confidence: "high",
    engineVersion: "Stockfish 19",
    engineConfiguration: {
      depth: 6,
      multiPv: 1,
      threads: 1,
      hashMb: 32,
      perspective: "white",
    },
    depth: 6,
    createdAt: "2026-11-23T00:00:00.000Z",
    schemaVersion: 2,
  };
}

describe("mergeAssessments", () => {
  it("keeps later plies when a partial run returns earlier plies", () => {
    const merged = mergeAssessments(
      [assessment(1), assessment(2), assessment(3)],
      [assessment(1)],
    );
    expect(merged.map((item) => item.ply)).toEqual([1, 2, 3]);
  });

  it("replaces a ply with the newer assessment", () => {
    const older = assessment(2);
    const newer = { ...assessment(2), classification: "mistake" as const };
    const merged = mergeAssessments([older], [newer]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual(newer);
  });
});
