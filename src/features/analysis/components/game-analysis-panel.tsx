"use client";

import { Loader2, Pause, Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GameAnalysisProgress } from "@/features/analysis/queue";

interface GameAnalysisPanelProps {
  progress: GameAnalysisProgress | null;
  analysedMoves: number;
  moveCount: number;
  error: string | null;
  busy: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

export function GameAnalysisPanel({
  progress,
  analysedMoves,
  moveCount,
  error,
  busy,
  onStart,
  onPause,
  onResume,
  onCancel,
  onRetry,
}: GameAnalysisPanelProps) {
  const state = progress?.state ?? "idle";
  const running = state === "running";
  const paused = state === "paused";
  const failed = state === "error";
  const complete = analysedMoves >= moveCount && moveCount > 0;
  const percent = progress?.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <Card className="border-border/80 bg-surface-1">
      <CardHeader>
        <CardTitle className="text-[15px]">Full-game analysis</CardTitle>
        <CardDescription>
          Sequential positions, depth from settings, MultiPV 1. Pause finishes
          the active position.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress ? (
          <div className="space-y-2" aria-live="polite">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.completed}
              aria-label="Full-game analysis progress"
              className="h-2 overflow-hidden rounded-full bg-surface-3"
            >
              <div
                className="h-full bg-brand transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {progress.completed} / {progress.total} positions ·{" "}
              {progress.skipped} cached ·{" "}
              {Math.round(progress.elapsedMs / 1000)}s · state {progress.state}
              {progress.activePly !== undefined
                ? ` · active ply ${progress.activePly}`
                : ""}
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {analysedMoves
              ? `${analysedMoves} of ${moveCount} moves already assessed.`
              : "No full-game analysis yet."}
          </p>
        )}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[12px] leading-relaxed text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {running ? (
            <>
              <Button
                type="button"
                onClick={onPause}
                variant="outline"
                className="h-9 border-border/80 bg-transparent px-3"
              >
                <Pause aria-hidden className="size-3.5" />
                Pause
              </Button>
              <Button
                type="button"
                onClick={onCancel}
                variant="outline"
                className="h-9 border-border/80 bg-transparent px-3"
              >
                <Square aria-hidden className="size-3.5" />
                Cancel
              </Button>
            </>
          ) : paused ? (
            <>
              <Button type="button" onClick={onResume} className="h-9 px-3">
                <Play aria-hidden className="size-3.5" />
                Resume
              </Button>
              <Button
                type="button"
                onClick={onCancel}
                variant="outline"
                className="h-9 border-border/80 bg-transparent px-3"
              >
                Cancel
              </Button>
            </>
          ) : failed ? (
            <Button
              type="button"
              onClick={onRetry}
              disabled={busy}
              className="h-9 px-3"
            >
              <RotateCcw aria-hidden className="size-3.5" />
              Retry
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onStart}
              disabled={!moveCount || busy}
              className="h-9 px-3"
            >
              <Play aria-hidden className="size-3.5" />
              {complete ? "Re-analyse game" : "Analyse game"}
            </Button>
          )}
        </div>

        {!running && analysedMoves > 0 && analysedMoves < moveCount ? (
          <Button
            type="button"
            onClick={onResume}
            disabled={busy}
            variant="outline"
            className="h-9 border-border/80 bg-transparent px-3"
          >
            Resume analysis
          </Button>
        ) : null}

        {running ? (
          <p className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Loader2 aria-hidden className="size-3 animate-spin" />
            The active position finishes before pause takes effect.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
