import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { z } from "zod";
import {
  moveAssessmentSchema,
  positionAnalysisSchema,
} from "@/features/analysis/types";
import { gameSchema } from "@/features/games/types";
import {
  learningProgressSchema,
  libraryNoteSchema,
  repertoireLineSchema,
} from "@/features/library/schemas";
import { normalizeApplicationSettings } from "@/features/settings/types";
import {
  type AssetRecord,
  DB_VERSION,
  openChessForgeDatabase,
  toStorageError,
} from "@/features/storage/db";
import { normalizeProject } from "@/features/studio/scene/project-normalization";
import { normalizeTemplate } from "@/features/templates/normalization";
import { ValidationError } from "@/lib/errors";

const BACKUP_FORMAT = "chessforge-backup";
const BACKUP_VERSION = 1;
const MAX_BACKUP_BYTES = 512 * 1024 * 1024;

export const BACKUP_STORES = [
  "games",
  "positionAnalyses",
  "moveAssessments",
  "projects",
  "templates",
  "assets",
  "settings",
  "meta",
  "libraryNotes",
  "repertoireLines",
  "learningProgress",
] as const;

const backupManifestSchema = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    version: z.literal(BACKUP_VERSION),
    schemaVersion: z.number().int().positive(),
    createdAt: z.string().min(1),
    counts: z.record(z.string(), z.number().int().nonnegative()),
  })
  .strict();

type BackupStore = (typeof BACKUP_STORES)[number];

const backupAssetMetadataSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["audio", "image"]),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  hash: z.string().min(1),
  createdAt: z.string().min(1),
});

const backupAssetSchema = backupAssetMetadataSchema.extend({
  // Blob identity differs across browser, jsdom, and fake-indexeddb realms.
  data: z.custom<Blob>((value) => value !== undefined && value !== null),
});

const keyValueRecordSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

const backupStoreParsers: Record<BackupStore, (record: unknown) => unknown> = {
  games: (record) => gameSchema.parse(record),
  positionAnalyses: (record) => positionAnalysisSchema.parse(record),
  moveAssessments: (record) => moveAssessmentSchema.parse(record),
  projects: (record) => normalizeProject(record),
  templates: (record) => {
    const template = normalizeTemplate(record);
    if (!template) {
      throw new Error("The template record is invalid.");
    }
    return template;
  },
  assets: (record) => backupAssetSchema.parse(record),
  settings: (record) => {
    const { key, value } = keyValueRecordSchema.parse(record);
    return { key, value: normalizeApplicationSettings(value) };
  },
  meta: (record) => keyValueRecordSchema.parse(record),
  libraryNotes: (record) => libraryNoteSchema.parse(record),
  repertoireLines: (record) => repertoireLineSchema.parse(record),
  learningProgress: (record) => learningProgressSchema.parse(record),
};

function invalidBackupRecord(store: BackupStore): ValidationError {
  return new ValidationError(
    `The backup contains an invalid ${store} record.`,
    "Use a backup created by a compatible ChessForge version.",
  );
}

export interface BackupSummary {
  createdAt: string;
  counts: Record<string, number>;
}

function toBlobPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array(await blob.arrayBuffer());
  }
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error("The asset could not be read."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed."));
    reader.readAsArrayBuffer(blob);
  });
}

function readBackupAssets(
  entries: Record<string, Uint8Array>,
  records: unknown[],
): AssetRecord[] {
  return records.map((record) => {
    let metadata: z.infer<typeof backupAssetMetadataSchema>;
    try {
      metadata = backupAssetMetadataSchema.parse(record);
    } catch {
      throw invalidBackupRecord("assets");
    }
    const bytes = entries[`assets/${metadata.id}`];
    if (!bytes) {
      throw new ValidationError(
        "The backup is missing an asset file.",
        "Use a complete application backup.",
      );
    }
    return {
      ...metadata,
      data: new Blob([toBlobPart(bytes)], { type: metadata.mimeType }),
    };
  });
}

