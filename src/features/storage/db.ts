import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import { z } from "zod";
import type {
  MoveAssessment,
  PositionAnalysis,
} from "@/features/analysis/types";
import {
  moveAssessmentSchema,
  positionAnalysisSchema,
} from "@/features/analysis/types";
import { type Game, gameSchema } from "@/features/games/types";
import {
  type ApplicationSettings,
  applicationSettingsSchema,
} from "@/features/settings/types";
import { normalizeProject } from "@/features/studio/scene/project-normalization";
import {
  type Scene,
  type VideoProject,
  videoProjectSchema,
} from "@/features/studio/scene/scene.types";
import { normalizeTemplate } from "@/features/templates/normalization";
import { type Template, templateSchema } from "@/features/templates/types";
import {
  StorageMigrationError,
  StorageQuotaError,
  StorageUnavailableError,
  ValidationError,
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

const assetRecordSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["audio", "image"]),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  hash: z.string().min(1),
  createdAt: z.string().min(1),
  // Blob identity differs across browser, jsdom, and fake-indexeddb realms.
  data: z.custom<Blob>((value) => value !== undefined && value !== null),
});

function parseStored<T>(
  value: T | undefined,
  schema: { parse: (input: unknown) => T },
  label: string,
): T | undefined {
  if (value === undefined) return undefined;
  try {
    return schema.parse(value);
  } catch {
    throw new ValidationError(
      `Stored ${label} data is invalid.`,
      "Export a backup, then clear site data before re-importing.",
    );
  }
}

function parseStoredList<T>(
  values: T[],
  schema: { parse: (input: unknown) => T },
  label: string,
): T[] {
  return values.map((value) => parseStored(value, schema, label) as T);
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

  dbPromise ??= (async () => {
    const db = await openDB<ChessForgeDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        try {
          const games = database.createObjectStore("games", { keyPath: "id" });
          games.createIndex("createdAt", "createdAt");
          games.createIndex("updatedAt", "updatedAt");
          games.createIndex("source", "source");
          games.createIndex("white", "metadata.white");
          games.createIndex("black", "metadata.black");

          const analyses = database.createObjectStore("positionAnalyses", {
            keyPath: "cacheKey",
          });
          analyses.createIndex("gameId", "gameId");
          analyses.createIndex("ply", "ply");
          analyses.createIndex("fen", "fen");
          analyses.createIndex("createdAt", "createdAt");

          const assessments = database.createObjectStore("moveAssessments", {
            keyPath: "id",
          });
          assessments.createIndex("gameId", "gameId");
          assessments.createIndex("ply", "ply");

          const projects = database.createObjectStore("projects", {
            keyPath: "id",
          });
          projects.createIndex("createdAt", "createdAt");
          projects.createIndex("updatedAt", "updatedAt");

          const templates = database.createObjectStore("templates", {
            keyPath: "id",
          });
          templates.createIndex("updatedAt", "updatedAt");

          const assets = database.createObjectStore("assets", {
            keyPath: "id",
          });
          assets.createIndex("hash", "hash");
          assets.createIndex("mimeType", "mimeType");
          assets.createIndex("createdAt", "createdAt");

          database.createObjectStore("settings", { keyPath: "key" });
          database.createObjectStore("meta", { keyPath: "key" });
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
        dbPromise
          ?.then((database) => {
            database.close();
            dbPromise = undefined;
          })
          .catch(() => {
            dbPromise = undefined;
          });
      },
    });

    await db.put("meta", { key: "schemaVersion", value: DB_VERSION });
    return db;
  })().catch((error: unknown) => {
    dbPromise = undefined;
    throw toStorageError(error);
  });

  return dbPromise;
}

