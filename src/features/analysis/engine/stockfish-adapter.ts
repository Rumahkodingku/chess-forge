import { terminalState } from "@/features/analysis/engine/terminal";
import {
  analysisCacheKey,
  assertValidFen,
  isBestMoveLine,
  parseBestMove,
  parseUciInfo,
} from "@/features/analysis/engine/uci";
import type {
  EngineConfiguration,
  Evaluation,
  PositionAnalysis,
  PrincipalVariation,
} from "@/features/analysis/types";
import { AppError } from "@/lib/errors";

export type EngineState =
  | "idle"
  | "loading"
  | "ready"
  | "analysing"
  | "stopping"
  | "completed"
  | "error";

export interface EngineProgress {
  state: EngineState;
  depth?: number;
  seldepth?: number;
  nodes?: number;
  nps?: number;
  timeMs?: number;
  score?: Evaluation;
  variations: PrincipalVariation[];
}

export interface AnalyseRequest {
  fen: string;
  depth?: number;
  movetimeMs?: number;
  multiPv?: number;
  configuration?: Partial<EngineConfiguration>;
  signal?: AbortSignal;
}

export interface StockfishEngine {
  load(): Promise<void>;
  getVersion(): string;
  setOption(name: string, value: string | number): void;
  analyse(request: AnalyseRequest): Promise<PositionAnalysis>;
  stop(): void;
  quit(): void;
  onStateChange(listener: (state: EngineState) => void): () => void;
  onProgress(listener: (progress: EngineProgress) => void): () => void;
}

const ENGINE_PATH = "/engine/stockfish/stockfish-19-lite-single.js";
export const DEFAULT_ENGINE_VERSION = "Stockfish 19 Lite WASM";

