import { Blob as NodeBlob } from "node:buffer";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { parseSinglePgn } from "@/features/games/pgn";
import {
  type AssetRecord,
  createAssetRepository,
  createProjectRepository,
  deleteChessForgeDatabase,
  openChessForgeDatabase,
} from "@/features/storage/db";
import {
  exportProjectBackup,
  inspectProjectBackup,
  restoreProjectBackup,
} from "@/features/storage/project-backup";
import { hashBlob } from "@/features/studio/audio/audio-upload";
import { createWalkingSkeletonProject } from "@/features/studio/project-factory";
import type { VideoProject } from "@/features/studio/scene/scene.types";

const PGN = `[Event "Project backup test"]
[White "White"]
[Black "Black"]
[Result "1-0"]

1. e4 e5 1-0`;

const CREATED_AT = "2026-11-25T00:00:00.000Z";

function audioAsset(id: string, contents: string): AssetRecord {
  // fake-indexeddb does not clone jsdom Blobs; a native Blob survives storage.
  const data = new NodeBlob([contents], {
    type: "audio/wav",
  }) as unknown as Blob;
  return {
    id,
    kind: "audio",
    mimeType: "audio/wav",
    size: data.size,
    hash: `hash-${id}`,
    createdAt: CREATED_AT,
    data,
  };
}

async function hashedAudioAsset(
  id: string,
  contents: string,
): Promise<AssetRecord> {
  const data = new NodeBlob([contents], {
    type: "audio/wav",
  }) as unknown as Blob;
  return {
    id,
    kind: "audio",
    mimeType: "audio/wav",
    size: data.size,
    hash: await hashBlob(data),
    createdAt: CREATED_AT,
    data,
  };
}

async function saveProjectWithAudio(
  name = "Project backup test",
): Promise<{ project: VideoProject; asset: AssetRecord }> {
  const db = await openChessForgeDatabase();
  const base = createWalkingSkeletonProject({
    game: parseSinglePgn(PGN),
    selectedPly: 1,
  });
  const asset = await hashedAudioAsset(
    "11111111-1111-4111-8111-111111111111",
    `audio-${name}`,
  );
  await createAssetRepository(db).save(asset);
  const { data: _data, ...metadata } = asset;
  await createProjectRepository(db).save({
    ...base,
    name,
    assets: [metadata],
    audioTracks: [
      {
        id: "track-1",
        kind: "music",
        source: { type: "asset", assetId: asset.id },
        startFrame: 0,
        durationInFrames: 30,
        volume: 0.5,
        muted: false,
        loop: false,
      },
    ],
  });
  const project = await createProjectRepository(db).getById(base.id);
  if (!project) throw new Error("Project fixture was not saved.");
  return { project, asset };
}

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

