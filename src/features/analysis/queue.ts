import { buildMoveAssessment } from "@/features/analysis/assessment";
import type { AnalyseRequest } from "@/features/analysis/engine/stockfish-adapter";
import { terminalState } from "@/features/analysis/engine/terminal";
import { analysisCacheKey } from "@/features/analysis/engine/uci";
import {
  isOpeningPosition,
  type OpeningIndex,
} from "@/features/analysis/openings/lookup";
import type {
  BrilliantDecision,
  EngineConfiguration,
  MoveAssessment,
  PositionAnalysis,
} from "@/features/analysis/types";
import type { Game } from "@/features/games/types";

export interface AnalysisCache {
  get(cacheKey: string): Promise<PositionAnalysis | undefined>;
  save(analysis: PositionAnalysis): Promise<void>;
  delete?(cacheKey: string): Promise<void>;
}

export interface QueueEngine {
  load(): Promise<void>;
  getVersion(): string;
  analyse(request: AnalyseRequest): Promise<PositionAnalysis>;
  stop(): void;
}

export type GameAnalysisStatus = "completed" | "paused" | "cancelled" | "error";

export interface GameAnalysisProgress {
  state: "running" | GameAnalysisStatus;
  completed: number;
  total: number;
  skipped: number;
  activePly?: number;
  elapsedMs: number;
  error?: string;
}

export interface RunGameAnalysisOptions {
  game: Game;
  engine: QueueEngine;
  cache: AnalysisCache;
  configuration: EngineConfiguration;
  openingIndex?: OpeningIndex;
  existingDecisions?: Map<number, BrilliantDecision>;
  onProgress?: (progress: GameAnalysisProgress) => void;
  shouldPause?: () => boolean;
  shouldCancel?: () => boolean;
}

export interface GameAnalysisResult {
  status: GameAnalysisStatus;
  analyses: Map<number, PositionAnalysis>;
  assessments: MoveAssessment[];
  progress: GameAnalysisProgress;
  failedPly?: number;
  error?: string;
}

function terminalAnalysis(
  fen: string,
  configuration: EngineConfiguration,
): PositionAnalysis | null {
  const terminal = terminalState(fen);
  if (!terminal) return null;
  return {
    cacheKey: `terminal|${fen}`,
    fen,
    engineVersion: "terminal",
    engineConfiguration: configuration,
    depth: 0,
    score: terminal.score,
    principalVariations: [],
    terminal: terminal.terminal,
    terminalWinner: terminal.winner,
    createdAt: new Date().toISOString(),
    schemaVersion: 1,
  };
}

export async function runGameAnalysis(
  options: RunGameAnalysisOptions,
): Promise<GameAnalysisResult> {
  const { game, engine, cache } = options;
  const startedAt = Date.now();
  const configuration: EngineConfiguration = {
    ...options.configuration,
    multiPv: 1,
  };
  const analyses = new Map<number, PositionAnalysis>();
  const positions = [
    game.initialFen,
    ...game.moves.map((move) => move.fenAfter),
  ];
  const total = positions.length;
  let skipped = 0;
  let status: GameAnalysisStatus = "completed";
  let failedPly: number | undefined;
  let error: string | undefined;
  let activePly: number | undefined;

  const progress = (
    state: GameAnalysisProgress["state"],
  ): GameAnalysisProgress => ({
    state,
    completed: analyses.size,
    total,
    skipped,
    activePly,
    elapsedMs: Date.now() - startedAt,
    error,
  });
  const report = (state: GameAnalysisProgress["state"]) => {
    options.onProgress?.(progress(state));
  };

  try {
    await engine.load();
    report("running");

    for (const [ply, fen] of positions.entries()) {
      if (options.shouldCancel?.()) {
        status = "cancelled";
        break;
      }
      if (options.shouldPause?.()) {
        status = "paused";
        break;
      }
      activePly = ply;
      report("running");

      const terminal = terminalAnalysis(fen, configuration);
      if (terminal) {
        analyses.set(ply, terminal);
        continue;
      }

      const key = analysisCacheKey({
        fen,
        engineVersion: engine.getVersion(),
        depth: configuration.depth,
        movetimeMs: configuration.movetimeMs,
        multiPv: configuration.multiPv,
        threads: configuration.threads,
        hashMb: configuration.hashMb,
      });
      let cached: PositionAnalysis | undefined;
      try {
        cached = await cache.get(key);
      } catch {
        await cache.delete?.(key);
        cached = undefined;
      }
      if (cached) {
        analyses.set(ply, cached);
        skipped += 1;
        continue;
      }

      let analysis: PositionAnalysis;
      try {
        analysis = await engine.analyse({
          fen,
          depth: configuration.depth,
          movetimeMs: configuration.movetimeMs,
          multiPv: configuration.multiPv,
          configuration,
        });
      } catch (analysisError) {
        if (options.shouldCancel?.()) {
          status = "cancelled";
        } else {
          status = "error";
          failedPly = ply;
          error =
            analysisError instanceof Error
              ? analysisError.message
              : "Analysis failed.";
        }
        break;
      }

      if (analysis.partial) {
        if (options.shouldCancel?.()) {
          status = "cancelled";
        } else {
          status = "error";
          failedPly = ply;
          error = "Analysis returned a partial result.";
        }
        break;
      }

      try {
        await cache.save(analysis);
      } catch (storageError) {
        status = "error";
        failedPly = ply;
        error =
          storageError instanceof Error
            ? storageError.message
            : "Analysis could not be saved.";
        break;
      }
      analyses.set(ply, analysis);
      report("running");

      if (options.shouldCancel?.()) {
        status = "cancelled";
        break;
      }
      if (options.shouldPause?.()) {
        status = "paused";
        break;
      }
    }
  } catch (loadError) {
    status = "error";
    error = loadError instanceof Error ? loadError.message : "Analysis failed.";
  }

  const assessments = buildAssessments(
    game,
    analyses,
    options.openingIndex,
    options.existingDecisions,
  );
  const finalProgress = progress(status);
  options.onProgress?.(finalProgress);
  return {
    status,
    analyses,
    assessments,
    progress: finalProgress,
    failedPly,
    error,
  };
}

