import { strToU8, zipSync } from "fflate";
import {
  type AssetRecord,
  createAssetRepository,
  createProjectRepository,
  DB_VERSION,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { ValidationError } from "@/lib/errors";

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
