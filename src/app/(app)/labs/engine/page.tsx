"use client";

import { Cpu, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BrowserStockfishEngine,
  type EngineState,
} from "@/features/analysis/engine/stockfish-adapter";
import { formatEvaluation } from "@/features/analysis/engine/uci";
import type { PositionAnalysis } from "@/features/analysis/types";
import { toErrorMessage } from "@/lib/errors";

const POSITIONS = [
  {
    label: "Start",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  },
  {
    label: "Middlegame",
    fen: "r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
  },
  {
    label: "Mate",
    fen: "7k/8/5K2/8/8/8/8/6Q1 w - - 0 1",
  },
];

export default function EngineLabPage() {
  const engineRef = useRef<BrowserStockfishEngine | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [fen, setFen] = useState(POSITIONS[0].fen);
  const [depth, setDepth] = useState(14);
  const [multiPv, setMultiPv] = useState(3);
  const [state, setState] = useState<EngineState>("idle");
  const [result, setResult] = useState<PositionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
      engineRef.current?.quit();
    };
  }, []);

  async function analyse() {
    setError(null);
    setResult(null);
    try {
      if (!engineRef.current) {
        engineRef.current = new BrowserStockfishEngine();
        unsubscribeRef.current = engineRef.current.onStateChange(setState);
      }
      const engine = engineRef.current;
      await engine.load();
      const analysis = await engine.analyse({ fen, depth, multiPv });
      setResult(analysis);
    } catch (analysisError) {
      setState("error");
      setError(toErrorMessage(analysisError));
    }
  }

  function stop() {
    engineRef.current?.stop();
  }

  const busy =
    state === "loading" || state === "analysing" || state === "stopping";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Engine lab"
        description="Gate G2 proof. Load Stockfish in a Web Worker, request MultiPV, stop the search, and keep mate scores separate from centipawn scores."
        actions={
          <Button
            onClick={() => void analyse()}
            disabled={busy}
            className="h-10 px-4"
          >
            <Play aria-hidden className="size-4" />
            Analyse position
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
        <Card className="border-border/80 bg-surface-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <Cpu aria-hidden className="size-4 text-brand" />
              Position and settings
            </CardTitle>
            <CardDescription>
              The R0 engine is single-threaded. Production defaults stay
              conservative.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((position) => (
                <Button
                  key={position.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    setFen(position.fen);
                    setResult(null);
                    setError(null);
                  }}
                >
                  {position.label}
                </Button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="engine-fen"
                className="text-[11px] font-medium text-muted-foreground"
              >
                FEN
              </label>
              <Input
                id="engine-fen"
                value={fen}
                onChange={(event) => setFen(event.target.value)}
                className="h-10 font-mono text-[11px]"
                spellCheck={false}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="engine-depth-input"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  Depth
                </label>
                <Input
                  id="engine-depth-input"
                  type="number"
                  min={6}
                  max={24}
                  value={depth}
                  onChange={(event) => setDepth(Number(event.target.value))}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="engine-multipv-input"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  MultiPV
                </label>
                <Input
                  id="engine-multipv-input"
                  type="number"
                  min={1}
                  max={5}
                  value={multiPv}
                  onChange={(event) => setMultiPv(Number(event.target.value))}
                  className="h-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => void analyse()}
                disabled={busy}
                className="h-10 px-4"
              >
                <Play aria-hidden className="size-4" />
                Analyse
              </Button>
              <Button
                onClick={stop}
                disabled={!busy}
                variant="outline"
                className="h-10 border-border/80 bg-transparent px-4"
              >
                <Square aria-hidden className="size-4" />
                Stop
              </Button>
              <span
                aria-live="polite"
                className="text-[11px] text-muted-foreground"
              >
                State: {state}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5" aria-live="polite">
          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-4"
            >
              <p className="text-[12px] font-medium text-destructive">
                Engine error
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-destructive/90">
                {error}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Reload the page to start a fresh worker if the engine cannot
                recover.
              </p>
            </div>
          ) : null}

          {result ? (
            <Card className="border-border/80 bg-surface-1">
              <CardHeader>
                <CardTitle className="text-[15px]">Evaluation</CardTitle>
                <CardDescription>
                  {result.engineVersion} · depth {result.depth}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-3">
                  <p className="font-mono text-[34px] leading-none font-semibold tracking-[-0.04em] text-foreground">
                    {formatEvaluation(result.score)}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    White perspective
                  </span>
                </div>
                <div className="rounded-lg border border-border/80 bg-surface-2 p-3">
                  <p className="text-[11px] text-muted-foreground">Best move</p>
                  <p className="mt-1 font-mono text-[16px] text-foreground">
                    {result.bestMoveUci ?? "None"}
                  </p>
                </div>
                <div className="space-y-2">
                  {result.principalVariations.map((variation) => (
                    <div
                      key={variation.multipv}
                      className="rounded-lg border border-border/80 bg-surface-2 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] text-muted-foreground">
                          PV {variation.multipv}
                        </span>
                        <span className="font-mono text-[12px] text-foreground">
                          {formatEvaluation(variation.score)}
                        </span>
                      </div>
                      <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {variation.pv.join(" ")}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {!result && !error ? (
            <Card className="border-dashed border-border/80 bg-surface-1">
              <CardHeader>
                <CardTitle className="text-[15px]">No analysis yet</CardTitle>
                <CardDescription>
                  Load the worker and analyse a position. The first analysis
                  downloads the engine and network from the local app assets.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