export async function closeChessForgeDatabase(): Promise<void> {
  if (!dbPromise) return;
  try {
    const db = await dbPromise;
    db.close();
  } catch {
    // A rejected open still needs to release the cached promise.
  } finally {
    dbPromise = undefined;
  }
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

export interface PositionAnalysisRepository {
  get(cacheKey: string): Promise<PositionAnalysis | undefined>;
  save(analysis: PositionAnalysis): Promise<void>;
  delete(cacheKey: string): Promise<void>;
}

export interface MoveAssessmentRepository {
  listByGame(gameId: string): Promise<MoveAssessment[]>;
  replaceForGame(gameId: string, assessments: MoveAssessment[]): Promise<void>;
}

export function createGameRepository(db: ChessForgeDatabase): GameRepository {
  return {
    getById: async (id) =>
      parseStored(await db.get("games", id), gameSchema, "game"),
    list: async () =>
      parseStoredList(await db.getAll("games"), gameSchema, "game"),
    save: async (game) => {
      await db.put("games", gameSchema.parse(game));
    },
    delete: (id) => db.delete("games", id),
  };
}

export function createProjectRepository(
  db: ChessForgeDatabase,
): ProjectRepository {
  const normalizeStored = (record: unknown) => {
    try {
      return normalizeProject(record);
    } catch {
      throw new ValidationError(
        "Stored project data is invalid.",
        "Export a backup, then clear site data before re-importing.",
      );
    }
  };

  return {
    getById: async (id) => {
      const record = await db.get("projects", id);
      if (record === undefined) return undefined;
      return normalizeStored(record);
    },
    list: async () => {
      const records = await db.getAll("projects");
      const projects: VideoProject[] = [];
      for (const record of records) {
        try {
          projects.push(normalizeStored(record));
        } catch {
          console.warn("A stored project is invalid and was skipped.");
        }
      }
      return projects;
    },
    save: async (project) => {
      try {
        parseStored(project, videoProjectSchema, "project");
        await db.put("projects", normalizeProject(project));
      } catch {
        throw new ValidationError(
          "Project changes could not be saved.",
          "Check the scene timing and fields, then retry.",
        );
      }
    },
    delete: (id) => db.delete("projects", id),
  };
}

export function createTemplateRepository(
  db: ChessForgeDatabase,
): TemplateRepository {
  return {
    getById: async (id) => {
      const record = await db.get("templates", id);
      if (record === undefined) return undefined;
      const template = normalizeTemplate(record);
      if (!template) {
        console.warn(`Stored template ${id} is invalid and was skipped.`);
        return undefined;
      }
      return template;
    },
    list: async () => {
      const records = await db.getAll("templates");
      const templates: Template[] = [];
      for (const record of records) {
        const template = normalizeTemplate(record);
        if (template) {
          templates.push(template);
        } else {
          console.warn("A stored template is invalid and was skipped.");
        }
      }
      return templates;
    },
    save: async (template) => {
      await db.put("templates", templateSchema.parse(template));
    },
    delete: (id) => db.delete("templates", id),
  };
}

export function createAssetRepository(db: ChessForgeDatabase): AssetRepository {
  return {
    getById: async (id) =>
      parseStored(await db.get("assets", id), assetRecordSchema, "asset"),
    findByHash: async (hash) =>
      parseStored(
        await db.getFromIndex("assets", "hash", hash),
        assetRecordSchema,
        "asset",
      ),
    save: async (asset) => {
      await db.put("assets", assetRecordSchema.parse(asset));
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
      return parseStored(record?.value, applicationSettingsSchema, "settings");
    },
    save: async (settings) => {
      await db.put("settings", {
        key: "app",
        value: applicationSettingsSchema.parse(settings),
      });
    },
  };
}

export function createPositionAnalysisRepository(
  db: ChessForgeDatabase,
): PositionAnalysisRepository {
  return {
    get: async (cacheKey) => {
      const record = await db.get("positionAnalyses", cacheKey);
      if (record === undefined) return undefined;
      try {
        return positionAnalysisSchema.parse(record);
      } catch {
        await db.delete("positionAnalyses", cacheKey);
        return undefined;
      }
    },
    save: async (analysis) => {
      await db.put("positionAnalyses", positionAnalysisSchema.parse(analysis));
    },
    delete: (cacheKey) => db.delete("positionAnalyses", cacheKey),
  };
}

export function createMoveAssessmentRepository(
  db: ChessForgeDatabase,
): MoveAssessmentRepository {
  return {
    listByGame: async (gameId) => {
      const assessments = await parseStoredList(
        await db.getAllFromIndex("moveAssessments", "gameId", gameId),
        moveAssessmentSchema,
        "move assessment",
      );
      return assessments.sort((left, right) => left.ply - right.ply);
    },
    replaceForGame: async (gameId, assessments) => {
      const transaction = db.transaction("moveAssessments", "readwrite");
      const keys = await transaction.store.index("gameId").getAllKeys(gameId);
      for (const key of keys) {
        await transaction.store.delete(key);
      }
      for (const assessment of assessments) {
        await transaction.store.put(moveAssessmentSchema.parse(assessment));
      }
      await transaction.done;
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
