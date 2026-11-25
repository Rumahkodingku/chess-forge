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
  type LearningItemType,
  type LearningProgress,
  type LibraryNote,
  type LibraryNoteTargetType,
  learningProgressSchema,
  libraryNoteSchema,
  progressId,
  type RepertoireLine,
  repertoireLineSchema,
} from "@/features/library/schemas";
import {
  type ApplicationSettings,
  applicationSettingsSchema,
  normalizeApplicationSettings,
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
  StorageBlockedError,
  StorageMigrationError,
  StorageQuotaError,
  StorageUnavailableError,
  ValidationError,
} from "@/lib/errors";

export const DB_NAME = "chessforge";
export const DB_VERSION = 2;

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
  const parsed: T[] = [];
  for (const value of values) {
    try {
      parsed.push(schema.parse(value));
    } catch {
      console.warn(`A stored ${label} record is invalid and was skipped.`);
    }
  }
  return parsed;
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
  libraryNotes: {
    key: string;
    value: LibraryNote;
    indexes: {
      targetType: string;
      targetId: string;
      target: [string, string];
      updatedAt: string;
    };
  };
  repertoireLines: {
    key: string;
    value: RepertoireLine;
    indexes: {
      side: string;
      eco: string;
      priority: string;
      updatedAt: string;
    };
  };
  learningProgress: {
    key: string;
    value: LearningProgress;
    indexes: {
      itemType: string;
      nextReviewAt: string;
      due: [string, string];
      updatedAt: string;
    };
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
    let rejectBlocked: ((error: StorageBlockedError) => void) | undefined;
    const blocked = new Promise<never>((_, reject) => {
      rejectBlocked = reject;
    });
    const opening = openDB<ChessForgeDB>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion) {
        try {
          if (oldVersion < 1) {
            const games = database.createObjectStore("games", {
              keyPath: "id",
            });
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
          }

          if (oldVersion < 2) {
            const notes = database.createObjectStore("libraryNotes", {
              keyPath: "id",
            });
            notes.createIndex("targetType", "targetType");
            notes.createIndex("targetId", "targetId");
            notes.createIndex("target", ["targetType", "targetId"]);
            notes.createIndex("updatedAt", "updatedAt");

            const repertoire = database.createObjectStore("repertoireLines", {
              keyPath: "id",
            });
            repertoire.createIndex("side", "side");
            repertoire.createIndex("eco", "eco");
            repertoire.createIndex("priority", "priority");
            repertoire.createIndex("updatedAt", "updatedAt");

            const progress = database.createObjectStore("learningProgress", {
              keyPath: "id",
            });
            progress.createIndex("itemType", "itemType");
            progress.createIndex("nextReviewAt", "nextReviewAt");
            progress.createIndex("due", ["itemType", "nextReviewAt"]);
            progress.createIndex("updatedAt", "updatedAt");
          }
        } catch (error) {
          throw new StorageMigrationError(
            error instanceof Error ? error.message : undefined,
            "Export a backup, then reset local storage.",
          );
        }
      },
      blocked() {
        rejectBlocked?.(new StorageBlockedError());
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

    let db: ChessForgeDatabase;
    try {
      db = await Promise.race([opening, blocked]);
    } catch (error) {
      // An open request cannot be cancelled. Close the late handle if the
      // blocking tab closes before the request settles.
      void opening.then((late) => late.close()).catch(() => {});
      throw error;
    }

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
  listAll(): Promise<MoveAssessment[]>;
  replaceForGame(gameId: string, assessments: MoveAssessment[]): Promise<void>;
}

