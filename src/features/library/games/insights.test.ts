import { describe, expect, it } from "vitest";
import type { MoveAssessment } from "@/features/analysis/types";
import { DEFAULT_ENGINE_CONFIGURATION } from "@/features/analysis/types";
import { parseSinglePgn } from "@/features/games/pgn";
import { buildGameInsights } from "@/features/library/games/insights";

const game = parseSinglePgn(`[Event "Insight"]
[White "Riot"]
[Black "Opponent"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0`);

function assessment(
  ply: number,
  classification: MoveAssessment["classification"],
  cpl?: number,
): MoveAssessment {
  return {
    id: crypto.randomUUID(),
    gameId: game.id,
    ply,
    evaluationBefore: { type: "cp", value: 20, perspective: "white" },
    evaluationAfter: { type: "cp", value: 10, perspective: "white" },
    centipawnLoss: cpl,
    classification,
    candidateBrilliant: false,
    confidence: "medium",
    engineVersion: "test",
    engineConfiguration: DEFAULT_ENGINE_CONFIGURATION,
    depth: 10,
    createdAt: "2026-11-24T00:00:00.000Z",
    schemaVersion: 2,
  };
}

describe("game insights", () => {
  it("aggregates opening, phase, and user mistakes", () => {
    const insights = buildGameInsights({
      game,
      assessments: [
        assessment(1, "best", 0),
        assessment(2, "good", 20),
        assessment(3, "blunder", 300),
        assessment(4, "mistake", 120),
      ],
      opening: {
        eco: "C60",
        name: "Ruy Lopez",
        epd: "test",
        ply: 4,
      },
      userSide: "w",
    });
    expect(insights.openingInsights[0]).toMatchObject({
      eco: "C60",
      name: "Ruy Lopez",
      asWhite: 1,
    });
    expect(
      insights.phaseInsights.some((phase) => phase.phase === "opening"),
    ).toBe(true);
    expect(insights.mistakes.map((mistake) => mistake.ply)).toEqual([3]);
  });

  it("does not train mistakes when the user side is unknown", () => {
    const insights = buildGameInsights({
      game,
      assessments: [assessment(3, "blunder", 300)],
      opening: null,
      userSide: null,
    });
    expect(insights.mistakes).toEqual([]);
    expect(insights.caveats.some((caveat) => caveat.includes("side"))).toBe(
      true,
    );
  });
});
