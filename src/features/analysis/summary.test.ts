import { describe, expect, it } from "vitest";
import { buildGameSummary } from "@/features/analysis/summary";
import type { MoveAssessment } from "@/features/analysis/types";
import { parseSinglePgn } from "@/features/games/pgn";

const CONFIGURATION = {
  depth: 14,
  multiPv: 1,
  threads: 1,
  hashMb: 32,
  perspective: "white" as const,
};

const GAME = parseSinglePgn(`[Event "Summary"]
[White "White"]
[Black "Black"]
[Result "1-0"]
[Termination "White won by checkmate"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0`);

function assessment(
  ply: number,
  classification: MoveAssessment["classification"],
  overrides: Partial<MoveAssessment> = {},
): MoveAssessment {
  return {
    id: crypto.randomUUID(),
    gameId: GAME.id,
    ply,
    evaluationBefore: { type: "cp", value: 100, perspective: "white" },
    evaluationAfter: { type: "cp", value: 0, perspective: "white" },
    centipawnLoss: 100,
    classification,
    candidateBrilliant: false,
    confidence: "high",
    engineVersion: "Stockfish 19",
    engineConfiguration: CONFIGURATION,
    depth: 14,
    createdAt: "2026-11-23T00:00:00.000Z",
    schemaVersion: 2,
    ...overrides,
  };
}

describe("buildGameSummary", () => {
  it("summarises counts, swings, and critical moments deterministically", () => {
    const summary = buildGameSummary({
      game: GAME,
      assessments: [
        assessment(1, "best", {
          centipawnLoss: 0,
          evaluationAfter: { type: "cp", value: 100, perspective: "white" },
        }),
        assessment(2, "mistake", {
          centipawnLoss: 150,
          evaluationAfter: { type: "cp", value: 50, perspective: "white" },
        }),
        assessment(3, "blunder", {
          centipawnLoss: 300,
          evaluationAfter: { type: "cp", value: -200, perspective: "white" },
        }),
        assessment(4, "excellent", {
          centipawnLoss: 10,
          candidateBrilliant: true,
          brilliantDecision: "pending",
          evaluationAfter: { type: "cp", value: 0, perspective: "white" },
        }),
        assessment(5, "best", {
          centipawnLoss: 0,
          evaluationAfter: { type: "cp", value: 0, perspective: "white" },
        }),
        assessment(6, "best", {
          centipawnLoss: 0,
          evaluationAfter: { type: "cp", value: 0, perspective: "white" },
        }),
      ],
      opening: {
        eco: "C60",
        name: "Ruy Lopez",
        epd: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -",
        ply: 5,
      },
    });

    expect(summary.classificationCounts).toMatchObject({
      best: 3,
      excellent: 1,
      mistake: 1,
      blunder: 1,
    });
    expect(summary.criticalMoments[0]?.ply).toBe(3);
    expect(summary.criticalMoments).toHaveLength(2);
    expect(summary.candidateBrilliantCount).toBe(1);
    expect(summary.opening?.name).toBe("Ruy Lopez");
    expect(summary.text).toContain("Ruy Lopez (C60)");
    expect(summary.text).toContain("heuristic");
    expect(summary.text).not.toMatch(/wanted|intended|decided to/i);
    expect(summary.caveats.length).toBeGreaterThan(0);
  });

  it("returns a partial summary before analysis exists", () => {
    const summary = buildGameSummary({
      game: GAME,
      assessments: [],
      opening: null,
    });
    expect(summary.moveCount).toBe(6);
    expect(summary.text).toContain("not been analysed");
  });
});
