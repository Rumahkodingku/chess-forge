import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { z } from "zod";
import {
  type AssetRecord,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { ValidationError } from "@/lib/errors";

const BACKUP_FORMAT = "chessforge-backup";
const BACKUP_VERSION = 1;

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
    schemaVersion: 2,
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
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
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

  const assets = data.assets as Array<Omit<AssetRecord, "data">>;
  data.assets = assets.map((meta) => {
    const bytes = entries[`assets/${meta.id}`];
    if (!bytes) {
      throw new ValidationError(
        "The backup is missing an asset file.",
        "Use a complete application backup.",
      );
    }
    return {
      ...meta,
      data: new Blob([toBlobPart(bytes)], { type: meta.mimeType }),
    } satisfies AssetRecord;
  });

  const db = await openChessForgeDatabase();
  const transaction = db.transaction(BACKUP_STORES, "readwrite");
  for (const store of BACKUP_STORES) {
    await transaction.objectStore(store).clear();
    for (const record of data[store]) {
      await transaction.objectStore(store).put(record as never);
    }
  }
  await transaction.done;

  return { createdAt: manifest.createdAt, counts: manifest.counts };
}
