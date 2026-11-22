import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { parseSinglePgn } from "@/features/games/pgn";
import { DEFAULT_SETTINGS } from "@/features/settings/types";
import {
  closeChessForgeDatabase,
  createAssetRepository,
  createGameRepository,
  createProjectRepository,
  createSettingsRepository,
  deleteChessForgeDatabase,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { createWalkingSkeletonProject } from "@/features/studio/project-factory";

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
