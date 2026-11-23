import { describe, expect, it } from "vitest";
import { R1_FIXTURE_PGN } from "@/features/games/fixtures/r1-walking-skeleton";
import { parseSinglePgn } from "@/features/games/pgn";
import { generateProject } from "@/features/studio/creation/generate-project";
import { updateScene } from "@/features/studio/editing/scene-editing";
import {
  applyTemplateStyle,
  regenerateScenes,
} from "@/features/templates/apply";
import { BUILT_IN_TEMPLATES } from "@/features/templates/builtins";
import {
  duplicateTemplate,
  renameTemplate,
  templateFromProject,
  updateTemplateFromProject,
} from "@/features/templates/custom";

const game = parseSinglePgn(R1_FIXTURE_PGN);

function template(id: string) {
  const found = BUILT_IN_TEMPLATES.find((item) => item.id === id);
  if (!found) throw new Error(`Missing template ${id}`);
  return found;
}

describe("template application", () => {
  it("applies style but preserves overridden fields", () => {
    const project = generateProject({
      game,
      template: template("cinematic-chess"),
      selection: { mode: "full" },
    });
    const scene = project.scenes[1];
    if (!scene) throw new Error("Missing scene");
    const overridden = updateScene(
      project,
      scene.id,
      "boardState",
      (current) => ({
        ...current,
        boardState: { ...current.boardState, theme: "classic" },
      }),
    );
    const next = applyTemplateStyle(
      overridden,
      template("minimalist-analysis"),
    );
    expect(next.template?.id).toBe("minimalist-analysis");
    expect(next.scenes[1]?.boardState.theme).toBe("classic");
    expect(next.scenes[1]?.effects).toEqual(
      template("minimalist-analysis").style.effects,
    );
  });

  it("regenerates scenes from the stored source selection", () => {
    const project = generateProject({
      game,
      template: template("cinematic-chess"),
      selection: { mode: "range", fromPly: 1, toPly: 5 },
    });
    const next = regenerateScenes(project, template("tactical-breakdown"));
    expect(next.template?.id).toBe("tactical-breakdown");
    expect(next.scenes.length).toBeGreaterThan(0);
    expect(next.scenes[1]?.moveRange).toEqual({ fromPly: 1, toPly: 2 });
  });

  it("refuses to regenerate without a source selection", () => {
    const project = generateProject({
      game,
      template: template("cinematic-chess"),
      selection: { mode: "full" },
    });
    expect(() =>
      regenerateScenes(
        { ...project, sourceSelection: undefined },
        template("tactical-breakdown"),
      ),
    ).toThrow(/no source selection/);
  });
});

describe("custom templates", () => {
  it("captures rules and style without scenes or move ids", () => {
    const project = generateProject({
      game,
      template: template("game-recap"),
      selection: { mode: "full" },
    });
    const custom = templateFromProject({
      project,
      name: "My recap",
      description: "Reusable recap",
    });
    expect(custom?.isBuiltIn).toBe(false);
    expect(custom?.name).toBe("My recap");
    expect(custom?.sceneRules.movesPerScene).toBe(
      project.template?.sceneRules.movesPerScene,
    );
    expect(JSON.stringify(custom)).not.toContain(project.scenes[0]?.id);
    expect(JSON.stringify(custom)).not.toContain("moveRange");
  });

  it("updates rules and bumps the version", () => {
    const project = generateProject({
      game,
      template: template("game-recap"),
      selection: { mode: "full" },
    });
    const custom = templateFromProject({ project, name: "Custom" });
    if (!custom) throw new Error("Missing custom template");
    const updated = updateTemplateFromProject(custom, project);
    expect(updated.id).toBe(custom.id);
    expect(updated.version).toBe(custom.version + 1);
  });

  it("duplicates and renames custom templates", () => {
    const custom = templateFromProject({
      project: generateProject({
        game,
        template: template("game-recap"),
        selection: { mode: "full" },
      }),
      name: "Custom",
    });
    if (!custom) throw new Error("Missing custom template");
    const copy = duplicateTemplate(custom);
    expect(copy.id).not.toBe(custom.id);
    expect(copy.name).toContain("copy");
    expect(renameTemplate(copy, "Renamed").name).toBe("Renamed");
  });
});
