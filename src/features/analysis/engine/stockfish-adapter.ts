import {
  analysisCacheKey,
  assertValidFen,
  isBestMoveLine,
  parseBestMove,
  parseUciInfo,
} from "@/features/analysis/engine/uci";
import type {
  EngineConfiguration,
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

export interface AnalyseRequest {
  fen: string;
  depth?: number;
  movetimeMs?: number;
  multiPv?: number;
}

export interface StockfishEngine {
  load(): Promise<void>;
  setOption(name: string, value: string | number): void;
  analyse(request: AnalyseRequest): Promise<PositionAnalysis>;
  stop(): void;
  quit(): void;
  onStateChange(listener: (state: EngineState) => void): () => void;
}

const ENGINE_PATH = "/engine/stockfish/stockfish-19-lite-single.js";

export class BrowserStockfishEngine implements StockfishEngine {
  private worker: Worker | null = null;
  private state: EngineState = "idle";
  private listeners = new Set<(state: EngineState) => void>();
  private lineListeners = new Set<(line: string) => void>();
  private engineVersion = "Stockfish 19";
  private configuration: EngineConfiguration = {
    depth: 14,
    multiPv: 3,
    threads: 1,
    hashMb: 32,
    perspective: "white",
  };

  private setState(state: EngineState): void {
    this.state = state;
    this.listeners.forEach((listener) => {
      listener(state);
    });
  }

  onStateChange(listener: (state: EngineState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private onLine(listener: (line: string) => void): () => void {
    this.lineListeners.add(listener);
    return () => this.lineListeners.delete(listener);
  }

  private waitForLine(
    predicate: (line: string) => boolean,
    timeoutMs = 30_000,
  ) {
    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(
          new AppError("ENGINE_ERROR", "Stockfish did not respond in time."),
        );
      }, timeoutMs);
      const cleanup = this.onLine((line) => {
        if (predicate(line)) {
          clearTimeout(timeout);
          cleanup();
          resolve(line);
        }
      });
    });
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
    this.worker = new Worker(ENGINE_PATH);
    this.worker.onmessage = (event: MessageEvent<unknown>) => {
      const line =
        typeof event.data === "string" ? event.data : String(event.data);
      if (line.startsWith("id name ")) {
        this.engineVersion = line.slice("id name ".length).trim();
      }
      this.lineListeners.forEach((listener) => {
        listener(line);
      });
    };
    this.worker.onerror = () => {
      this.setState("error");
    };

    this.worker.postMessage("uci");
    await this.waitForLine((line) => line === "uciok");
    this.worker.postMessage("isready");
    await this.waitForLine((line) => line === "readyok");
    this.setOption("Hash", this.configuration.hashMb);
    this.setOption("Threads", this.configuration.threads);
    this.setOption("MultiPV", this.configuration.multiPv);
    this.setState("ready");
  }

  setOption(name: string, value: string | number): void {
    this.worker?.postMessage(`setoption name ${name} value ${value}`);
  }

  async analyse(request: AnalyseRequest): Promise<PositionAnalysis> {
    assertValidFen(request.fen);
    if (!this.worker) {
      await this.load();
    }
    if (!this.worker) {
      throw new AppError("ENGINE_ERROR", "Stockfish is not available.");
    }

    const multiPv = request.multiPv ?? this.configuration.multiPv;
    const depth = request.depth ?? this.configuration.depth;
    const configuration: EngineConfiguration = {
      ...this.configuration,
      depth,
      movetimeMs: request.movetimeMs,
      multiPv,
    };

    this.setOption("MultiPV", multiPv);
    this.setState("analysing");

    const variations = new Map<number, PrincipalVariation>();
    let maxDepth = 0;
    let bestMoveUci: string | undefined;

    const resultPromise = new Promise<PositionAnalysis>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        this.setState("error");
        reject(new AppError("ENGINE_ERROR", "Stockfish analysis timed out."));
      }, 120_000);

      const cleanup = this.onLine((line) => {
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

        if (isBestMoveLine(line)) {
          const best = parseBestMove(line);
          clearTimeout(timeout);
          cleanup();

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
              depth,
              movetimeMs: request.movetimeMs,
              multiPv,
              threads: configuration.threads,
              hashMb: configuration.hashMb,
            }),
            fen: request.fen,
            engineVersion: this.engineVersion,
            engineConfiguration: configuration,
            depth: maxDepth,
            score: first.score,
            bestMoveUci,
            principalVariations: sorted,
            createdAt: new Date().toISOString(),
            schemaVersion: 1,
          });
        }
      });
    });

    this.worker.postMessage(`position fen ${request.fen}`);
    if (request.movetimeMs) {
      this.worker.postMessage(`go movetime ${request.movetimeMs}`);
    } else {
      this.worker.postMessage(`go depth ${depth}`);
    }

    return resultPromise;
  }

  stop(): void {
    if (!this.worker || this.state !== "analysing") return;
    this.setState("stopping");
    this.worker.postMessage("stop");
  }

  quit(): void {
    this.worker?.postMessage("quit");
    this.worker?.terminate();
    this.worker = null;
    this.setState("idle");
  }
}
