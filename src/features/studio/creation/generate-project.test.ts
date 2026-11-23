import { describe, expect, it } from "vitest";
import { R1_FIXTURE_PGN } from "@/features/games/fixtures/r1-walking-skeleton";
import { parseSinglePgn } from "@/features/games/pgn";
import {
  defaultSelectionForTemplate,
  generateProject,
  renderTemplateText,
} from "@/features/studio/creation/generate-project";
import {
  momentBlocks,
  selectSourcePlies,
} from "@/features/studio/creation/source-selection";
import type {
  SourceSelection,
  TemplateSceneRules,
} from "@/features/studio/scene/scene.types";
import { videoProjectSchema } from "@/features/studio/scene/scene.types";
import { BUILT_IN_TEMPLATES } from "@/features/templates/builtins";

const game = parseSinglePgn(R1_FIXTURE_PGN, "pgn-text", "R5 generation");

function rules(
  overrides: Partial<TemplateSceneRules> = {},
): TemplateSceneRules {
  return {
    defaultSourceMode: "full",
    movesPerScene: 3,
    includeIntro: true,
    includeOutro: true,
    introDurationInFrames: 45,
    outroDurationInFrames: 45,
    leadInPlies: 1,
    trailInPlies: 1,
    ...overrides,
  };
}

function template(id: string) {
  const found = BUILT_IN_TEMPLATES.find((item) => item.id === id);
  if (!found) throw new Error(`Missing template ${id}`);
  return found;
}

describe("source selection", () => {
  it("groups a full game with a final partial block", () => {
    const blocks = selectSourcePlies(game, { mode: "full" }, rules());
    expect(blocks).toEqual([
      { fromPly: 1, toPly: 3 },
      { fromPly: 4, toPly: 6 },
      { fromPly: 7, toPly: 9 },
      { fromPly: 10, toPly: 10 },
    ]);
  });

  it("merges overlapping moment blocks", () => {
    const blocks = momentBlocks(
      game.moves.length,
      [
        { ply: 2, san: "e5" },
        { ply: 4, san: "Nc6" },
      ],
      1,
      1,
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ fromPly: 1, toPly: 5 });
  });

  it("rejects an inverted manual range", () => {
    expect(() =>
      selectSourcePlies(game, { mode: "range", fromPly: 5, toPly: 2 }, rules()),
    ).toThrow(/outside the game/);
  });

  it("falls back to the full game when moments are empty", () => {
    const selection: SourceSelection = {
      mode: "moments",
      moments: [],
      leadInPlies: 2,
      trailInPlies: 2,
    };
    expect(selectSourcePlies(game, selection, rules())).toHaveLength(4);
  });
});

describe("project generation", () => {
  it("generates intro, grouped move scenes, and outro", () => {
    const project = generateProject({
      game,
      template: template("cinematic-chess"),
      selection: { mode: "full" },
    });
    expect(videoProjectSchema.safeParse(project).success).toBe(true);
    expect(project.projectVersion).toBe(3);
    expect(project.template?.id).toBe("cinematic-chess");
    expect(project.scenes.map((scene) => scene.type)).toEqual([
      "intro",
      "move",
      "move",
      "move",
      "outro",
    ]);
    expect(project.scenes[1]?.moveRange).toEqual({ fromPly: 1, toPly: 4 });
    expect(project.scenes[1]?.boardState.fen).toBe(game.moves[0]?.fenBefore);
    expect(project.scenes[1]?.startFrame).toBe(
      project.scenes[0]?.durationInFrames,
    );
  });

  it("uses the selected template canvas and frame rate", () => {
    const project = generateProject({
      game,
      template: template("minimalist-analysis"),
      selection: { mode: "range", fromPly: 1, toPly: 4 },
    });
    expect(project.canvas).toEqual({
      aspectRatio: "9:16",
      width: 1080,
      height: 1920,
    });
    expect(project.frameRate).toBe(30);
    expect(project.scenes.some((scene) => scene.type === "move")).toBe(true);
  });

  it("generates an analysis scene with a moment annotation", () => {
    const project = generateProject({
      game,
      template: template("tactical-breakdown"),
      summary: {
        opening: { eco: "C60", name: "Ruy Lopez" },
        criticalMoments: [
          { ply: 3, san: "Nf3", classification: "good", reason: "Develops." },
        ],
      } as never,
      selection: {
        mode: "moments",
        moments: [
          { ply: 3, san: "Nf3", classification: "good", reason: "Develops." },
        ],
        leadInPlies: 2,
        trailInPlies: 2,
      },
    });
    const scene = project.scenes.find((item) => item.type === "analysis");
    expect(scene?.moveRange).toEqual({ fromPly: 1, toPly: 5 });
    expect(scene?.annotations[0]?.from).toBe("g1");
    expect(
      scene?.textOverlays.some((overlay) => overlay.text === "Develops."),
    ).toBe(true);
  });

  it("derives defaults from the template source mode", () => {
    expect(defaultSelectionForTemplate(template("cinematic-chess"))).toEqual({
      mode: "full",
    });
    expect(defaultSelectionForTemplate(template("opening-tutorial"))).toEqual({
      mode: "range",
      fromPly: 1,
      toPly: 10,
    });
    expect(
      defaultSelectionForTemplate(template("game-recap"), {
        criticalMoments: [{ ply: 3, san: "Nf3" }],
      } as never),
    ).toMatchObject({ mode: "moments" });
  });

  it("replaces known text tokens and leaves unknown tokens", () => {
    expect(
      renderTemplateText("{white} vs {black} · {unknown}", {
        white: "A",
        black: "B",
        result: "*",
        opening: "Test",
        eco: "X",
        san: "",
        moveNumber: "",
        classification: "",
        reason: "",
        plyCount: "1",
      }),
    ).toBe("A vs B · {unknown}");
  });
});
