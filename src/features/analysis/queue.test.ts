import { describe, expect, it } from "vitest";
import { analysisCacheKey } from "@/features/analysis/engine/uci";
import type { AnalysisCache, QueueEngine } from "@/features/analysis/queue";
import {
  deriveAssessmentsFromCache,
  runGameAnalysis,
} from "@/features/analysis/queue";
import type {
  EngineConfiguration,
  PositionAnalysis,
} from "@/features/analysis/types";
import { DEFAULT_ENGINE_CONFIGURATION } from "@/features/analysis/types";
import { parseSinglePgn } from "@/features/games/pgn";

const GAME = parseSinglePgn(`[Event "Queue"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 e5 2. Nf3 *`);

const CONFIGURATION: EngineConfiguration = {
  ...DEFAULT_ENGINE_CONFIGURATION,
  depth: 6,
  multiPv: 1,
};

function cacheKeyFor(fen: string): string {
  return analysisCacheKey({
    fen,
    engineVersion: "Fake 1",
    depth: 6,
    multiPv: 1,
    threads: 1,
    hashMb: 32,
  });
}

function analysisFor(fen: string): PositionAnalysis {
  return {
    cacheKey: cacheKeyFor(fen),
    fen,
    engineVersion: "Fake 1",
    engineConfiguration: CONFIGURATION,
    depth: 6,
    score: { type: "cp", value: 20, perspective: "white" },
    bestMoveUci: "e2e4",
    principalVariations: [
      {
        multipv: 1,
        score: { type: "cp", value: 20, perspective: "white" },
        pv: ["e2e4"],
        depth: 6,
      },
    ],
    createdAt: "2026-11-23T00:00:00.000Z",
    schemaVersion: 1,
  };
}

function fakeEngine(options: { failAt?: number } = {}) {
  let calls = 0;
  const engine: QueueEngine = {
    async load() {},
    getVersion: () => "Fake 1",
    async analyse(request) {
      calls += 1;
      if (options.failAt === calls) {
        throw new Error("engine failed");
      }
      return {
        ...analysisFor(request.fen),
        cacheKey: cacheKeyFor(request.fen),
      };
    },
    stop() {},
  };
  return { engine, calls: () => calls };
}

function fakeCache(initial: PositionAnalysis[] = []) {
  const store = new Map(initial.map((item) => [item.cacheKey, item]));
  const cache: AnalysisCache = {
    async get(key) {
      return store.get(key);
    },
    async save(analysis) {
      store.set(analysis.cacheKey, analysis);
    },
  };
  return { cache, store };
}

