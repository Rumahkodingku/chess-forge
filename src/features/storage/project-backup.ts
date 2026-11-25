import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { z } from "zod";
import {
  type AssetRecord,
  createAssetRepository,
  createProjectRepository,
  DB_VERSION,
  openChessForgeDatabase,
  toStorageError,
} from "@/features/storage/db";
import { hashBlob } from "@/features/studio/audio/audio-upload";
import {
  type VideoProject,
  videoProjectSchema,
} from "@/features/studio/scene/scene.types";
import { ValidationError } from "@/lib/errors";
import { createId } from "@/lib/id";

const PROJECT_BACKUP_FORMAT = "chessforge-project";
const PROJECT_BACKUP_VERSION = 1;

export interface ProjectBackupManifest {
  format: "chessforge-project";
  version: 1;
  schemaVersion: number;
  createdAt: string;
  projectId: string;
  projectName: string;
}

export interface ProjectBackupInspection {
  manifest: ProjectBackupManifest;
  project: VideoProject;
  assetCount: number;
  exists: boolean;
}

export type ProjectRestoreMode = "copy" | "overwrite";

const projectBackupManifestSchema = z
  .object({
    format: z.literal(PROJECT_BACKUP_FORMAT),
    version: z.literal(PROJECT_BACKUP_VERSION),
    schemaVersion: z.number().int().positive(),
    createdAt: z.string().min(1),
    projectId: z.string().uuid(),
    projectName: z.string().min(1),
  })
  .strict();

interface ProjectBackupContents {
  manifest: ProjectBackupManifest;
  project: VideoProject;
  assets: AssetRecord[];
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

function assetMetadata({
  data: _data,
  ...metadata
}: AssetRecord): Omit<AssetRecord, "data"> {
  return metadata;
}

export async function exportProjectBackup(projectId: string): Promise<Blob> {
  const db = await openChessForgeDatabase();
  const project = await createProjectRepository(db).getById(projectId);
  if (!project) {
    throw new ValidationError(
      "The project could not be found.",
      "Open the project from the studio list and export it again.",
    );
  }

  const assetIds = [
    ...new Set(
      project.audioTracks.flatMap((track) =>
        track.source.type === "asset" ? [track.source.assetId] : [],
      ),
    ),
  ];
  const assets = createAssetRepository(db);
  const assetFiles: Record<string, Uint8Array> = {};
  const projectAssets: Array<Omit<AssetRecord, "data">> = [];
  for (const assetId of assetIds) {
    const asset = await assets.getById(assetId);
    if (!asset) {
      throw new ValidationError(
        `The project references a missing audio asset (${assetId}).`,
        "Re-upload the audio file, then export the project again.",
      );
    }
    assetFiles[`assets/${asset.id}`] = await blobBytes(asset.data);
    projectAssets.push(assetMetadata(asset));
  }

  const manifest: ProjectBackupManifest = {
    format: PROJECT_BACKUP_FORMAT,
    version: PROJECT_BACKUP_VERSION,
    schemaVersion: DB_VERSION,
    createdAt: new Date().toISOString(),
    projectId: project.id,
    projectName: project.name,
  };
  const zipped = zipSync({
    "manifest.json": strToU8(JSON.stringify(manifest)),
    "project.json": strToU8(
      JSON.stringify({ ...project, assets: projectAssets }),
    ),
    ...assetFiles,
  });
  return new Blob([toBlobPart(zipped)], { type: "application/zip" });
}

async function readProjectBackup(file: Blob): Promise<ProjectBackupContents> {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new ValidationError(
      "The project backup is not a readable ChessForge archive.",
      "Choose a .chessforge file created by ChessForge.",
    );
  }

  const manifestBytes = entries["manifest.json"];
  const projectBytes = entries["project.json"];
  if (!manifestBytes || !projectBytes) {
    throw new ValidationError(
      "The project backup is missing its manifest or project file.",
      "Export a fresh project backup from ChessForge and try again.",
    );
  }

