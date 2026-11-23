import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type {
  MoveAssessment,
  PositionAnalysis,
} from "@/features/analysis/types";
import { DEFAULT_ENGINE_CONFIGURATION } from "@/features/analysis/types";
import { parseSinglePgn } from "@/features/games/pgn";
import { DEFAULT_SETTINGS } from "@/features/settings/types";
import {
  closeChessForgeDatabase,
  createAssetRepository,
  createGameRepository,
  createMoveAssessmentRepository,
  createPositionAnalysisRepository,
  createProjectRepository,
  createSettingsRepository,
  createTemplateRepository,
  deleteChessForgeDatabase,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { createWalkingSkeletonProject } from "@/features/studio/project-factory";
import { BUILT_IN_TEMPLATES } from "@/features/templates/builtins";

const PGN = `[Event "Storage test"]
[White "White"]
[Black "Black"]
[Result "1-0"]

1. e4 e5 1-0`;

describe("IndexedDB repositories", () => {
  beforeEach(async () => {
    await deleteChessForgeDatabase();
  });

  afterAll(async () => {
    await closeChessForgeDatabase();
  });

  it("saves, reads, lists, and deletes a game", async () => {
    const db = await openChessForgeDatabase();
    const repository = createGameRepository(db);
    const game = parseSinglePgn(PGN);

    await repository.save(game);
    expect(await repository.getById(game.id)).toMatchObject({
      id: game.id,
      schemaVersion: 1,
    });
    expect(await repository.list()).toHaveLength(1);

    await repository.delete(game.id);
    expect(await repository.getById(game.id)).toBeUndefined();
  });

  it("persists import warnings on a game", async () => {
    const db = await openChessForgeDatabase();
    const repository = createGameRepository(db);
    const game = parseSinglePgn(PGN);
    const warned = {
      ...game,
      importStatus: "valid-with-warnings" as const,
      importWarnings: ["Decoded as Windows-1252."],
    };

    await repository.save(warned);
    expect(await repository.getById(game.id)).toMatchObject({
      importStatus: "valid-with-warnings",
      importWarnings: ["Decoded as Windows-1252."],
    });
  });

  it("round trips position analyses by cache key", async () => {
    const db = await openChessForgeDatabase();
    const repository = createPositionAnalysisRepository(db);
    const analysis: PositionAnalysis = {
      cacheKey: "test-cache-key",
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      engineVersion: "Stockfish 19",
      engineConfiguration: DEFAULT_ENGINE_CONFIGURATION,
      depth: 14,
      seldepth: 18,
      nodes: 1200,
      nps: 800,
      timeMs: 1500,
      score: { type: "cp", value: 34, perspective: "white" },
      bestMoveUci: "e2e4",
      principalVariations: [],
      createdAt: "2026-11-23T00:00:00.000Z",
      schemaVersion: 1,
    };

    await repository.save(analysis);
    expect(await repository.get(analysis.cacheKey)).toEqual(analysis);
  });

  it("deletes a corrupt cached analysis and returns a miss", async () => {
    const db = await openChessForgeDatabase();
    const repository = createPositionAnalysisRepository(db);
    await db.put("positionAnalyses", { cacheKey: "broken" } as never);

    expect(await repository.get("broken")).toBeUndefined();
    expect(await db.get("positionAnalyses", "broken")).toBeUndefined();
  });

  it("replaces assessments for one game without touching another", async () => {
    const db = await openChessForgeDatabase();
    const repository = createMoveAssessmentRepository(db);
    const gameId = crypto.randomUUID();
    const otherGameId = crypto.randomUUID();
    const base: MoveAssessment = {
      id: crypto.randomUUID(),
      gameId,
      ply: 1,
      evaluationBefore: { type: "cp", value: 20, perspective: "white" },
      evaluationAfter: { type: "cp", value: 20, perspective: "white" },
      centipawnLoss: 0,
      classification: "best",
      candidateBrilliant: false,
      confidence: "high",
      engineVersion: "Stockfish 19",
      engineConfiguration: DEFAULT_ENGINE_CONFIGURATION,
      depth: 14,
      createdAt: "2026-11-23T00:00:00.000Z",
      schemaVersion: 2,
    };
    const second = { ...base, id: crypto.randomUUID(), ply: 2 };
    const other = { ...base, id: crypto.randomUUID(), gameId: otherGameId };

    await repository.replaceForGame(gameId, [base, second]);
    await repository.replaceForGame(otherGameId, [other]);
    await repository.replaceForGame(gameId, [second]);

    expect(await repository.listByGame(gameId)).toEqual([second]);
    expect(await repository.listByGame(otherGameId)).toEqual([other]);
  });

  it("persists application settings", async () => {
    const db = await openChessForgeDatabase();
    const repository = createSettingsRepository(db);
    await repository.save(DEFAULT_SETTINGS);
    expect(await repository.get()).toEqual(DEFAULT_SETTINGS);
  });

  it("round trips a project with its game snapshot", async () => {
    const db = await openChessForgeDatabase();
    const game = parseSinglePgn(PGN);
    const project = createWalkingSkeletonProject({ game, selectedPly: 1 });
    const repository = createProjectRepository(db);

    await repository.save(project);
    const stored = await repository.getById(project.id);

    expect(stored?.id).toBe(project.id);
    expect(stored?.gameSnapshot?.moves).toHaveLength(game.moves.length);
    expect(stored?.scenes[0]?.durationInFrames).toBe(90);
  });

  it("reports an invalid project on save", async () => {
    const db = await openChessForgeDatabase();
    const game = parseSinglePgn(PGN);
    const project = createWalkingSkeletonProject({ game, selectedPly: 1 });
    const repository = createProjectRepository(db);

    await expect(
      repository.save({ ...project, name: "" } as never),
    ).rejects.toThrow("Project changes could not be saved");
  });

  it("normalises a v1 project at the repository boundary", async () => {
    const db = await openChessForgeDatabase();
    const repository = createProjectRepository(db);
    const game = parseSinglePgn(PGN);
    const project = createWalkingSkeletonProject({ game, selectedPly: 1 });
    const legacy = {
      ...project,
      projectVersion: 1,
      schemaVersion: 1,
      audioTracks: undefined,
      scenes: project.scenes.map((scene) => ({
        id: scene.id,
        type: scene.type,
        startFrame: scene.startFrame,
        durationInFrames: scene.durationInFrames,
        moveRange: scene.moveRange,
        boardState: {
          fen: scene.boardState.fen,
          orientation: scene.boardState.orientation,
        },
        camera: { zoom: 1, x: 0, y: 0 },
        annotations: [],
        textOverlays: scene.textOverlays.map((overlay) => ({
          id: overlay.id,
          kind: overlay.kind,
          text: overlay.text,
          position: overlay.position,
          startFrame: overlay.startFrame,
          durationInFrames: overlay.durationInFrames,
        })),
        effects: {
          lastMoveHighlight: true,
          checkIndicator: true,
          captureEmphasis: true,
          glow: false,
        },
        audioReferences: [],
        overrides: {},
        schemaVersion: 1,
      })),
    };
    await db.put("projects", legacy as never);

    const stored = await repository.getById(project.id);
    expect(stored?.projectVersion).toBe(3);
    expect(stored?.scenes[0]?.timing.leadInFrames).toBe(10);
    expect(stored?.scenes[0]?.boardState.theme).toBe("forge");
  });

  it("round trips a custom template", async () => {
    const db = await openChessForgeDatabase();
    const repository = createTemplateRepository(db);
    const source = BUILT_IN_TEMPLATES[0];
    if (!source) throw new Error("Missing built-in template");
    const custom = {
      ...source,
      id: crypto.randomUUID(),
      name: "Custom template",
      isBuiltIn: false,
    };
    await repository.save(custom);
    expect((await repository.getById(custom.id))?.name).toBe("Custom template");
    expect(
      (await repository.list()).some((item) => item.id === custom.id),
    ).toBe(true);
    await repository.delete(custom.id);
    expect(await repository.getById(custom.id)).toBeUndefined();
  });

  it("deduplicates assets by hash lookup", async () => {
    const db = await openChessForgeDatabase();
    const repository = createAssetRepository(db);
    const asset = {
      id: crypto.randomUUID(),
      kind: "audio" as const,
      mimeType: "audio/wav",
      size: 4,
      hash: "test-hash",
      createdAt: new Date().toISOString(),
      data: new Blob(["test"], { type: "audio/wav" }),
    };

    await repository.save(asset);
    expect(await repository.findByHash("test-hash")).toMatchObject({
      id: asset.id,
      hash: "test-hash",
    });
  });

  it("rejects schema drift when reading a stored game", async () => {
    const db = await openChessForgeDatabase();
    const repository = createGameRepository(db);
    await db.put("games", { id: "broken" } as never);
    await expect(repository.getById("broken")).rejects.toThrow();
  });
});