describe("runGameAnalysis", () => {
  it("analyses every position and derives assessments", async () => {
    const { engine, calls } = fakeEngine();
    const { cache, store } = fakeCache();
    const result = await runGameAnalysis({
      game: GAME,
      engine,
      cache,
      configuration: CONFIGURATION,
    });

    expect(result.status).toBe("completed");
    expect(calls()).toBe(4);
    expect(result.analyses.size).toBe(4);
    expect(result.assessments).toHaveLength(3);
    expect(store.size).toBe(4);
  });

  it("skips positions already in the cache", async () => {
    const start = analysisFor(GAME.initialFen);
    const { engine, calls } = fakeEngine();
    const { cache } = fakeCache([start]);
    const result = await runGameAnalysis({
      game: GAME,
      engine,
      cache,
      configuration: CONFIGURATION,
    });

    expect(calls()).toBe(3);
    expect(result.progress.skipped).toBe(1);
  });

  it("pauses after the active position", async () => {
    const { engine, calls } = fakeEngine();
    const { cache } = fakeCache();
    let reports = 0;
    const result = await runGameAnalysis({
      game: GAME,
      engine,
      cache,
      configuration: CONFIGURATION,
      onProgress: () => {
        reports += 1;
      },
      shouldPause: () => reports >= 2,
    });

    expect(result.status).toBe("paused");
    expect(calls()).toBe(1);
  });

  it("cancels without a failed position", async () => {
    const { engine } = fakeEngine();
    const { cache } = fakeCache();
    let calls = 0;
    const result = await runGameAnalysis({
      game: GAME,
      engine,
      cache,
      configuration: CONFIGURATION,
      onProgress: () => {
        calls += 1;
      },
      shouldCancel: () => calls >= 1,
    });

    expect(result.status).toBe("cancelled");
  });

  it("returns an error with the failed ply and keeps completed results", async () => {
    const { engine } = fakeEngine({ failAt: 2 });
    const { cache } = fakeCache();
    const result = await runGameAnalysis({
      game: GAME,
      engine,
      cache,
      configuration: CONFIGURATION,
    });

    expect(result.status).toBe("error");
    expect(result.failedPly).toBe(1);
    expect(result.analyses.size).toBe(1);
  });

  it("synthesises terminal positions without an engine call", async () => {
    const game = parseSinglePgn(`[Event "Terminal"]
[White "White"]
[Black "Black"]
[Result "0-1"]

1. f3 e5 2. g4 Qh4# 0-1`);
    const { engine, calls } = fakeEngine();
    const { cache } = fakeCache();
    const result = await runGameAnalysis({
      game,
      engine,
      cache,
      configuration: CONFIGURATION,
    });

    expect(result.status).toBe("completed");
    expect(calls()).toBe(4);
    expect(result.analyses.get(4)?.terminal).toBe("checkmate");
    expect(result.assessments.at(-1)?.classification).toBe("excellent");
  });

  it("resumes a paused run from cached positions", async () => {
    const first = fakeEngine();
    const { cache } = fakeCache();
    let reports = 0;
    const paused = await runGameAnalysis({
      game: GAME,
      engine: first.engine,
      cache,
      configuration: CONFIGURATION,
      onProgress: () => {
        reports += 1;
      },
      shouldPause: () => reports >= 2,
    });
    expect(paused.status).toBe("paused");

    const second = fakeEngine();
    const resumed = await runGameAnalysis({
      game: GAME,
      engine: second.engine,
      cache,
      configuration: CONFIGURATION,
    });
    expect(resumed.status).toBe("completed");
    expect(resumed.assessments).toHaveLength(3);
    expect(second.calls()).toBe(3);
  });

  it("retries after a failed position and reuses cached work", async () => {
    const failed = fakeEngine({ failAt: 2 });
    const { cache } = fakeCache();
    const first = await runGameAnalysis({
      game: GAME,
      engine: failed.engine,
      cache,
      configuration: CONFIGURATION,
    });
    expect(first.status).toBe("error");

    const retry = fakeEngine();
    const second = await runGameAnalysis({
      game: GAME,
      engine: retry.engine,
      cache,
      configuration: CONFIGURATION,
    });
    expect(second.status).toBe("completed");
    expect(second.assessments).toHaveLength(3);
    expect(retry.calls()).toBe(3);
  });

  it("treats a cache read error as a miss", async () => {
    const { engine } = fakeEngine();
    const store = new Map<string, PositionAnalysis>();
    let firstRead = true;
    const cache: AnalysisCache = {
      async get(key) {
        if (firstRead) {
          firstRead = false;
          throw new Error("bad cache record");
        }
        return store.get(key);
      },
      async save(analysis) {
        store.set(analysis.cacheKey, analysis);
      },
    };
    const result = await runGameAnalysis({
      game: GAME,
      engine,
      cache,
      configuration: CONFIGURATION,
    });
    expect(result.status).toBe("completed");
  });

  it("derives assessments from cached analyses without engine work", async () => {
    const positions = [
      GAME.initialFen,
      ...GAME.moves.map((move) => move.fenAfter),
    ];
    const items = positions.map((fen) => analysisFor(fen));
    const { calls } = fakeEngine();
    const { cache } = fakeCache(items);
    const derived = await deriveAssessmentsFromCache({
      game: GAME,
      cache,
      configuration: CONFIGURATION,
      engineVersion: "Fake 1",
    });

    expect(derived.assessments).toHaveLength(3);
    expect(derived.assessments.map((item) => item.ply)).toEqual([1, 2, 3]);
    expect(calls()).toBe(0);
  });
});
