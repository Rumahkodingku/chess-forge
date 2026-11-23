import { describe, expect, it } from "vitest";
import type { AssetRecord, AssetRepository } from "@/features/storage/db";
import {
  hashBlob,
  importAudioAsset,
  validateAudioFile,
} from "@/features/studio/audio/audio-upload";

function repo(): AssetRepository {
  const assets = new Map<string, AssetRecord>();
  return {
    getById: async (id) => assets.get(id),
    findByHash: async (hash) =>
      [...assets.values()].find((asset) => asset.hash === hash),
    save: async (asset) => {
      assets.set(asset.id, asset);
    },
    delete: async (id) => {
      assets.delete(id);
    },
  };
}

const base = {
  name: "music.mp3",
  type: "audio/mpeg",
  size: 1024,
  durationSeconds: 30,
};

describe("audio upload", () => {
  it("accepts a supported audio file", () => {
    expect(validateAudioFile(base)).toBeNull();
  });

  it("rejects unsupported MIME, size, duration, and project quota", () => {
    expect(validateAudioFile({ ...base, type: "text/plain" })).toContain(
      "not a supported",
    );
    expect(validateAudioFile({ ...base, size: 60 * 1024 * 1024 })).toContain(
      "larger than 50 MB",
    );
    expect(validateAudioFile({ ...base, durationSeconds: 601 })).toContain(
      "longer than 10 minutes",
    );
    expect(validateAudioFile(base, 250 * 1024 * 1024)).toContain("250 MB");
  });

  it("hashes identical blobs to the same value", async () => {
    const first = await hashBlob(new Blob(["same"]));
    const second = await hashBlob(new Blob(["same"]));
    expect(first).toBe(second);
  });

  it("deduplicates an existing asset by hash", async () => {
    const repository = repo();
    const file = new File(["audio"], "music.mp3", { type: "audio/mpeg" });
    const first = await importAudioAsset({
      file,
      durationSeconds: 30,
      projectBytes: 0,
      repository,
    });
    const second = await importAudioAsset({
      file,
      durationSeconds: 30,
      projectBytes: 0,
      repository,
    });
    expect(second.asset.id).toBe(first.asset.id);
    expect(second.asset.kind).toBe("audio");
  });
});
