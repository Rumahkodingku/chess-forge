import { describe, expect, it } from "vitest";
import { buildMoveAssessment } from "@/features/analysis/assessment";
import type { PositionAnalysis } from "@/features/analysis/types";

const CONFIGURATION = {
  depth: 14,
  multiPv: 1,
  threads: 1,
  hashMb: 32,
  perspective: "white" as const,
};

function analysis(overrides: Partial<PositionAnalysis> = {}): PositionAnalysis {
  return {
    cacheKey: "cache",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    engineVersion: "Stockfish 19",
    engineConfiguration: CONFIGURATION,
    depth: 14,
    score: { type: "cp", value: 20, perspective: "white" },
    bestMoveUci: "e2e4",
    principalVariations: [
      {
        multipv: 1,
        score: { type: "cp", value: 20, perspective: "white" },
        pv: ["e2e4", "e7e5"],
        depth: 14,
      },
    ],
    createdAt: "2026-11-23T00:00:00.000Z",
    schemaVersion: 1,
    ...overrides,
  };
}

describe("buildMoveAssessment", () => {
  it("builds a persisted assessment from before and after analyses", () => {
    const assessment = buildMoveAssessment({
      gameId: crypto.randomUUID(),
      ply: 1,
      mover: "w",
      playedUci: "e2e4",
      fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      before: analysis(),
      after: analysis({
        score: { type: "cp", value: 20, perspective: "white" },
      }),
      inOpeningBook: true,
    });
    expect(assessment).toMatchObject({
      ply: 1,
      classification: "best",
      centipawnLoss: 0,
      candidateBrilliant: false,
      engineVersion: "Stockfish 19",
      schemaVersion: 2,
    });
  });

  it("preserves an accepted Candidate Brilliant decision", () => {
    const assessment = buildMoveAssessment({
      gameId: crypto.randomUUID(),
      ply: 1,
      mover: "w",
      playedUci: "d1h5",
      fenBefore: "4k3/8/6p1/8/8/8/8/3QK3 w - - 0 1",
      fenAfter: "4k3/8/6p1/7Q/8/8/8/4K3 b - - 1 1",
      before: analysis({
        score: { type: "cp", value: 120, perspective: "white" },
        bestMoveUci: "d1h5",
      }),
      after: analysis({
        fen: "4k3/8/6p1/7Q/8/8/8/4K3 b - - 1 1",
        score: { type: "cp", value: 100, perspective: "white" },
        bestMoveUci: undefined,
        principalVariations: [],
      }),
      inOpeningBook: false,
      existingDecision: "accepted",
    });
    expect(assessment).toMatchObject({
      candidateBrilliant: true,
      brilliantDecision: "accepted",
      classification: "best",
    });
  });

  it("keeps an accepted decision even when the heuristic no longer flags it", () => {
    const assessment = buildMoveAssessment({
      gameId: crypto.randomUUID(),
      ply: 1,
      mover: "w",
      playedUci: "e2e4",
      fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      before: analysis(),
      after: analysis(),
      inOpeningBook: true,
      existingDecision: "accepted",
    });
    expect(assessment.candidateBrilliant).toBe(false);
    expect(assessment.brilliantDecision).toBe("accepted");
  });

  it("handles a terminal checkmate after the move", () => {
    const assessment = buildMoveAssessment({
      gameId: crypto.randomUUID(),
      ply: 1,
      mover: "w",
      playedUci: "d1h5",
      fenBefore: "4k3/8/6p1/8/8/8/8/3QK3 w - - 0 1",
      fenAfter: "4k3/8/6p1/7Q/8/8/8/4K3 b - - 1 1",
      before: analysis({
        score: { type: "cp", value: 300, perspective: "white" },
        bestMoveUci: "d1h5",
      }),
      after: analysis({
        fen: "4k3/8/6p1/7Q/8/8/8/4K3 b - - 1 1",
        score: { type: "mate", value: 0, perspective: "white" },
        bestMoveUci: undefined,
        principalVariations: [],
        terminal: "checkmate",
        terminalWinner: "w",
      }),
      inOpeningBook: true,
    });
    expect(assessment.classification).toBe("best");
    expect(assessment.threats).toBeUndefined();
  });
});
