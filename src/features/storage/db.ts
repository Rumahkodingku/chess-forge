import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type {
  MoveAssessment,
  PositionAnalysis,
} from "@/features/analysis/types";
import type { Game } from "@/features/games/types";
import type { ApplicationSettings } from "@/features/settings/types";
import type { Scene, VideoProject } from "@/features/studio/scene/scene.types";
import type { Template } from "@/features/templates/types";
import {
  StorageMigrationError,
  StorageQuotaError,
  StorageUnavailableError,
} from "@/lib/errors";

export const DB_NAME = "chessforge";
export const DB_VERSION = 1;

export interface AssetRecord {
  id: string;
  kind: "audio" | "image";
  mimeType: string;
  size: number;
  hash: string;
  createdAt: string;
  data: Blob;
}

export interface KeyValueRecord<T = unknown> {
  key: string;
  value: T;
}

interface ChessForgeDB extends DBSchema {
  games: {
    key: string;
    value: Game;
    indexes: {
      createdAt: string;
      updatedAt: string;
      source: string;
      white: string;
      black: string;
    };
  };
  positionAnalyses: {
    key: string;
    value: PositionAnalysis;
    indexes: {
      gameId: string;
      ply: number;
      fen: string;
      createdAt: string;
    };
  };
  moveAssessments: {
    key: string;
    value: MoveAssessment;
    indexes: {
      gameId: string;
      ply: number;
    };
  };
  projects: {
    key: string;
    value: VideoProject;
    indexes: {
      createdAt: string;
      updatedAt: string;
    };
  };
  templates: {
    key: string;
    value: Template;
    indexes: {
      updatedAt: string;
    };
  };
  assets: {
    key: string;
    value: AssetRecord;
    indexes: {
      hash: string;
      mimeType: string;
      createdAt: string;
    };
  };
  settings: {
    key: string;
    value: KeyValueRecord<ApplicationSettings>;
  };
  meta: {
    key: string;
    value: KeyValueRecord;
  };
}

export type ChessForgeDatabase = IDBPDatabase<ChessForgeDB>;

let dbPromise: Promise<ChessForgeDatabase> | undefined;

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

export function toStorageError(error: unknown): Error {
  if (isQuotaError(error)) {
    return new StorageQuotaError();
  }
  if (error instanceof Error) {
    return error;
  }
  return new StorageUnavailableError();
}

export async function openChessForgeDatabase(): Promise<ChessForgeDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new StorageUnavailableError();
  }

  dbPromise ??= openDB<ChessForgeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      try {
        const games = db.createObjectStore("games", { keyPath: "id" });
        games.createIndex("createdAt", "createdAt");
        games.createIndex("updatedAt", "updatedAt");
        games.createIndex("source", "source");
        games.createIndex("white", "metadata.white");
        games.createIndex("black", "metadata.black");

        const analyses = db.createObjectStore("positionAnalyses", {
          keyPath: "cacheKey",
        });
        analyses.createIndex("gameId", "gameId");
        analyses.createIndex("ply", "ply");
        analyses.createIndex("fen", "fen");
        analyses.createIndex("createdAt", "createdAt");

        const assessments = db.createObjectStore("moveAssessments", {
          keyPath: "id",
        });
        assessments.createIndex("gameId", "gameId");
        assessments.createIndex("ply", "ply");

        const projects = db.createObjectStore("projects", { keyPath: "id" });
        projects.createIndex("createdAt", "createdAt");
        projects.createIndex("updatedAt", "updatedAt");

        const templates = db.createObjectStore("templates", { keyPath: "id" });
        templates.createIndex("updatedAt", "updatedAt");

        const assets = db.createObjectStore("assets", { keyPath: "id" });
        assets.createIndex("hash", "hash");
        assets.createIndex("mimeType", "mimeType");
        assets.createIndex("createdAt", "createdAt");

        db.createObjectStore("settings", { keyPath: "key" });
        db.createObjectStore("meta", { keyPath: "key" });
      } catch (error) {
        throw new StorageMigrationError(
          error instanceof Error ? error.message : undefined,
          "Export a backup, then reset local storage.",
        );
      }
    },
    blocked() {
      console.warn("ChessForge database upgrade is blocked by another tab.");
    },
    blocking() {
      dbPromise?.then((db) => db.close()).catch(() => undefined);
    },
  }).catch((error: unknown) => {
    throw toStorageError(error);
  });

  return dbPromise;
}

export async function closeChessForgeDatabase(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  dbPromise = undefined;
}

export async function deleteChessForgeDatabase(): Promise<void> {
  await closeChessForgeDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(toStorageError(request.error));
    request.onblocked = () =>
      reject(
        new StorageUnavailableError(
          "Database deletion is blocked by another tab.",
          "Close other ChessForge tabs and try again.",
        ),
      );
  });
}

export interface GameRepository {
  getById(id: string): Promise<Game | undefined>;
  list(): Promise<Game[]>;
  save(game: Game): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ProjectRepository {
  getById(id: string): Promise<VideoProject | undefined>;
  list(): Promise<VideoProject[]>;
  save(project: VideoProject): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TemplateRepository {
  getById(id: string): Promise<Template | undefined>;
  list(): Promise<Template[]>;
  save(template: Template): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface AssetRepository {
  getById(id: string): Promise<AssetRecord | undefined>;
  findByHash(hash: string): Promise<AssetRecord | undefined>;
  save(asset: AssetRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface SettingsRepository {
  get(): Promise<ApplicationSettings | undefined>;
  save(settings: ApplicationSettings): Promise<void>;
}

export function createGameRepository(db: ChessForgeDatabase): GameRepository {
  return {
    getById: (id) => db.get("games", id),
    list: () => db.getAll("games"),
    save: async (game) => {
      await db.put("games", game);
    },
    delete: (id) => db.delete("games", id),
  };
}

export function createProjectRepository(
  db: ChessForgeDatabase,
): ProjectRepository {
  return {
    getById: (id) => db.get("projects", id),
    list: () => db.getAll("projects"),
    save: async (project) => {
      await db.put("projects", project);
    },
    delete: (id) => db.delete("projects", id),
  };
}

export function createTemplateRepository(
  db: ChessForgeDatabase,
): TemplateRepository {
  return {
    getById: (id) => db.get("templates", id),
    list: () => db.getAll("templates"),
    save: async (template) => {
      await db.put("templates", template);
    },
    delete: (id) => db.delete("templates", id),
  };
}

export function createAssetRepository(db: ChessForgeDatabase): AssetRepository {
  return {
    getById: (id) => db.get("assets", id),
    findByHash: async (hash) => {
      const record = await db.getFromIndex("assets", "hash", hash);
      return record;
    },
    save: async (asset) => {
      await db.put("assets", asset);
    },
    delete: (id) => db.delete("assets", id),
  };
}

export function createSettingsRepository(
  db: ChessForgeDatabase,
): SettingsRepository {
  return {
    get: async () => {
      const record = await db.get("settings", "app");
      return record?.value;
    },
    save: async (settings) => {
      await db.put("settings", { key: "app", value: settings });
    },
  };
}

export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
} | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return null;
  }
  const estimate = await navigator.storage.estimate();
  return {
    usage: estimate.usage ?? 0,
    quota: estimate.quota ?? 0,
  };
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return false;
  }
  return navigator.storage.persist();
}

export function summarizeSceneTime(scenes: Scene[]): number {
  return scenes.reduce((total, scene) => total + scene.durationInFrames, 0);
}
