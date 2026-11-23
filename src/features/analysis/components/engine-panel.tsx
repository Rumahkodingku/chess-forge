"use client";

import { Chess } from "chess.js";
import { Cpu, Loader2, Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  EngineProgress,
  EngineState,
} from "@/features/analysis/engine/stockfish-adapter";
import { formatEvaluationForPerspective } from "@/features/analysis/evaluation";
import type {
  AnalysisPerspective,
  PositionAnalysis,
} from "@/features/analysis/types";

function bestMoveLabel(analysis: PositionAnalysis | null): string {
  if (!analysis?.bestMoveUci) return "None";
  try {
    return new Chess(analysis.fen).move(analysis.bestMoveUci).san;
  } catch {
    return analysis.bestMoveUci;
  }
}

interface EnginePanelProps {
  state: EngineState;
  analysis: PositionAnalysis | null;
  progress: EngineProgress | null;
  cached: boolean;
  busy: boolean;
  error: string | null;
  perspective: AnalysisPerspective;
  positionLabel: string;
  sideToMove: "w" | "b";
  onPerspectiveChange: (perspective: AnalysisPerspective) => void;
  onAnalyse: () => void;
  onStop: () => void;
  onRestart: () => void;
  stopDisabled?: boolean;
  pvVariation: number | null;
  pvStep: number;
  onPvSelect: (variation: number) => void;
  onPvStep: (step: number) => void;
  onPvExit: () => void;
}

export function EnginePanel({
  state,
  analysis,
  progress,
  cached,
  busy,
  error,
  perspective,
  positionLabel,
  sideToMove,
  onPerspectiveChange,
  onAnalyse,
  onStop,
  onRestart,
  stopDisabled = false,
  pvVariation,
  pvStep,
  onPvSelect,
  onPvStep,
  onPvExit,
}: EnginePanelProps) {
  const displayScore = analysis
    ? formatEvaluationForPerspective(analysis.score, sideToMove, perspective)
    : null;
  const selectedVariation =
    pvVariation === null
      ? undefined
      : analysis?.principalVariations.find(
          (variation) => variation.multipv === pvVariation,
        );

  return (
    <Card className="border-border/80 bg-surface-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Cpu aria-hidden className="size-4 text-brand" />
          Engine
        </CardTitle>
        <CardDescription>
          {positionLabel}. Depth or time from settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={perspective === "white" ? "default" : "outline"}
              className="h-8 px-2.5 text-[10px]"
              onClick={() => onPerspectiveChange("white")}
            >
              White perspective
            </Button>
            <Button
              type="button"
              size="sm"
              variant={perspective === "side-to-move" ? "default" : "outline"}
              className="h-8 px-2.5 text-[10px]"
              onClick={() => onPerspectiveChange("side-to-move")}
            >
              Side to move
            </Button>
          </div>
          <span
            aria-live="polite"
            className="text-[10px] text-muted-foreground"
          >
            State: {state}
            {cached ? " · Cached" : ""}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={onAnalyse}
            disabled={busy}
            className="h-10 px-4"
          >
            {busy ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Play aria-hidden className="size-4" />
            )}
            Analyse position
          </Button>
          <Button
            type="button"
            onClick={onStop}
            disabled={!busy || stopDisabled}
            variant="outline"
            className="h-10 border-border/80 bg-transparent px-4"
          >
            <Square aria-hidden className="size-4" />
            Stop
          </Button>
          <Button
            type="button"
            onClick={onRestart}
            disabled={busy || !analysis}
            variant="outline"
            className="h-10 border-border/80 bg-transparent px-4"
          >
            <RotateCcw aria-hidden className="size-4" />
            Restart
          </Button>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[12px] leading-relaxed text-destructive"
          >
            {error}
          </p>
        ) : null}

        {busy && progress ? (
          <p className="text-[11px] text-muted-foreground" aria-live="polite">
            Depth {progress.depth ?? "?"} · nodes {progress.nodes ?? 0} · NPS{" "}
            {progress.nps ?? 0}
          </p>
        ) : null}

        {analysis ? (
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <p className="font-mono text-[32px] leading-none font-semibold tracking-[-0.04em] text-foreground">
                {displayScore}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {perspective === "white" ? "White perspective" : "Side to move"}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border/80 bg-surface-2 p-3">
                <p className="text-[11px] text-muted-foreground">Best move</p>
                <p className="mt-1 font-mono text-[15px] text-foreground">
                  {bestMoveLabel(analysis)}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-surface-2 p-3">
                <p className="text-[11px] text-muted-foreground">Search</p>
                <p className="mt-1 text-[11px] leading-relaxed text-foreground">
                  depth {analysis.depth}
                  {analysis.seldepth ? ` / ${analysis.seldepth}` : ""} ·{" "}
                  {analysis.nodes ?? 0} nodes · {analysis.nps ?? 0} NPS
                  {analysis.timeMs ? ` · ${analysis.timeMs} ms` : ""}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {analysis.engineVersion} · MultiPV{" "}
              {analysis.engineConfiguration.multiPv} ·{" "}
              {analysis.engineConfiguration.movetimeMs
                ? `${analysis.engineConfiguration.movetimeMs} ms`
                : `depth ${analysis.engineConfiguration.depth ?? 14}`}
              {analysis.partial ? " · Partial result" : ""}
            </p>

            <div className="space-y-2">
              {analysis.principalVariations.map((variation) => (
                <div
                  key={variation.multipv}
                  className="rounded-lg border border-border/80 bg-surface-2 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-muted-foreground">
                      PV {variation.multipv}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 border-border/80 bg-transparent px-2 text-[10px]"
                      onClick={() => onPvSelect(variation.multipv)}
                    >
                      Step PV
                    </Button>
                  </div>
                  <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {variation.pv.join(" ")}
                  </p>
                </div>
              ))}
            </div>

            {selectedVariation && analysis ? (
              <div className="rounded-lg border border-brand/30 bg-brand/10 p-3">
                <p className="text-[10px] text-brand">
                  PV {selectedVariation.multipv} · step {pvStep} /{" "}
                  {selectedVariation.pv.length}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 border-border/80 bg-transparent px-2 text-[10px]"
                    disabled={pvStep <= 0}
                    onClick={() => onPvStep(pvStep - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 border-border/80 bg-transparent px-2 text-[10px]"
                    disabled={pvStep >= selectedVariation.pv.length}
                    onClick={() => onPvStep(pvStep + 1)}
                  >
                    Next
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[10px]"
                    onClick={onPvExit}
                  >
                    Back to game
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : !busy && !error ? (
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Analyse the position before the selected move. Scene creation works
            even if the engine fails.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
