import { describe, expect, it } from "vitest";
import { detectThreats } from "@/features/analysis/threats";

const MATE_IN_ONE_FEN =
  "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2";
const BISHOP_EN_PRISE_FEN =
  "rnbqkb1r/pppppppp/5n2/8/4B3/8/PPPP1PPP/RNBQK1NR b KQkq - 0 1";
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("detectThreats", () => {
  it("detects a forced mate from the engine PV", () => {
    expect(
      detectThreats({
        fen: MATE_IN_ONE_FEN,
        pv: ["d8h4"],
        ply: 3,
        mover: "w",
      }),
    ).toEqual([
      {
        kind: "mate",
        forced: true,
        ply: 3,
        san: "Qh4#",
        uci: "d8h4",
        line: ["Qh4#"],
        description: "Forced mate: Qh4#.",
        confidence: "high",
      },
    ]);
  });

  it("detects a forced material win from the engine PV", () => {
    const threats = detectThreats({
      fen: BISHOP_EN_PRISE_FEN,
      pv: ["f6e4", "d1e2"],
      ply: 1,
      mover: "w",
    });
    expect(threats[0]).toMatchObject({
      kind: "material",
      forced: true,
      san: "Nxe4",
      uci: "f6e4",
      materialDelta: 300,
      line: ["Nxe4", "Qe2"],
      confidence: "high",
    });
  });

  it("adds a heuristic hanging-piece warning outside the PV", () => {
    const threats = detectThreats({
      fen: BISHOP_EN_PRISE_FEN,
      pv: ["d7d5"],
      ply: 1,
      mover: "w",
    });
    expect(threats).toContainEqual(
      expect.objectContaining({
        kind: "hanging",
        forced: false,
        san: "Nxe4",
        materialDelta: 300,
        confidence: "medium",
      }),
    );
  });

  it("returns no threats for a quiet position", () => {
    expect(
      detectThreats({ fen: START_FEN, pv: ["e2e4"], ply: 0, mover: "b" }),
    ).toEqual([]);
  });

  it("caps the result at three threats", () => {
    const threats = detectThreats({
      fen: BISHOP_EN_PRISE_FEN,
      pv: ["d7d5"],
      ply: 1,
      mover: "w",
    });
    expect(threats.length).toBeLessThanOrEqual(3);
  });
});
