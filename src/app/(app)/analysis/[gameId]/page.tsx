"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Loader2,
  Play,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BrowserStockfishEngine,
  type EngineState,
} from "@/features/analysis/engine/stockfish-adapter";
import { formatEvaluation } from "@/features/analysis/engine/uci";
import type { PositionAnalysis } from "@/features/analysis/types";
import type { Game } from "@/features/games/types";
import {
  createGameRepository,
  createProjectRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { createWalkingSkeletonProject } from "@/features/studio/project-factory";
import { BoardSvg } from "@/features/studio/rendering/board-svg";
import { toErrorMessage } from "@/lib/errors";
import { isUuid } from "@/lib/validation";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type LoadState = "loading" | "ready" | "invalid" | "missing" | "error";

function moveLabel(san: string, fullMoveNumber: number, color: "w" | "b") {
  return `${fullMoveNumber}${color === "w" ? "." : "..."} ${san}`;
}

export default function AnalysisGamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = Array.isArray(params.gameId)
    ? params.gameId[0]
    : params.gameId;
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPly, setSelectedPly] = useState(0);
  const [engineState, setEngineState] = useState<EngineState>("idle");
  const [analysis, setAnalysis] = useState<PositionAnalysis | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const engineRef = useRef<BrowserStockfishEngine | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!isUuid(gameId)) {
      setLoadState("invalid");
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const stored = await createGameRepository(db).getById(gameId);
        if (cancelled) return;
        if (!stored) {
          setLoadState("missing");
          return;
        }
        setGame(stored);
        setLoadState("ready");
      } catch (error) {
        if (!cancelled) {
          setLoadError(toErrorMessage(error));
          setLoadState("error");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
      engineRef.current?.quit();
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedPly is the trigger for clearing stale engine state.
  useEffect(() => {
    requestIdRef.current += 1;
    engineRef.current?.stop();
    setAnalysis(null);
    setEngineError(null);
  }, [selectedPly]);

  const currentMove =
    game && selectedPly > 0 ? game.moves[selectedPly - 1] : undefined;
  const boardFen = game
    ? selectedPly === 0
      ? game.initialFen
      : (currentMove?.fenAfter ?? game.initialFen)
    : START_FEN;

  useEffect(() => {
    if (!game) return;
    const moveCount = game.moves.length;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedPly((current) => Math.max(0, current - 1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedPly((current) => Math.min(moveCount, current + 1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game]);

  async function analyse() {
    if (!game) return;
    const fen = selectedPly === 0 ? game.initialFen : currentMove?.fenBefore;
    if (!fen) return;

    setEngineError(null);
    setAnalysis(null);
    const requestId = ++requestIdRef.current;
    try {
      if (!engineRef.current) {
        engineRef.current = new BrowserStockfishEngine();
        unsubscribeRef.current =
          engineRef.current.onStateChange(setEngineState);
      }
      const engine = engineRef.current;
      await engine.load();
      const result = await engine.analyse({ fen, depth: 14, multiPv: 3 });
      if (requestId === requestIdRef.current) {
        setAnalysis(result);
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setEngineState("error");
        setEngineError(toErrorMessage(error));
      }
    }
  }

  function stopAnalysis() {
    engineRef.current?.stop();
  }

  async function createScene() {
    if (!game || selectedPly === 0) return;
    setCreating(true);
    setCreateError(null);
    try {
      const project = createWalkingSkeletonProject({ game, selectedPly });
      const db = await openChessForgeDatabase();
      await createProjectRepository(db).save(project);
      router.push(`/studio/${project.id}`);
    } catch (error) {
      setCreateError(toErrorMessage(error));
      setCreating(false);
    }
  }

  if (loadState === "invalid" || loadState === "missing") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Game not found"
          description="The game route is invalid or the game is not in this local workspace."
          actions={
            <Button
              asChild
              variant="outline"
              className="h-10 border-border/80 bg-transparent px-4"
            >
              <Link href="/analysis">Import a game</Link>
            </Button>
          }
        />
        <EmptyState
          title="No game to open"
          description="Import the R1 fixture from the analysis page, then choose a move to analyse."
          action={
            <Button asChild className="h-9">
              <Link href="/analysis">Back to import</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (loadState === "loading") {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl border border-border/70 bg-surface-1" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <div className="h-[520px] animate-pulse rounded-xl border border-border/70 bg-surface-1" />
          <div className="h-[320px] animate-pulse rounded-xl border border-border/70 bg-surface-1" />
        </div>
      </div>
    );
  }

  if (loadState === "error" || !game) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Game could not load"
          description="The local record could not be read."
        />
        <EmptyState
          title="Storage error"
          description={loadError ?? "Reload the page and try again."}
          action={
            <Button asChild className="h-9">
              <Link href="/analysis">Back to import</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const engineBusy =
    engineState === "loading" ||
    engineState === "analysing" ||
    engineState === "stopping";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${game.metadata.white} vs ${game.metadata.black}`}
        description={`${game.metadata.result} · ${game.moves.length} ply. Select a move to analyse the position before it, then forge one scene.`}
        actions={
          <Button
            asChild
            variant="outline"
            className="h-10 border-border/80 bg-transparent px-4"
          >
            <Link href="/analysis">
              <ArrowLeft aria-hidden className="size-4" />
              Import another
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <div className="space-y-5">
          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[15px]">Position</CardTitle>
              <CardDescription>
                {selectedPly === 0
                  ? "Starting position"
                  : moveLabel(
                      currentMove?.san ?? "",
                      currentMove?.fullMoveNumber ?? 1,
                      currentMove?.color ?? "w",
                    )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mx-auto max-w-[620px] rounded-xl border border-border/80 bg-surface-2 p-3 board-shadow">
                <BoardSvg
                  fen={boardFen}
                  lastMove={currentMove?.uci}
                  coordinates
                  label="Game position"
                />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-border/80 bg-transparent"
                  onClick={() => setSelectedPly(0)}
                  disabled={selectedPly === 0}
                  aria-label="First move"
                >
                  <ChevronFirst aria-hidden className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-border/80 bg-transparent"
                  onClick={() =>
                    setSelectedPly((current) => Math.max(0, current - 1))
                  }
                  disabled={selectedPly === 0}
                  aria-label="Previous move"
                >
                  <ChevronLeft aria-hidden className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-border/80 bg-transparent"
                  onClick={() =>
                    setSelectedPly((current) =>
                      Math.min(game.moves.length, current + 1),
                    )
                  }
                  disabled={selectedPly === game.moves.length}
                  aria-label="Next move"
                >
                  <ChevronRight aria-hidden className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-border/80 bg-transparent"
                  onClick={() => setSelectedPly(game.moves.length)}
                  disabled={selectedPly === game.moves.length}
                  aria-label="Last move"
                >
                  <ChevronLast aria-hidden className="size-4" />
                </Button>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Use the left and right arrow keys to move one ply.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[15px]">Moves</CardTitle>
              <CardDescription>
                Direct selection updates the board and clears the engine result.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setSelectedPly(0)}
                  aria-current={selectedPly === 0 ? "true" : undefined}
                  className={`flex min-h-9 items-center rounded-md border px-2.5 text-left font-mono text-[11px] transition-colors ${
                    selectedPly === 0
                      ? "border-brand/40 bg-brand/10 text-foreground"
                      : "border-border/70 bg-surface-2/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Start
                </button>
                {game.moves.map((move) => (
                  <button
                    key={move.ply}
                    type="button"
                    onClick={() => setSelectedPly(move.ply)}
                    aria-current={selectedPly === move.ply ? "true" : undefined}
                    className={`flex min-h-9 items-center rounded-md border px-2.5 text-left font-mono text-[11px] transition-colors ${
                      selectedPly === move.ply
                        ? "border-brand/40 bg-brand/10 text-foreground"
                        : "border-border/70 bg-surface-2/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {moveLabel(move.san, move.fullMoveNumber, move.color)}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <Cpu aria-hidden className="size-4 text-brand" />
                Engine
              </CardTitle>
              <CardDescription>
                Position before the selected move. One-shot, MultiPV 3.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void analyse()}
                  disabled={engineBusy}
                  className="h-10 px-4"
                >
                  {engineState === "loading" || engineState === "analysing" ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <Play aria-hidden className="size-4" />
                  )}
                  Analyse position
                </Button>
                <Button
                  type="button"
                  onClick={stopAnalysis}
                  disabled={!engineBusy}
                  variant="outline"
                  className="h-10 border-border/80 bg-transparent px-4"
                >
                  <Square aria-hidden className="size-4" />
                  Stop
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                State: {engineState}
              </p>

              {engineError ? (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[12px] leading-relaxed text-destructive"
                >
                  {engineError}
                </p>
              ) : null}

              {analysis ? (
                <div className="space-y-3">
                  <div className="flex items-baseline gap-3">
                    <p className="font-mono text-[32px] leading-none font-semibold tracking-[-0.04em] text-foreground">
                      {formatEvaluation(analysis.score)}
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      White perspective
                    </span>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-surface-2 p-3">
                    <p className="text-[11px] text-muted-foreground">
                      Best move
                    </p>
                    <p className="mt-1 font-mono text-[15px] text-foreground">
                      {analysis.bestMoveUci ?? "None"}
                    </p>
                  </div>
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
                </div>
              ) : (
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  Select a move and analyse the position before it. Scene
                  creation works even if the engine fails.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[15px]">Forge a scene</CardTitle>
              <CardDescription>
                One move, three seconds, 9:16, with the move sound.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                onClick={() => void createScene()}
                disabled={selectedPly === 0 || creating}
                className="h-10 px-4"
              >
                {creating ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : (
                  <ArrowRight aria-hidden className="size-4" />
                )}
                {creating ? "Creating" : "Create 3-second scene"}
              </Button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {selectedPly === 0
                  ? "Select a move first. The project is saved when the scene is created."
                  : "The project saves immediately, then opens in the studio."}
              </p>
              {createError ? (
                <p
                  role="alert"
                  className="text-[11px] leading-relaxed text-destructive"
                >
                  {createError}
                </p>
              ) : null}
              <Button
                asChild
                variant="ghost"
                className="h-9 justify-start px-2 text-[11px]"
              >
                <Link href="/studio">Open studio project list</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
