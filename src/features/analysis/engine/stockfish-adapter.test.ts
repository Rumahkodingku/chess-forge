import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BrowserStockfishEngine,
  type EngineProgress,
} from "@/features/analysis/engine/stockfish-adapter";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const MATE_FEN =
  "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";

class FakeWorker {
  static instances: FakeWorker[] = [];
  static autoFinish = true;
  static failOnUci = false;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  messages: string[] = [];

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(message: string) {
    this.messages.push(message);
    setTimeout(() => this.respond(message), 0);
  }

  terminate() {}

  emit(line: string) {
    this.onmessage?.({ data: line } as MessageEvent<string>);
  }

  private respond(message: string) {
    if (message === "uci") {
      if (FakeWorker.failOnUci) {
        this.onerror?.();
        return;
      }
      this.emit("id name Stockfish 19 test");
      this.emit("option name Hash type spin default 16 min 1 max 2048");
      this.emit("option name Threads type spin default 1 min 1 max 1");
      this.emit("option name MultiPV type spin default 1 min 1 max 8");
      this.emit("uciok");
      return;
    }
    if (message === "isready") {
      this.emit("readyok");
      return;
    }
    if (message.startsWith("go ")) {
      this.emit(
        "info depth 1 seldepth 2 multipv 1 score cp 30 nodes 100 nps 1000 time 10 pv e2e4 e7e5",
      );
      this.emit(
        "info depth 2 seldepth 3 multipv 1 score cp 34 nodes 400 nps 2000 time 20 pv e2e4 e7e5",
      );
      if (FakeWorker.autoFinish) {
        this.emit("bestmove e2e4 ponder e7e5");
      }
      return;
    }
    if (message === "stop") {
      this.emit("bestmove e2e4");
    }
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeWorker.instances = [];
  FakeWorker.autoFinish = true;
  FakeWorker.failOnUci = false;
});

describe("BrowserStockfishEngine", () => {
  it("loads options and reports progress while analysing", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const engine = new BrowserStockfishEngine();
    const states: string[] = [];
    const progress: EngineProgress[] = [];
    engine.onStateChange((state) => states.push(state));
    engine.onProgress((update) => progress.push(update));

    await engine.load();
    expect(engine.getVersion()).toBe("Stockfish 19 test");
    expect(states).toContain("loading");
    expect(states).toContain("ready");

    const result = await engine.analyse({
      fen: START_FEN,
      depth: 2,
      multiPv: 2,
    });

    expect(result.depth).toBe(2);
    expect(result.score).toEqual({
      type: "cp",
      value: 34,
      perspective: "white",
    });
    expect(result.bestMoveUci).toBe("e2e4");
    expect(result.principalVariations[0]?.pv).toEqual(["e2e4", "e7e5"]);
    expect(result.timeMs).toBe(20);
    expect(progress.some((update) => update.depth === 2)).toBe(true);
    expect(progress.some((update) => update.depth === 1)).toBe(true);
    const depthOne = progress.find((update) => update.depth === 1);
    const depthTwo = progress.find((update) => update.depth === 2);
    expect(depthOne).not.toBe(depthTwo);
    expect(states).toContain("analysing");
    expect(states).toContain("completed");
  });

  it("rejects load when the worker fails to start", async () => {
    FakeWorker.failOnUci = true;
    vi.stubGlobal("Worker", FakeWorker);
    const engine = new BrowserStockfishEngine();
    await expect(engine.load()).rejects.toThrow(/worker failed/i);
  });

  it("returns the latest partial result after stop", async () => {
    FakeWorker.autoFinish = false;
    vi.stubGlobal("Worker", FakeWorker);
    const engine = new BrowserStockfishEngine();
    await engine.load();

    const pending = engine.analyse({ fen: START_FEN, depth: 20, multiPv: 1 });
    await new Promise((resolve) => setTimeout(resolve, 10));
    engine.stop();
    const result = await pending;

    expect(result.depth).toBe(2);
    expect(result.bestMoveUci).toBe("e2e4");
    expect(result.partial).toBe(true);
  });

  it("rejects the active search when the worker errors", async () => {
    FakeWorker.autoFinish = false;
    vi.stubGlobal("Worker", FakeWorker);
    const engine = new BrowserStockfishEngine();
    await engine.load();
    const pending = engine.analyse({ fen: START_FEN, depth: 20, multiPv: 1 });
    await new Promise((resolve) => setTimeout(resolve, 10));
    FakeWorker.instances[0]?.onerror?.();
    await expect(pending).rejects.toThrow();
  });

  it("rejects a second search while one is running", async () => {
    FakeWorker.autoFinish = false;
    vi.stubGlobal("Worker", FakeWorker);
    const engine = new BrowserStockfishEngine();
    await engine.load();
    const pending = engine.analyse({ fen: START_FEN, depth: 20, multiPv: 1 });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await expect(
      engine.analyse({ fen: START_FEN, depth: 20, multiPv: 1 }),
    ).rejects.toThrow(/already running/i);
    engine.stop();
    await pending;
  });

  it("settles a pending search when quit", async () => {
    FakeWorker.autoFinish = false;
    vi.stubGlobal("Worker", FakeWorker);
    const engine = new BrowserStockfishEngine();
    await engine.load();
    const pending = engine.analyse({ fen: START_FEN, depth: 20, multiPv: 1 });
    await new Promise((resolve) => setTimeout(resolve, 10));
    engine.quit();
    await expect(pending).rejects.toThrow(/stopped/i);
  });

  it("clamps configuration before sending it to the engine", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const engine = new BrowserStockfishEngine();
    await engine.load();
    const result = await engine.analyse({
      fen: START_FEN,
      depth: 99,
      multiPv: 99,
      configuration: { threads: 8, hashMb: 99_999 },
    });

    expect(result.engineConfiguration.depth).toBe(30);
    expect(result.engineConfiguration.multiPv).toBe(8);
    expect(result.engineConfiguration.threads).toBe(1);
    expect(result.engineConfiguration.hashMb).toBe(512);
    expect(FakeWorker.instances[0]?.messages).toContain(
      "setoption name Hash value 512",
    );
    expect(FakeWorker.instances[0]?.messages).toContain(
      "setoption name MultiPV value 8",
    );
    expect(FakeWorker.instances[0]?.messages).toContain("go depth 30");
  });

  it("returns terminal positions without starting the worker", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const engine = new BrowserStockfishEngine();
    const result = await engine.analyse({ fen: MATE_FEN, depth: 10 });
    expect(result.terminal).toBe("checkmate");
    expect(result.terminalWinner).toBe("b");
    expect(FakeWorker.instances).toHaveLength(0);
  });
});
