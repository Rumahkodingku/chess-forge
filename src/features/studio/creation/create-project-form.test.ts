import { describe, expect, it } from "vitest";
import { R1_FIXTURE_PGN } from "@/features/games/fixtures/r1-walking-skeleton";
import { parseSinglePgn } from "@/features/games/pgn";
import {
  buildSourceSelection,
  initialFormState,
} from "@/features/studio/creation/create-project-form";

const game = parseSinglePgn(R1_FIXTURE_PGN);

describe("create project form", () => {
  it("switches a moment default to full when no moments exist", () => {
    const form = initialFormState(null, game.moves.length, {
      sourceMode: "moments",
      leadInPlies: 2,
      trailInPlies: 2,
    });
    expect(form.sourceMode).toBe("full");
    expect(form.moments).toEqual([]);
  });

  it("builds a clipped manual range", () => {
    const form = {
      ...initialFormState(null, game.moves.length, {
        sourceMode: "range",
        leadInPlies: 0,
        trailInPlies: 0,
      }),
      fromPly: 0,
      toPly: 99,
    };
    expect(buildSourceSelection(form, game)).toEqual({
      mode: "range",
      fromPly: 1,
      toPly: game.moves.length,
    });
  });

  it("builds a moment selection with normalised offsets", () => {
    const form = {
      ...initialFormState(null, game.moves.length, {
        sourceMode: "moments",
        leadInPlies: 0,
        trailInPlies: 0,
      }),
      sourceMode: "moments" as const,
      moments: [{ ply: 3, san: "Nf3" }],
      leadInPlies: 2.8,
      trailInPlies: -1,
    };
    expect(buildSourceSelection(form, game)).toEqual({
      mode: "moments",
      moments: [{ ply: 3, san: "Nf3" }],
      leadInPlies: 2,
      trailInPlies: 0,
    });
  });
});
