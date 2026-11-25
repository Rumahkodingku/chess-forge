import { Blob as NodeBlob } from "node:buffer";
import { strFromU8, unzipSync } from "fflate";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { parseSinglePgn } from "@/features/games/pgn";
import {
  type AssetRecord,
  createAssetRepository,
  createProjectRepository,
  deleteChessForgeDatabase,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { exportProjectBackup } from "@/features/storage/project-backup";
import { createWalkingSkeletonProject } from "@/features/studio/project-factory";

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

  it("rejects a project that does not exist", async () => {
    await expect(
      exportProjectBackup("33333333-3333-4333-8333-333333333333"),
    ).rejects.toThrow("The project could not be found");
  });
});
