"use client";

import type { PieceSymbol } from "chess.js";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
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
import { useEffect, useMemo, useRef, useState } from "react";
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
import { capturedPieces } from "@/features/chess/captured";
import { CapturedPieces } from "@/features/chess/captured-pieces";
import { ChessgroundBoard } from "@/features/chess/chessground-board";
import { nagLabels } from "@/features/chess/nags";
import {
  type AnalysisBoardTheme,
  boardThemeFromSetting,
} from "@/features/chess/theme";
import type { Game, Move } from "@/features/games/types";
import {
  createGameRepository,
  createProjectRepository,
  createSettingsRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { createWalkingSkeletonProject } from "@/features/studio/project-factory";
import { toErrorMessage } from "@/lib/errors";
import { isUuid } from "@/lib/validation";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type LoadState = "loading" | "ready" | "invalid" | "missing" | "error";

function moveLabel(san: string, fullMoveNumber: number, color: "w" | "b") {
  return `${fullMoveNumber}${color === "w" ? "." : "..."} ${san}`;
}

function PlayerRow({
  name,
  elo,
  captured,
  capturedColor,
  playerColor,
}: {
  name: string;
  elo?: number;
  captured: PieceSymbol[];
  capturedColor: "w" | "b";
  playerColor: "w" | "b";
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className={`size-2.5 shrink-0 rounded-full border border-border-strong ${
          playerColor === "b" ? "bg-zinc-900" : "bg-zinc-100"
        }`}
      />
      <p className="min-w-0 truncate text-[12px] font-medium text-foreground">
        {name}
        {elo ? (
          <span className="ml-1.5 font-mono text-[10px] font-normal text-muted-foreground">
            {elo}
          </span>
        ) : null}
      </p>
      <CapturedPieces pieces={captured} color={capturedColor} owner={name} />
    </div>
  );
}

function MoveDetail({ move }: { move?: Move }) {
  if (!move) {
    return (
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Starting position selected. Choose a move to see its comment, NAGs, and
        variations.
      </p>
    );
  }

  const nags = nagLabels(move.nags);

  return (
    <dl className="space-y-3 text-[11px]">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Move</dt>
        <dd className="font-mono text-[14px] font-medium text-foreground">
          {moveLabel(move.san, move.fullMoveNumber, move.color)}
        </dd>
        <dd className="font-mono text-[10px] text-muted-foreground">
          {move.uci}
        </dd>
      </div>
      {nags.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <dt className="text-muted-foreground">NAG</dt>
          <dd className="flex flex-wrap gap-1">
            {nags.map((nag, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: labels repeat, index keeps duplicates distinct.
                key={`${nag}-${index}`}
                className="rounded border border-brand/30 bg-brand/10 px-1.5 py-0.5 font-mono text-[10px] text-brand"
              >
                {nag}
              </span>
            ))}
          </dd>
        </div>
      ) : null}
      {move.comment ? (
        <div>
          <dt className="text-muted-foreground">Comment</dt>
          <dd className="mt-1 leading-relaxed text-foreground">
            {move.comment}
          </dd>
        </div>
      ) : null}
      {move.variations?.length ? (
        <div>
          <dt className="text-muted-foreground">Variations</dt>
          <dd className="mt-1 space-y-1">
            {move.variations.map((variation, index) => (
              <p
                // biome-ignore lint/suspicious/noArrayIndexKey: variation lines are read-only text.
                key={`${variation}-${index}`}
                className="rounded border border-border/70 bg-surface-2/60 px-2 py-1.5 font-mono leading-relaxed text-muted-foreground"
              >
                {variation}
              </p>
            ))}
          </dd>
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded border border-border/70 bg-surface-2/60 px-2 py-1.5">
          <dt className="text-muted-foreground">FEN before</dt>
          <dd className="mt-1 break-all font-mono text-[10px] leading-relaxed text-foreground">
            {move.fenBefore}
          </dd>
        </div>
        <div className="rounded border border-border/70 bg-surface-2/60 px-2 py-1.5">
          <dt className="text-muted-foreground">FEN after</dt>
          <dd className="mt-1 break-all font-mono text-[10px] leading-relaxed text-foreground">
            {move.fenAfter}
          </dd>
        </div>
      </div>
    </dl>
  );
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
  const [orientation, setOrientation] = useState<"w" | "b">("w");
  const [boardTheme, setBoardTheme] = useState<AnalysisBoardTheme>("forge");
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
        const [stored, settings] = await Promise.all([
          createGameRepository(db).getById(gameId),
          createSettingsRepository(db).get(),
        ]);
        if (cancelled) return;
        setBoardTheme(boardThemeFromSetting(settings?.boardTheme));
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

  const captured = useMemo(
    () =>
      game ? capturedPieces(game, selectedPly) : { byWhite: [], byBlack: [] },
    [game, selectedPly],
  );

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
      if (event.key === "Home") {
        event.preventDefault();
        setSelectedPly(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        setSelectedPly(moveCount);
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
          description="Import a PGN from the analysis page, then choose a move to analyse."
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

  const topPlayer =
    orientation === "w" ? game.metadata.black : game.metadata.white;
  const bottomPlayer =
    orientation === "w" ? game.metadata.white : game.metadata.black;
  const topElo =
    orientation === "w" ? game.metadata.blackElo : game.metadata.whiteElo;
  const bottomElo =
    orientation === "w" ? game.metadata.whiteElo : game.metadata.blackElo;
  const topCaptured = orientation === "w" ? captured.byBlack : captured.byWhite;
  const bottomCaptured =
    orientation === "w" ? captured.byWhite : captured.byBlack;
  const topCapturedColor = orientation === "w" ? "w" : "b";
  const bottomCapturedColor = orientation === "w" ? "b" : "w";
  const positionLabel =
    selectedPly === 0
      ? "Starting position"
      : moveLabel(
          currentMove?.san ?? "",
          currentMove?.fullMoveNumber ?? 1,
          currentMove?.color ?? "w",
        );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${game.metadata.white} vs ${game.metadata.black}`}
        description={`${game.metadata.result} · ${game.moves.length} ply. Replay the game, select a move, then analyse the position before it.`}
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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-[15px]">Replay</CardTitle>
                  <CardDescription>{positionLabel}</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOrientation((current) => (current === "w" ? "b" : "w"))
                  }
                  aria-label="Flip board"
                  className="h-9 border-border/80 bg-transparent px-3"
                >
                  <ArrowUpDown aria-hidden className="size-3.5" />
                  Flip
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mx-auto w-full max-w-[560px] space-y-2">
                <PlayerRow
                  name={topPlayer}
                  elo={topElo}
                  captured={topCaptured}
                  capturedColor={topCapturedColor}
                  playerColor={orientation === "w" ? "b" : "w"}
                />
                <div className="rounded-xl border border-border/80 bg-surface-2 p-2 board-shadow">
                  <ChessgroundBoard
                    fen={boardFen}
                    orientation={orientation}
                    lastMove={currentMove?.uci}
                    theme={boardTheme}
                    label={`Position: ${positionLabel}`}
                  />
                </div>
                <PlayerRow
                  name={bottomPlayer}
                  elo={bottomElo}
                  captured={bottomCaptured}
                  capturedColor={bottomCapturedColor}
                  playerColor={orientation === "w" ? "w" : "b"}
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
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Arrow keys move one ply. Home and End jump to the start or end.
                Shift-click or right-click the board to draw. Annotations clear
                when the ply or orientation changes.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[15px]">Moves</CardTitle>
              <CardDescription>
                Select a move to update the board and clear the engine result.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[420px] grid grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
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
                {game.moves.map((move) => {
                  const nags = nagLabels(move.nags);
                  return (
                    <button
                      key={move.ply}
                      type="button"
                      onClick={() => setSelectedPly(move.ply)}
                      aria-current={
                        selectedPly === move.ply ? "true" : undefined
                      }
                      className={`flex min-h-9 items-center justify-between gap-1 rounded-md border px-2.5 py-1 text-left font-mono text-[11px] transition-colors ${
                        selectedPly === move.ply
                          ? "border-brand/40 bg-brand/10 text-foreground"
                          : "border-border/70 bg-surface-2/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="truncate">
                        {moveLabel(move.san, move.fullMoveNumber, move.color)}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {nags.map((nag, index) => (
                          <span
                            // biome-ignore lint/suspicious/noArrayIndexKey: labels repeat, index keeps duplicates distinct.
                            key={`${nag}-${index}`}
                            className="rounded bg-brand/15 px-1 text-[9px] leading-4 text-brand"
                          >
                            {nag}
                          </span>
                        ))}
                        {move.comment ? (
                          <span
                            role="img"
                            aria-label="Has comment"
                            title="Has comment"
                            className="size-1.5 rounded-full bg-muted-foreground"
                          />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[15px]">Move detail</CardTitle>
              <CardDescription>
                Comments, NAGs, and variations are read-only in R2.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MoveDetail move={currentMove} />
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