function clampInteger(
  value: number | undefined,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export class BrowserStockfishEngine implements StockfishEngine {
  private worker: Worker | null = null;
  private state: EngineState = "idle";
  private listeners = new Set<(state: EngineState) => void>();
  private lineListeners = new Set<(line: string) => void>();
  private lineRejectors = new Set<(error: Error) => void>();
  private progressListeners = new Set<(progress: EngineProgress) => void>();
  private engineVersion = DEFAULT_ENGINE_VERSION;
  private supportedOptions = new Set<string>();
  private progressVariations = new Map<number, PrincipalVariation>();
  private latestProgress: EngineProgress = { state: "idle", variations: [] };
  private activeReject: ((error: Error) => void) | null = null;
  private stopRequested = false;
  private configuration: EngineConfiguration = {
    depth: 14,
    multiPv: 3,
    threads: 1,
    hashMb: 32,
    perspective: "white",
  };

  private setState(state: EngineState): void {
    this.state = state;
    this.latestProgress = { ...this.latestProgress, state };
    this.listeners.forEach((listener) => {
      listener(state);
    });
    this.emitProgress();
  }

  private emitProgress(): void {
    this.progressListeners.forEach((listener) => {
      listener(this.latestProgress);
    });
  }

  private updateProgress(line: string, fen: string): void {
    const info = parseUciInfo(line, fen);
    if (!info) return;
    const next = { ...this.latestProgress };
    if (info.depth !== undefined) {
      next.depth = info.depth;
    }
    if (info.seldepth !== undefined) {
      next.seldepth = info.seldepth;
    }
    if (info.nodes !== undefined) {
      next.nodes = info.nodes;
    }
    if (info.nps !== undefined) {
      next.nps = info.nps;
    }
    if (info.timeMs !== undefined) {
      next.timeMs = info.timeMs;
    }
    if (info.score && info.multipv) {
      next.score = info.score;
      this.progressVariations.set(info.multipv, {
        multipv: info.multipv,
        score: info.score,
        pv: info.pv ?? [],
        depth: info.depth ?? next.depth ?? 0,
        nodes: info.nodes,
        nps: info.nps,
      });
      next.variations = [...this.progressVariations.values()].sort(
        (left, right) => left.multipv - right.multipv,
      );
    }
    this.latestProgress = next;
    this.emitProgress();
  }

  onStateChange(listener: (state: EngineState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  onProgress(listener: (progress: EngineProgress) => void): () => void {
    this.progressListeners.add(listener);
    listener(this.latestProgress);
    return () => this.progressListeners.delete(listener);
  }

  getVersion(): string {
    return this.engineVersion;
  }

  private onLine(listener: (line: string) => void): () => void {
    this.lineListeners.add(listener);
    return () => this.lineListeners.delete(listener);
  }

  private waitForLine(
    predicate: (line: string) => boolean,
    timeoutMs = 30_000,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let settled = false;
      let cleanupLine = () => {};
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        cleanupLine();
        this.lineRejectors.delete(fail);
      };
      const fail = (error: Error) => {
        finish();
        reject(error);
      };
      const timeout = setTimeout(() => {
        fail(
          new AppError("ENGINE_ERROR", "Stockfish did not respond in time."),
        );
      }, timeoutMs);
      this.lineRejectors.add(fail);
      cleanupLine = this.onLine((line) => {
        if (predicate(line)) {
          finish();
          resolve(line);
        }
      });
    });
  }

  private handleWorkerError(): void {
    const error = new AppError("ENGINE_ERROR", "The Stockfish worker failed.");
    const active = this.activeReject;
    this.activeReject = null;
    this.worker?.terminate();
    this.worker = null;
    this.setState("error");
    for (const reject of [...this.lineRejectors]) {
      reject(error);
    }
    active?.(error);
  }

  async load(): Promise<void> {
    if (this.worker) return;
    if (typeof Worker === "undefined") {
      this.setState("error");
      throw new AppError(
        "ENGINE_ERROR",
        "Web Workers are unavailable in this browser.",
      );
    }

    this.setState("loading");
    try {
      const worker = new Worker(ENGINE_PATH);
      this.worker = worker;
      this.supportedOptions.clear();
      worker.onmessage = (event: MessageEvent<unknown>) => {
        const line =
          typeof event.data === "string" ? event.data : String(event.data);
        if (line.startsWith("id name ")) {
          this.engineVersion = line.slice("id name ".length).trim();
        }
        if (line.startsWith("option name ")) {
          const name = line.split(/\s+/)[2];
          if (name) this.supportedOptions.add(name);
        }
        this.lineListeners.forEach((listener) => {
          listener(line);
        });
      };
      worker.onerror = () => {
        this.handleWorkerError();
      };

      worker.postMessage("uci");
      await this.waitForLine((line) => line === "uciok");
      worker.postMessage("isready");
      await this.waitForLine((line) => line === "readyok");
      this.setOption(
        "Hash",
        clampInteger(this.configuration.hashMb, 16, 512, 32),
      );
      this.setOption("Threads", 1);
      this.setOption(
        "MultiPV",
        clampInteger(this.configuration.multiPv, 1, 8, 3),
      );
      this.setState("ready");
    } catch (error) {
      this.worker?.terminate();
      this.worker = null;
      this.setState("error");
      throw error;
    }
  }

  setOption(name: string, value: string | number): void {
    if (this.supportedOptions.size && !this.supportedOptions.has(name)) {
      return;
    }
    let nextValue = value;
    if (name === "Hash") {
      nextValue = clampInteger(Number(value), 16, 512, 32);
    } else if (name === "Threads") {
      nextValue = 1;
    } else if (name === "MultiPV") {
      nextValue = clampInteger(Number(value), 1, 8, 3);
    }
    this.worker?.postMessage(`setoption name ${name} value ${nextValue}`);
  }

  private terminalAnalysis(
    fen: string,
    configuration: EngineConfiguration,
  ): PositionAnalysis {
    const terminal = terminalState(fen);
    if (!terminal) {
      throw new AppError("ENGINE_ERROR", "The position is not terminal.");
    }
    this.setState("completed");
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

  async analyse(request: AnalyseRequest): Promise<PositionAnalysis> {
    assertValidFen(request.fen);
    if (
      this.activeReject ||
      this.state === "loading" ||
      this.state === "analysing" ||
      this.state === "stopping"
    ) {
      throw new AppError(
        "ENGINE_ERROR",
        "An analysis is already running. Stop it before starting another.",
      );
    }

    const rawDepth =
      request.depth ??
      request.configuration?.depth ??
      this.configuration.depth ??
      14;
    const movetimeMs = request.movetimeMs
      ? clampInteger(request.movetimeMs, 250, 30_000, 2000)
      : undefined;
    const configuration: EngineConfiguration = {
      ...this.configuration,
      ...request.configuration,
      depth: movetimeMs ? undefined : clampInteger(rawDepth, 6, 30, 14),
      movetimeMs,
      multiPv: clampInteger(
        request.multiPv ??
          request.configuration?.multiPv ??
          this.configuration.multiPv,
        1,
        8,
        3,
      ),
      threads: 1,
      hashMb: clampInteger(
        request.configuration?.hashMb ?? this.configuration.hashMb,
        16,
        512,
        32,
      ),
      perspective: "white",
    };

    if (terminalState(request.fen)) {
      return this.terminalAnalysis(request.fen, configuration);
    }

    if (request.signal?.aborted) {
      throw new AppError("ENGINE_ERROR", "Analysis was cancelled.");
    }

    if (!this.worker) {
      await this.load();
    }
    if (!this.worker) {
      throw new AppError("ENGINE_ERROR", "Stockfish is not available.");
    }

    this.progressVariations.clear();
    this.latestProgress = {
      state: "analysing",
      variations: [],
    };
    this.stopRequested = false;
    this.setOption("Hash", configuration.hashMb);
    this.setOption("Threads", configuration.threads);
    this.setOption("MultiPV", configuration.multiPv);
    this.setState("analysing");

    const variations = new Map<number, PrincipalVariation>();
    let maxDepth = 0;
    let bestMoveUci: string | undefined;

    return new Promise<PositionAnalysis>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        finish();
        this.worker?.postMessage("stop");
        this.setState("error");
        reject(new AppError("ENGINE_ERROR", "Stockfish analysis timed out."));
      }, 120_000);

      const onAbort = () => {
        this.stop();
      };

      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        cleanupLine();
        request.signal?.removeEventListener("abort", onAbort);
        this.activeReject = null;
      };

      const cleanupLine = this.onLine((line) => {
        this.updateProgress(line, request.fen);
        const info = parseUciInfo(line, request.fen);
        if (info) {
          if (info.depth) maxDepth = Math.max(maxDepth, info.depth);
          if (info.score && info.multipv) {
            variations.set(info.multipv, {
              multipv: info.multipv,
              score: info.score,
              pv: info.pv ?? [],
              depth: info.depth ?? maxDepth,
              nodes: info.nodes,
              nps: info.nps,
            });
          }
        }

        if (!isBestMoveLine(line)) return;
        const best = parseBestMove(line);
        finish();

        if (best === null) {
          this.setState("ready");
          reject(
            new AppError(
              "ENGINE_ERROR",
              "Stockfish found no legal move in this position.",
            ),
          );
          return;
        }

        bestMoveUci = best;
        const sorted = [...variations.values()].sort(
          (left, right) => left.multipv - right.multipv,
        );
        const first = sorted[0];
        if (!first) {
          this.setState("error");
          reject(
            new AppError("ENGINE_ERROR", "Stockfish returned no evaluation."),
          );
          return;
        }
        this.setState("completed");
        resolve({
          cacheKey: analysisCacheKey({
            fen: request.fen,
            engineVersion: this.engineVersion,
            depth: configuration.depth,
            movetimeMs: configuration.movetimeMs,
            multiPv: configuration.multiPv,
            threads: configuration.threads,
            hashMb: configuration.hashMb,
          }),
          fen: request.fen,
          engineVersion: this.engineVersion,
          engineConfiguration: configuration,
          depth: maxDepth,
          seldepth: this.latestProgress.seldepth,
          nodes: this.latestProgress.nodes,
          nps: this.latestProgress.nps,
          timeMs: this.latestProgress.timeMs,
          score: first.score,
          bestMoveUci,
          principalVariations: sorted,
          partial: this.stopRequested,
          createdAt: new Date().toISOString(),
          schemaVersion: 1,
        });
      });

      this.activeReject = (error) => {
        finish();
        reject(error);
      };
      request.signal?.addEventListener("abort", onAbort, { once: true });

      this.worker?.postMessage(`position fen ${request.fen}`);
      if (request.movetimeMs) {
        this.worker?.postMessage(`go movetime ${request.movetimeMs}`);
      } else {
        this.worker?.postMessage(`go depth ${configuration.depth ?? 14}`);
      }
    });
  }

  stop(): void {
    if (!this.worker || this.state !== "analysing") return;
    this.stopRequested = true;
    this.setState("stopping");
    this.worker.postMessage("stop");
  }

  quit(): void {
    const error = new AppError("ENGINE_ERROR", "The engine was stopped.");
    const active = this.activeReject;
    this.activeReject = null;
    this.worker?.postMessage("quit");
    this.worker?.terminate();
    this.worker = null;
    this.setState("idle");
    for (const reject of [...this.lineRejectors]) {
      reject(error);
    }
    active?.(error);
  }
}