function buildAssessments(
  game: Game,
  analyses: Map<number, PositionAnalysis>,
  openingIndex: OpeningIndex | undefined,
  existingDecisions: Map<number, BrilliantDecision> | undefined,
): MoveAssessment[] {
  const assessments: MoveAssessment[] = [];
  for (let ply = 1; ply <= game.moves.length; ply += 1) {
    const before = analyses.get(ply - 1);
    const after = analyses.get(ply);
    if (!before || !after) continue;
    const move = game.moves[ply - 1];
    if (!move) continue;
    assessments.push(
      buildMoveAssessment({
        gameId: game.id,
        ply,
        mover: move.color,
        playedUci: move.uci,
        fenBefore: move.fenBefore,
        fenAfter: move.fenAfter,
        before,
        after,
        inOpeningBook: openingIndex
          ? isOpeningPosition(openingIndex, before.fen)
          : false,
        existingDecision: existingDecisions?.get(ply),
      }),
    );
  }
  return assessments;
}

export interface DeriveAssessmentOptions {
  game: Game;
  cache: AnalysisCache;
  configuration: EngineConfiguration;
  engineVersion: string;
  openingIndex?: OpeningIndex;
  existingDecisions?: Map<number, BrilliantDecision>;
}

export async function deriveAssessmentsFromCache(
  options: DeriveAssessmentOptions,
): Promise<{
  analyses: Map<number, PositionAnalysis>;
  assessments: MoveAssessment[];
}> {
  const configuration: EngineConfiguration = {
    ...options.configuration,
    multiPv: 1,
  };
  const analyses = new Map<number, PositionAnalysis>();
  const positions = [
    options.game.initialFen,
    ...options.game.moves.map((move) => move.fenAfter),
  ];

  for (const [ply, fen] of positions.entries()) {
    const terminal = terminalAnalysis(fen, configuration);
    if (terminal) {
      analyses.set(ply, terminal);
      continue;
    }
    const key = analysisCacheKey({
      fen,
      engineVersion: options.engineVersion,
      depth: configuration.depth,
      movetimeMs: configuration.movetimeMs,
      multiPv: configuration.multiPv,
      threads: configuration.threads,
      hashMb: configuration.hashMb,
    });
    let cached: PositionAnalysis | undefined;
    try {
      cached = await options.cache.get(key);
    } catch {
      await options.cache.delete?.(key);
      cached = undefined;
    }
    if (!cached) break;
    analyses.set(ply, cached);
  }

  return {
    analyses,
    assessments: buildAssessments(
      options.game,
      analyses,
      options.openingIndex,
      options.existingDecisions,
    ),
  };
}
