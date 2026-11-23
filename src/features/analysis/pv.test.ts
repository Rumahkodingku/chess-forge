import { describe, expect, it } from "vitest";
import { applyPv } from "@/features/analysis/pv";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("applyPv", () => {
  it("applies a principal variation up to a step", () => {
    expect(applyPv(START_FEN, ["e2e4", "e7e5"], 0)).toMatchObject({
      fen: START_FEN,
      sans: [],
    });
    expect(applyPv(START_FEN, ["e2e4", "e7e5"], 1)).toMatchObject({
      sans: ["e4"],
    });
    const second = applyPv(START_FEN, ["e2e4", "e7e5"], 2);
    expect(second.sans).toEqual(["e4", "e5"]);
    expect(second.fen).toContain("4p3");
  });

  it("stops at an invalid PV move", () => {
    expect(applyPv(START_FEN, ["e2e4", "not-a-move"], 2).sans).toEqual(["e4"]);
  });
});
