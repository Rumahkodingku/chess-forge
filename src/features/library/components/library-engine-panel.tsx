"use client";

import { Chess } from "chess.js";
import { Cpu, Loader2, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BrowserStockfishEngine,
  type EngineState,
} from "@/features/analysis/engine/stockfish-adapter";
import { formatEvaluation } from "@/features/analysis/engine/uci";
import type { PositionAnalysis } from "@/features/analysis/types";
import { toErrorMessage } from "@/lib/errors";

function bestMoveLabel(analysis: PositionAnalysis): string {
  if (!analysis.bestMoveUci) return "None";
  try {
    return new Chess(analysis.fen).move(analysis.bestMoveUci).san;
  } catch {
    return analysis.bestMoveUci;
  }
}

export function LibraryEnginePanel({ fen }: { fen: string }) {
  const [state, setState] = useState<EngineState>("idle");
  const [analysis, setAnalysis] = useState<PositionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<BrowserStockfishEngine | null>(null);

  useEffect(() => {
    return () => {
      engineRef.current?.quit();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    void fen;
    setAnalysis(null);
    setError(null);
    setState("idle");
  }, [fen]);

  async function analyse() {
    setError(null);
    setAnalysis(null);
    const engine = engineRef.current ?? new BrowserStockfishEngine();
    engineRef.current = engine;
    try {
      setState("loading");
      await engine.load();
      setState("analysing");
      const result = await engine.analyse({
        fen,
        depth: 14,
        multiPv: 2,
      });
      setAnalysis(result);
      setState("ready");
    } catch (engineError) {
      setState("error");
      setError(toErrorMessage(engineError));
    }
  }

  const busy = state === "loading" || state === "analysing";

  return (
    <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
      <h2 className="flex items-center gap-2 text-[13px] font-medium text-foreground">
        <Cpu aria-hidden className="size-4 text-brand" />
        Engine lines
      </h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Local Stockfish. Runs only when you ask.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 px-2.5"
          onClick={() => void analyse()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : (
            <Play aria-hidden className="size-3.5" />
          )}
          Analyse
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 border-border/80 bg-transparent px-2.5"
          onClick={() => {
            engineRef.current?.stop();
            setState("idle");
          }}
          disabled={!busy}
        >
          <Square aria-hidden className="size-3.5" />
          Stop
        </Button>
      </div>
      {error ? (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
          {error}
        </p>
      ) : null}
      {analysis ? (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-muted-foreground">
            {formatEvaluation(analysis.score)} · best {bestMoveLabel(analysis)}
          </p>
          {analysis.principalVariations.slice(0, 2).map((variation) => (
            <p
              key={variation.multipv}
              className="rounded-md border border-border/70 bg-surface-2/60 px-2 py-1.5 font-mono text-[10px] text-muted-foreground"
            >
              {variation.pv.join(" ")}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