describe("project backup", () => {
  beforeEach(async () => {
    await deleteChessForgeDatabase();
  });

  afterAll(async () => {
    await deleteChessForgeDatabase();
  });

  it("exports a project ZIP with a manifest and only referenced assets", async () => {
    const db = await openChessForgeDatabase();
    const project = createWalkingSkeletonProject({
      game: parseSinglePgn(PGN),
      selectedPly: 1,
    });
    const referenced = audioAsset(
      "11111111-1111-4111-8111-111111111111",
      "referenced",
    );
    const unused = audioAsset("22222222-2222-4222-8222-222222222222", "unused");
    const assets = createAssetRepository(db);
    await assets.save(referenced);
    await assets.save(unused);
    await createProjectRepository(db).save({
      ...project,
      assets: [referenced, unused].map(({ data: _data, ...meta }) => meta),
      audioTracks: [
        {
          id: "track-1",
          kind: "music",
          source: { type: "asset", assetId: referenced.id },
          startFrame: 0,
          durationInFrames: 30,
          volume: 0.5,
          muted: false,
          loop: false,
        },
      ],
    });

    const backup = await exportProjectBackup(project.id);
    const entries = unzipSync(new Uint8Array(await backup.arrayBuffer()));

    expect(entries["manifest.json"]).toBeDefined();
    expect(entries["project.json"]).toBeDefined();
    expect(entries[`assets/${referenced.id}`]).toBeDefined();
    expect(entries[`assets/${unused.id}`]).toBeUndefined();
    expect(
      Object.keys(entries).filter((name) => name.startsWith("assets/")),
    ).toEqual([`assets/${referenced.id}`]);

    const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
    expect(manifest).toMatchObject({
      format: "chessforge-project",
      version: 1,
      projectId: project.id,
      projectName: project.name,
    });

    const exported = JSON.parse(strFromU8(entries["project.json"]));
    expect(exported.id).toBe(project.id);
    expect(exported.assets.map((asset: { id: string }) => asset.id)).toEqual([
      referenced.id,
    ]);
  });

  it("rejects a project that references a missing audio asset", async () => {
    const db = await openChessForgeDatabase();
    const project = createWalkingSkeletonProject({
      game: parseSinglePgn(PGN),
      selectedPly: 1,
    });
    const missingId = "44444444-4444-4444-8444-444444444444";
    await createProjectRepository(db).save({
      ...project,
      audioTracks: [
        {
          id: "track-1",
          kind: "music",
          source: { type: "asset", assetId: missingId },
          startFrame: 0,
          durationInFrames: 30,
          volume: 0.5,
          muted: false,
          loop: false,
        },
      ],
    });

    await expect(exportProjectBackup(project.id)).rejects.toThrow(
      "references a missing audio asset",
    );
  });

  it("rejects a project that does not exist", async () => {
    await expect(
      exportProjectBackup("33333333-3333-4333-8333-333333333333"),
    ).rejects.toThrow("The project could not be found");
  });

  describe("restore", () => {
    it("rejects a backup with an invalid manifest", async () => {
      const { project } = await saveProjectWithAudio();
      const entries = await backupEntries(
        await exportProjectBackup(project.id),
      );
      entries["manifest.json"] = strToU8(
        JSON.stringify({ format: "chessforge-project", version: 2 }),
      );

      await expect(
        inspectProjectBackup(backupFromEntries(entries)),
      ).rejects.toThrow("manifest");
    });

    it("restores a project as a copy with a new ID when the original exists", async () => {
      const { project, asset } = await saveProjectWithAudio();
      const backup = await exportProjectBackup(project.id);

      const inspection = await inspectProjectBackup(backup);
      expect(inspection.exists).toBe(true);
      expect(inspection.assetCount).toBe(1);
      expect(inspection.project.id).toBe(project.id);

      const result = await restoreProjectBackup(backup, "copy");
      expect(result.mode).toBe("copy");
      expect(result.projectId).not.toBe(project.id);

      const db = await openChessForgeDatabase();
      const projects = createProjectRepository(db);
      const restored = await projects.getById(result.projectId);
      expect(restored?.name).toBe(project.name);
      expect(restored?.audioTracks[0]?.source).toEqual({
        type: "asset",
        assetId: asset.id,
      });
      expect(await projects.list()).toHaveLength(2);
      expect(await createAssetRepository(db).getById(asset.id)).toBeDefined();
    });

    it("overwrites an existing project", async () => {
      const { project, asset } = await saveProjectWithAudio();
      const backup = await exportProjectBackup(project.id);
      const db = await openChessForgeDatabase();
      const projects = createProjectRepository(db);
      await projects.save({ ...project, name: "Locally changed" });

      const result = await restoreProjectBackup(backup, "overwrite");
      expect(result).toEqual({ projectId: project.id, mode: "overwrite" });

      const stored = await projects.list();
      expect(stored).toHaveLength(1);
      expect(stored[0]?.name).toBe(project.name);
      expect(stored[0]?.audioTracks[0]?.source).toEqual({
        type: "asset",
        assetId: asset.id,
      });
      expect(await createAssetRepository(db).getById(asset.id)).toBeDefined();
    });

    it("rejects a missing asset file before writing", async () => {
      const { project, asset } = await saveProjectWithAudio();
      const entries = await backupEntries(
        await exportProjectBackup(project.id),
      );
      delete entries[`assets/${asset.id}`];
      const broken = backupFromEntries(entries);

      await expect(inspectProjectBackup(broken)).rejects.toThrow("missing");
      await expect(restoreProjectBackup(broken, "overwrite")).rejects.toThrow(
        "missing",
      );

      const db = await openChessForgeDatabase();
      expect(
        (await createProjectRepository(db).getById(project.id))?.name,
      ).toBe(project.name);
      expect(await createAssetRepository(db).getById(asset.id)).toBeDefined();
    });

    it("rejects an asset file that does not match its checksum", async () => {
      const { project, asset } = await saveProjectWithAudio();
      const entries = await backupEntries(
        await exportProjectBackup(project.id),
      );
      entries[`assets/${asset.id}`] = strToU8("tampered");

      await expect(
        inspectProjectBackup(backupFromEntries(entries)),
      ).rejects.toThrow("checksum");
    });
  });
});
