import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
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
  createProjectRepository,
  createRepertoireRepository,
  createSettingsRepository,
  deleteChessForgeDatabase,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { createWalkingSkeletonProject } from "@/features/studio/project-factory";

const PGN = `[Event "Backup test"]
[White "White"]
[Black "Black"]
[Result "1-0"]

1. e4 e5 1-0`;

async function backupEntries(
  backup: Blob,
): Promise<Record<string, Uint8Array>> {
  return unzipSync(new Uint8Array(await backup.arrayBuffer()));
}

function backupFromEntries(entries: Record<string, Uint8Array>): Blob {
  const zipped = zipSync(entries);
  const buffer = zipped.buffer.slice(
    zipped.byteOffset,
    zipped.byteOffset + zipped.byteLength,
  ) as ArrayBuffer;
  return new Blob([buffer], { type: "application/zip" });
}

async function saveGameAndProject() {
  const db = await openChessForgeDatabase();
  const game = parseSinglePgn(PGN);
  await createGameRepository(db).save(game);
  const project = createWalkingSkeletonProject({ game, selectedPly: 1 });
  await createProjectRepository(db).save(project);
  return { game, project };
}

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

  it("rejects a backup with an invalid store record and keeps existing data", async () => {
    const { game, project } = await saveGameAndProject();
    const entries = await backupEntries(await exportApplicationBackup());
    const data = JSON.parse(strFromU8(entries["data.json"])) as {
      projects: unknown[];
    };
    data.projects = [{ id: "not-a-project" }];
    entries["data.json"] = strToU8(JSON.stringify(data));

    await expect(
      importApplicationBackup(backupFromEntries(entries)),
    ).rejects.toThrow("invalid");

    const db = await openChessForgeDatabase();
    expect(await createGameRepository(db).getById(game.id)).toMatchObject({
      id: game.id,
    });
    expect(await createProjectRepository(db).getById(project.id)).toMatchObject(
      { id: project.id },
    );
  });

  it("rejects an unsupported manifest version before writing", async () => {
    const { game } = await saveGameAndProject();
    const entries = await backupEntries(await exportApplicationBackup());
    const manifest = JSON.parse(strFromU8(entries["manifest.json"])) as {
      version: number;
    };
    manifest.version = 2;
    entries["manifest.json"] = strToU8(JSON.stringify(manifest));

    await expect(
      importApplicationBackup(backupFromEntries(entries)),
    ).rejects.toThrow("unsupported version");

    const db = await openChessForgeDatabase();
    expect(await createGameRepository(db).getById(game.id)).toMatchObject({
      id: game.id,
    });
  });

  it("rolls back the restore when a write fails", async () => {
    const { game, project } = await saveGameAndProject();
    const backup = await exportApplicationBackup();
    const originalPut = IDBObjectStore.prototype.put;
    let writes = 0;
    const put = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(function (
        this: IDBObjectStore,
        value: unknown,
        key?: IDBValidKey,
      ) {
        writes += 1;
        if (writes === 2) {
          throw new DOMException("Injected write failure.", "DataError");
        }
        return originalPut.call(this, value, key);
      });

    try {
      await expect(importApplicationBackup(backup)).rejects.toThrow();
    } finally {
      put.mockRestore();
    }

    const db = await openChessForgeDatabase();
    expect(await createGameRepository(db).getById(game.id)).toMatchObject({
      id: game.id,
    });
    expect(await createProjectRepository(db).getById(project.id)).toMatchObject(
      { id: project.id },
    );
  });
});