export async function exportApplicationBackup(): Promise<Blob> {
  const db = await openChessForgeDatabase();
  const data: Record<string, unknown[]> = {};
  for (const store of BACKUP_STORES) {
    data[store] = (await db.getAll(store)) as unknown[];
  }

  const assets = (data.assets ?? []) as AssetRecord[];
  const assetFiles: Record<string, Uint8Array> = {};
  data.assets = [];
  for (const asset of assets) {
    const { data: blob, ...meta } = asset;
    data.assets.push(meta);
    assetFiles[`assets/${asset.id}`] = await blobBytes(blob);
  }

  const createdAt = new Date().toISOString();
  const counts = Object.fromEntries(
    BACKUP_STORES.map((store) => [store, data[store]?.length ?? 0]),
  );
  const manifest = backupManifestSchema.parse({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    schemaVersion: DB_VERSION,
    createdAt,
    counts,
  });
  const zipped = zipSync({
    "manifest.json": strToU8(JSON.stringify(manifest)),
    "data.json": strToU8(JSON.stringify(data)),
    ...assetFiles,
  });
  return new Blob([toBlobPart(zipped)], { type: "application/zip" });
}

export async function importApplicationBackup(
  file: Blob,
): Promise<BackupSummary> {
  let entries: Record<string, Uint8Array>;
  try {
    let totalBytes = 0;
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: (entry) => {
        totalBytes += entry.originalSize;
        return totalBytes <= MAX_BACKUP_BYTES;
      },
    });
  } catch {
    throw new ValidationError(
      "The backup file is not a readable ChessForge archive.",
      "Choose a .chessforge ZIP export created by ChessForge.",
    );
  }

  const manifestBytes = entries["manifest.json"];
  const dataBytes = entries["data.json"];
  if (!manifestBytes || !dataBytes) {
    throw new ValidationError(
      "The backup is missing its manifest or data file.",
      "Export a fresh backup from ChessForge and try again.",
    );
  }

  let manifest: z.infer<typeof backupManifestSchema>;
  try {
    manifest = backupManifestSchema.parse(JSON.parse(strFromU8(manifestBytes)));
  } catch {
    throw new ValidationError(
      "The backup manifest is invalid or uses an unsupported version.",
      "Use a backup created by a compatible ChessForge version.",
    );
  }

  let data: Record<string, unknown[]>;
  try {
    const parsed = JSON.parse(strFromU8(dataBytes));
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid data");
    data = parsed as Record<string, unknown[]>;
  } catch {
    throw new ValidationError(
      "The backup data cannot be read.",
      "Export a fresh backup and try again.",
    );
  }

  for (const store of BACKUP_STORES) {
    if (!Array.isArray(data[store])) {
      throw new ValidationError(
        `The backup is missing the ${store} data.`,
        "Use a complete application backup.",
      );
    }
  }

  data.assets = readBackupAssets(entries, data.assets);

  const records = {} as Record<BackupStore, unknown[]>;
  for (const store of BACKUP_STORES) {
    records[store] = data[store].map((record) => {
      try {
        return backupStoreParsers[store](record);
      } catch {
        throw invalidBackupRecord(store);
      }
    });
  }

  const db = await openChessForgeDatabase();
  const transaction = db.transaction(BACKUP_STORES, "readwrite");
  try {
    for (const store of BACKUP_STORES) {
      await transaction.objectStore(store).clear();
      for (const record of records[store]) {
        await transaction.objectStore(store).put(record as never);
      }
    }
    await transaction.done;
  } catch (error) {
    // Aborting rejects transaction.done; handle it before the rollback.
    transaction.done.catch(() => {});
    try {
      transaction.abort();
    } catch {
      // A failed transaction is already aborting.
    }
    throw toStorageError(error);
  }

  return { createdAt: manifest.createdAt, counts: manifest.counts };
}
