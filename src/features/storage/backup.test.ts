import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { parseSinglePgn } from "@/features/games/pgn";
import { DEFAULT_SETTINGS } from "@/features/settings/types";
import {
  exportApplicationBackup,
  importApplicationBackup,
} from "@/features/storage/backup";
import {
  createGameRepository,
  createLearningProgressRepository,
  createLibraryNoteRepository,
  createRepertoireRepository,
  createSettingsRepository,
  deleteChessForgeDatabase,
  openChessForgeDatabase,
} from "@/features/storage/db";

const PGN = `[Event "Backup test"]
[White "White"]
[Black "Black"]
[Result "1-0"]

1. e4 e5 1-0`;

describe("application backup", () => {
  beforeEach(async () => {
    await deleteChessForgeDatabase();
  });

  afterAll(async () => {
    await deleteChessForgeDatabase();
  });

  it("exports and restores games, library data, settings, and assets", async () => {
    const db = await openChessForgeDatabase();
    const game = parseSinglePgn(PGN);
    await createGameRepository(db).save(game);
    await createSettingsRepository(db).save(DEFAULT_SETTINGS);
    await createLibraryNoteRepository(db).save({
      id: crypto.randomUUID(),
      targetType: "game",
      targetId: game.id,
      targetLabel: "Backup test",
      body: "Keep this note.",
      tags: [],
      pinned: false,
      createdAt: "2026-11-25T00:00:00.000Z",
      updatedAt: "2026-11-25T00:00:00.000Z",
      schemaVersion: 1,
    });
    await createRepertoireRepository(db).save({
      id: crypto.randomUUID(),
      name: "Backup line",
      side: "white",
      startFen: game.initialFen,
      moves: [{ san: "e4", uci: "e2e4" }],
      notes: "",
      priority: "core",
      tags: [],
      createdAt: "2026-11-25T00:00:00.000Z",
      updatedAt: "2026-11-25T00:00:00.000Z",
      schemaVersion: 1,
    });
    await createLearningProgressRepository(db).save({
      id: "puzzle:test",
      itemType: "puzzle",
      itemId: "test",
      attempts: 1,
      correct: 1,
      streak: 1,
      intervalDays: 1,
      nextReviewAt: "2026-11-26T00:00:00.000Z",
      createdAt: "2026-11-25T00:00:00.000Z",
      updatedAt: "2026-11-25T00:00:00.000Z",
      schemaVersion: 1,
    });
    const backup = await exportApplicationBackup();
    expect(backup.size).toBeGreaterThan(0);

    await deleteChessForgeDatabase();
    await importApplicationBackup(backup);

    const restored = await openChessForgeDatabase();
    expect(await createGameRepository(restored).getById(game.id)).toMatchObject(
      {
        id: game.id,
      },
    );
    expect(await createSettingsRepository(restored).get()).toMatchObject({
      playerNames: [],
    });
    expect(
      await createLibraryNoteRepository(restored).listByTarget("game", game.id),
    ).toHaveLength(1);
    expect(await createRepertoireRepository(restored).list()).toHaveLength(1);
    expect(
      await createLearningProgressRepository(restored).get("puzzle", "test"),
    ).toMatchObject({ id: "puzzle:test" });
  });

  it("rejects a file that is not a ChessForge backup", async () => {
    await expect(
      importApplicationBackup(
        new Blob(["not a zip"], { type: "application/zip" }),
      ),
    ).rejects.toThrow();
  });
});
