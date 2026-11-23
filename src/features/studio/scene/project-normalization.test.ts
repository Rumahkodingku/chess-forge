import { describe, expect, it, vi } from "vitest";
import { R1_FIXTURE_PGN } from "@/features/games/fixtures/r1-walking-skeleton";
import { parseSinglePgn } from "@/features/games/pgn";
import { normalizeProject } from "@/features/studio/scene/project-normalization";
import { videoProjectSchema } from "@/features/studio/scene/scene.types";
import { BUILT_IN_TEMPLATES } from "@/features/templates/builtins";
import { toTemplateSnapshot } from "@/features/templates/snapshot";
import { createId } from "@/lib/id";

const game = parseSinglePgn(R1_FIXTURE_PGN, "pgn-text", "R4 migration");
const assetId = createId();

const legacyProject = {
  id: createId(),
  name: "Legacy project",
  sourceGameId: game.id,
  templateId: "r1-skeleton",
  projectVersion: 1,
  canvas: { aspectRatio: "9:16", width: 1080, height: 1920 },
  frameRate: 30,
  scenes: [
    {
      id: createId(),
      type: "move",
      startFrame: 0,
      durationInFrames: 90,
      moveRange: { fromPly: 1, toPly: 1 },
      boardState: {
        fen: game.moves[0]?.fenBefore,
        orientation: "w",
        lastMove: "e2e4",
      },
      camera: { zoom: 1, x: 0, y: 0 },
      annotations: [],
      textOverlays: [
        {
          id: createId(),
          kind: "move-label",
          text: "1. e4",
          position: "bottom",
          startFrame: 0,
          durationInFrames: 90,
        },
      ],
      effects: {
        lastMoveHighlight: true,
        checkIndicator: true,
        captureEmphasis: true,
        glow: false,
      },
      audioReferences: [
        {
          assetId,
          startFrame: 10,
          durationInFrames: 20,
          volume: 0.5,
        },
      ],
      overrides: {},
      schemaVersion: 1,
    },
  ],
  tracks: { text: [], annotation: [], audio: [] },
  assets: [
    {
      id: assetId,
      kind: "audio",
      mimeType: "audio/wav",
      size: 10,
      hash: "hash",
      createdAt: "2026-11-23T00:00:00.000Z",
    },
  ],
  createdAt: "2026-11-23T00:00:00.000Z",
  updatedAt: "2026-11-23T00:00:00.000Z",
  schemaVersion: 1,
};

describe("normalizeProject", () => {
  it("migrates a v1 project to scene v2 and project v3", () => {
    const project = normalizeProject(legacyProject);
    expect(videoProjectSchema.safeParse(project).success).toBe(true);
    expect(project.projectVersion).toBe(3);
    expect(project.schemaVersion).toBe(3);
    const scene = project.scenes[0];
    expect(scene?.schemaVersion).toBe(2);
    expect(scene?.boardState.theme).toBe("forge");
    expect(scene?.boardState.coordinates).toBe(true);
    expect(scene?.timing).toEqual({
      leadInFrames: 10,
      moveDurationFrames: 45,
      gapFrames: 0,
      holdFrames: 35,
      easing: "easeInOut",
    });
    expect(scene?.camera.keyframes).toHaveLength(2);
    expect(scene?.textOverlays[0]?.font).toBe("display");
    expect(scene?.effects.checkmateEmphasis).toBe(true);
    expect(scene?.audioEvents).toHaveLength(1);
    expect(scene?.audioEvents[0]?.trigger).toBe("move");
    expect(project.audioTracks).toHaveLength(1);
    expect(project.audioTracks[0]).toMatchObject({
      kind: "sfx",
      source: { type: "asset", assetId },
      startFrame: 10,
      durationInFrames: 20,
      volume: 0.5,
    });
  });

  it("is idempotent", () => {
    const once = normalizeProject(legacyProject);
    const twice = normalizeProject(once);
    expect(twice).toEqual(once);
  });

  it("keeps v2 fields intact", () => {
    const once = normalizeProject(legacyProject);
    expect(normalizeProject(once)).toEqual(once);
  });

  it("skips invalid camera keyframes and keeps valid ones", () => {
    const input = structuredClone(legacyProject);
    (input.scenes[0] as { camera: unknown }).camera = {
      keyframes: [
        { frame: 0, zoom: 1, x: 0, y: 0, easing: "linear" },
        { frame: 1, zoom: 99, x: 0, y: 0, easing: "linear" },
      ],
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const scene = normalizeProject(input).scenes[0];
    expect(scene?.camera.keyframes).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith("Skipped 1 invalid camera keyframe(s).");
    warn.mockRestore();
  });

  it("clamps annotation timing to the scene and drops late annotations", () => {
    const input = structuredClone(legacyProject);
    (input.scenes[0] as { annotations: unknown }).annotations = [
      {
        id: "late-end",
        type: "square",
        square: "e4",
        color: "red",
        startFrame: 80,
        durationInFrames: 20,
      },
      {
        id: "past-end",
        type: "square",
        square: "e5",
        color: "red",
        startFrame: 90,
        durationInFrames: 20,
      },
    ];
    const scene = normalizeProject(input).scenes[0];
    expect(scene?.annotations).toHaveLength(1);
    expect(scene?.annotations[0]).toMatchObject({
      id: "late-end",
      durationInFrames: 10,
    });
  });

  it("corrects the scene FEN from the move range", () => {
    const input = structuredClone(legacyProject);
    (input as { gameSnapshot?: unknown }).gameSnapshot = {
      metadata: game.metadata,
      initialFen: game.initialFen,
      moves: game.moves,
    };
    input.scenes[0].moveRange = { fromPly: 2, toPly: 2 };
    const scene = normalizeProject(input).scenes[0];
    expect(scene?.boardState.fen).toBe(game.moves[1]?.fenBefore);
  });

  it("rejects a move range outside the game snapshot", () => {
    const input = structuredClone(legacyProject);
    (input as { gameSnapshot?: unknown }).gameSnapshot = {
      metadata: game.metadata,
      initialFen: game.initialFen,
      moves: game.moves,
    };
    input.scenes[0].moveRange = { fromPly: 99, toPly: 99 };
    expect(() => normalizeProject(input)).toThrow(/outside the game snapshot/);
  });

  it("fits legacy timing into a short scene", () => {
    const input = structuredClone(legacyProject);
    input.scenes[0].durationInFrames = 40;
    const scene = normalizeProject(input).scenes[0];
    expect(scene?.durationInFrames).toBe(40);
    expect(scene?.timing.moveDurationFrames).toBe(30);
    expect(scene?.textOverlays[0]?.durationInFrames).toBe(40);
  });

  it("normalises a v2 project to v3 with a null template", () => {
    const current = normalizeProject(legacyProject);
    const v2 = {
      ...current,
      projectVersion: 2,
      schemaVersion: 2,
      template: undefined,
    };
    const project = normalizeProject(v2);
    expect(project.projectVersion).toBe(3);
    expect(project.schemaVersion).toBe(3);
    expect(project.template).toBeNull();
  });

  it("preserves a valid template snapshot", () => {
    const template = BUILT_IN_TEMPLATES[0];
    if (!template) throw new Error("Missing built-in template");
    const current = normalizeProject(legacyProject);
    const project = normalizeProject({
      ...current,
      template: toTemplateSnapshot(template),
      templateId: template.id,
    });
    expect(project.template?.id).toBe(template.id);
    expect(project.templateId).toBe(template.id);
  });
});