export interface LibraryNoteRepository {
  getById(id: string): Promise<LibraryNote | undefined>;
  listByTarget(
    targetType: LibraryNoteTargetType,
    targetId: string,
  ): Promise<LibraryNote[]>;
  listAll(): Promise<LibraryNote[]>;
  save(note: LibraryNote): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface RepertoireRepository {
  getById(id: string): Promise<RepertoireLine | undefined>;
  list(): Promise<RepertoireLine[]>;
  listBySide(side: "white" | "black"): Promise<RepertoireLine[]>;
  save(line: RepertoireLine): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface LearningProgressRepository {
  get(
    itemType: LearningItemType,
    itemId: string,
  ): Promise<LearningProgress | undefined>;
  listDue(
    itemType?: LearningItemType,
    now?: string,
  ): Promise<LearningProgress[]>;
  listAll(): Promise<LearningProgress[]>;
  save(progress: LearningProgress): Promise<void>;
  delete(itemType: LearningItemType, itemId: string): Promise<void>;
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
      let normalized: VideoProject;
      try {
        parseStored(project, videoProjectSchema, "project");
        normalized = normalizeProject(project);
      } catch {
        throw new ValidationError(
          "Project changes could not be saved.",
          "Check the scene timing and fields, then retry.",
        );
      }
      try {
        await db.put("projects", normalized);
      } catch (error) {
        throw toStorageError(error);
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
      if (record === undefined) return undefined;
      try {
        return normalizeApplicationSettings(record.value);
      } catch {
        throw new ValidationError(
          "Stored settings data is invalid.",
          "Open Settings and save a fresh configuration.",
        );
      }
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
    listAll: async () =>
      parseStoredList(
        await db.getAll("moveAssessments"),
        moveAssessmentSchema,
        "move assessment",
      ),
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

export function createLibraryNoteRepository(
  db: ChessForgeDatabase,
): LibraryNoteRepository {
  return {
    getById: async (id) =>
      parseStored(await db.get("libraryNotes", id), libraryNoteSchema, "note"),
    listByTarget: async (targetType, targetId) => {
      const notes = await db.getAllFromIndex("libraryNotes", "target", [
        targetType,
        targetId,
      ]);
      return parseStoredList(notes, libraryNoteSchema, "note").sort(
        (left, right) =>
          Number(right.pinned) - Number(left.pinned) ||
          right.updatedAt.localeCompare(left.updatedAt),
      );
    },
    listAll: async () => {
      const notes = await db.getAll("libraryNotes");
      return parseStoredList(notes, libraryNoteSchema, "note").sort(
        (left, right) =>
          Number(right.pinned) - Number(left.pinned) ||
          right.updatedAt.localeCompare(left.updatedAt),
      );
    },
    save: async (note) => {
      await db.put("libraryNotes", libraryNoteSchema.parse(note));
    },
    delete: (id) => db.delete("libraryNotes", id),
  };
}

export function createRepertoireRepository(
  db: ChessForgeDatabase,
): RepertoireRepository {
  return {
    getById: async (id) =>
      parseStored(
        await db.get("repertoireLines", id),
        repertoireLineSchema,
        "repertoire line",
      ),
    list: async () => {
      const lines = await db.getAll("repertoireLines");
      return parseStoredList(
        lines,
        repertoireLineSchema,
        "repertoire line",
      ).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    listBySide: async (side) => {
      const lines = await db.getAllFromIndex("repertoireLines", "side", side);
      return parseStoredList(
        lines,
        repertoireLineSchema,
        "repertoire line",
      ).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    save: async (line) => {
      await db.put("repertoireLines", repertoireLineSchema.parse(line));
    },
    delete: (id) => db.delete("repertoireLines", id),
  };
}

export function createLearningProgressRepository(
  db: ChessForgeDatabase,
): LearningProgressRepository {
  return {
    get: async (itemType, itemId) =>
      parseStored(
        await db.get("learningProgress", progressId(itemType, itemId)),
        learningProgressSchema,
        "learning progress",
      ),
    listDue: async (itemType, now = new Date().toISOString()) => {
      const records = itemType
        ? await db.getAllFromIndex(
            "learningProgress",
            "due",
            IDBKeyRange.bound([itemType, ""], [itemType, now]),
          )
        : await db.getAllFromIndex(
            "learningProgress",
            "nextReviewAt",
            IDBKeyRange.upperBound(now),
          );
      return parseStoredList(
        records,
        learningProgressSchema,
        "learning progress",
      ).sort((left, right) =>
        left.nextReviewAt.localeCompare(right.nextReviewAt),
      );
    },
    listAll: async () => {
      const records = await db.getAll("learningProgress");
      return parseStoredList(
        records,
        learningProgressSchema,
        "learning progress",
      ).sort((left, right) =>
        left.nextReviewAt.localeCompare(right.nextReviewAt),
      );
    },
    save: async (progress) => {
      await db.put("learningProgress", learningProgressSchema.parse(progress));
    },
    delete: (itemType, itemId) =>
      db.delete("learningProgress", progressId(itemType, itemId)),
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