  let manifest: ProjectBackupManifest;
  try {
    manifest = projectBackupManifestSchema.parse(
      JSON.parse(strFromU8(manifestBytes)),
    );
  } catch {
    throw new ValidationError(
      "The project backup manifest is invalid or uses an unsupported version.",
      "Use a project backup created by a compatible ChessForge version.",
    );
  }

  let project: VideoProject;
  try {
    project = videoProjectSchema.parse(JSON.parse(strFromU8(projectBytes)));
  } catch {
    throw new ValidationError(
      "The project data in the backup is invalid.",
      "Export a fresh project backup from ChessForge and try again.",
    );
  }

  if (project.id !== manifest.projectId) {
    throw new ValidationError(
      "The project backup manifest does not match its project.",
      "Use a complete project backup created by ChessForge.",
    );
  }

  const referenced = new Set(
    project.audioTracks.flatMap((track) =>
      track.source.type === "asset" ? [track.source.assetId] : [],
    ),
  );
  const assets: AssetRecord[] = [];
  for (const metadata of project.assets) {
    const bytes = entries[`assets/${metadata.id}`];
    if (!bytes) {
      throw new ValidationError(
        `The project backup is missing the audio file for ${metadata.id}.`,
        "Export a project backup that includes all project audio, then retry.",
      );
    }
    const data = new Blob([toBlobPart(bytes)], { type: metadata.mimeType });
    if ((await hashBlob(data)) !== metadata.hash) {
      throw new ValidationError(
        `The audio file ${metadata.id} does not match its recorded checksum.`,
        "Export the project again from ChessForge and retry the restore.",
      );
    }
    referenced.delete(metadata.id);
    assets.push({ ...metadata, data });
  }
  if (referenced.size > 0) {
    const [missing] = referenced;
    throw new ValidationError(
      `The project references a missing audio asset (${missing}).`,
      "Export a project backup that includes all project audio, then retry.",
    );
  }

  return { manifest, project, assets };
}

export async function inspectProjectBackup(
  file: Blob,
): Promise<ProjectBackupInspection> {
  const { manifest, project, assets } = await readProjectBackup(file);
  const db = await openChessForgeDatabase();
  const existing = await db.get("projects", project.id);
  return {
    manifest,
    project,
    assetCount: assets.length,
    exists: existing !== undefined,
  };
}

export async function restoreProjectBackup(
  file: Blob,
  mode: ProjectRestoreMode,
): Promise<{ projectId: string; mode: ProjectRestoreMode }> {
  const { project, assets } = await readProjectBackup(file);
  const db = await openChessForgeDatabase();
  const transaction = db.transaction(["projects", "assets"], "readwrite");

  try {
    const projects = transaction.objectStore("projects");
    const storedAssets = transaction.objectStore("assets");
    const existing = await projects.get(project.id);
    const projectId = existing && mode === "copy" ? createId() : project.id;

    const assetIdMap = new Map<string, string>();
    const restoredAssets: Array<Omit<AssetRecord, "data">> = [];
    for (const asset of assets) {
      const byHash = await storedAssets.index("hash").get(asset.hash);
      const reusable = byHash?.kind === asset.kind ? byHash : undefined;
      if (reusable) {
        assetIdMap.set(asset.id, reusable.id);
        const { data: _data, ...metadata } = reusable;
        restoredAssets.push(metadata);
        continue;
      }

      const occupied = await storedAssets.get(asset.id);
      const assetId =
        occupied && occupied.hash !== asset.hash ? createId() : asset.id;
      const record: AssetRecord = { ...asset, id: assetId };
      await storedAssets.put(record);
      assetIdMap.set(asset.id, assetId);
      const { data: _data, ...metadata } = record;
      restoredAssets.push(metadata);
    }

    const restored: VideoProject = {
      ...project,
      id: projectId,
      assets: restoredAssets,
      audioTracks: project.audioTracks.map((track) =>
        track.source.type === "asset"
          ? {
              ...track,
              source: {
                type: "asset",
                assetId:
                  assetIdMap.get(track.source.assetId) ?? track.source.assetId,
              },
            }
          : track,
      ),
    };
    await projects.put(restored);
    await transaction.done;
    return { projectId, mode };
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // A failed transaction is already aborting.
    }
    throw toStorageError(error);
  }
}
