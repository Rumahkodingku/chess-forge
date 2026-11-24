"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
import { mergeAssessments } from "@/features/analysis/assessment-set";
import { ClassificationBadge } from "@/features/analysis/components/classification-badge";
import { EnginePanel } from "@/features/analysis/components/engine-panel";
import { EvaluationBar } from "@/features/analysis/components/evaluation-bar";
import { GameAnalysisPanel } from "@/features/analysis/components/game-analysis-panel";
import { GameSummaryPanel } from "@/features/analysis/components/game-summary-panel";
import { MoveDetail } from "@/features/analysis/components/move-detail";
import {
  BrowserStockfishEngine,
  DEFAULT_ENGINE_VERSION,
  type EngineProgress,
  type EngineState,
} from "@/features/analysis/engine/stockfish-adapter";
import { analysisCacheKey } from "@/features/analysis/engine/uci";
import {
  buildOpeningIndex,
  findOpeningForGame,
  loadOpeningEntries,
  type OpeningIndex,
} from "@/features/analysis/openings/lookup";
import { applyPv } from "@/features/analysis/pv";
import {
  deriveAssessmentsFromCache,
  type GameAnalysisProgress,
  runGameAnalysis,
} from "@/features/analysis/queue";
import { buildGameSummary } from "@/features/analysis/summary";
import type {
  AnalysisPerspective,
  BrilliantDecision,
  MoveAssessment,
  PositionAnalysis,
} from "@/features/analysis/types";
import { displayMoveClassification } from "@/features/analysis/types";
import { capturedPieces } from "@/features/chess/captured";
import { CapturedPieces } from "@/features/chess/captured-pieces";
import { ChessgroundBoard } from "@/features/chess/chessground-board";
import { nagLabels } from "@/features/chess/nags";
import {
  type AnalysisBoardTheme,
  boardThemeFromSetting,
} from "@/features/chess/theme";
import type { Game, Move } from "@/features/games/types";
import { NotesPanel } from "@/features/library/components/notes-panel";
import { resolveUserSide } from "@/features/library/games/aliases";
import {
  type ApplicationSettings,
  DEFAULT_SETTINGS,
} from "@/features/settings/types";
import {
  createGameRepository,
  createMoveAssessmentRepository,
  createPositionAnalysisRepository,
  createProjectRepository,
  createRepertoireRepository,
  createSettingsRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { CreateProjectDialog } from "@/features/studio/components/create-project-dialog";
import { createWalkingSkeletonProject } from "@/features/studio/project-factory";
import { toErrorMessage } from "@/lib/errors";
import { isUuid } from "@/lib/validation";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type LoadState = "loading" | "ready" | "invalid" | "missing" | "error";

function moveLabel(move: Move) {
  return `${move.fullMoveNumber}${move.color === "w" ? "." : "..."} ${move.san}`;
}

function sideToMoveFromFen(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

interface PvState {
  variation: number;
  step: number;
}

export default function AnalysisGamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = Array.isArray(params.gameId)
    ? params.gameId[0]
    : params.gameId;
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [settings, setSettings] =
    useState<ApplicationSettings>(DEFAULT_SETTINGS);
  const [assessments, setAssessments] = useState<MoveAssessment[]>([]);
  const [opening, setOpening] =
    useState<ReturnType<typeof buildGameSummary>["opening"]>(null);
  const [openingIndex, setOpeningIndex] = useState<OpeningIndex | undefined>();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPly, setSelectedPly] = useState(0);
  const [orientation, setOrientation] = useState<"w" | "b">("w");
  const [boardTheme, setBoardTheme] = useState<AnalysisBoardTheme>("forge");
  const [perspective, setPerspective] = useState<AnalysisPerspective>("white");
  const [positionAnalysis, setPositionAnalysis] =
    useState<PositionAnalysis | null>(null);
  const [positionCached, setPositionCached] = useState(false);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [engineState, setEngineState] = useState<EngineState>("idle");
  const [engineProgress, setEngineProgress] = useState<EngineProgress | null>(
    null,
  );
  const [pv, setPv] = useState<PvState | null>(null);
  const [progress, setProgress] = useState<GameAnalysisProgress | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingOpening, setSavingOpening] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const engineRef = useRef<BrowserStockfishEngine | null>(null);
  const unsubscribeStateRef = useRef<(() => void) | null>(null);
  const unsubscribeProgressRef = useRef<(() => void) | null>(null);
  const requestIdRef = useRef(0);
  const pauseRef = useRef(false);
  const cancelRef = useRef(false);
  const queueRunningRef = useRef(false);
  const lastProgressAtRef = useRef(0);

  useEffect(() => {
    if (!isUuid(gameId)) {
      setLoadState("invalid");
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const [stored, storedSettings] = await Promise.all([
          createGameRepository(db).getById(gameId),
          createSettingsRepository(db).get(),
        ]);
        if (cancelled) return;
        const loadedSettings = storedSettings ?? DEFAULT_SETTINGS;
        setSettings(loadedSettings);
        setPerspective(loadedSettings.evaluationPerspective);
        setBoardTheme(boardThemeFromSetting(loadedSettings.boardTheme));
        if (!stored) {
          setLoadState("missing");
          return;
        }
        setGame(stored);
        const storedAssessments = await createMoveAssessmentRepository(
          db,
        ).listByGame(stored.id);
        let nextAssessments = storedAssessments;
        if (!nextAssessments.length) {
          const derived = await deriveAssessmentsFromCache({
            game: stored,
            cache: createPositionAnalysisRepository(db),
            configuration: {
              ...loadedSettings.enginePreferences,
              depth: loadedSettings.enginePreferences.depth ?? 14,
              movetimeMs: undefined,
              multiPv: 1,
            },
            engineVersion: DEFAULT_ENGINE_VERSION,
          });
          nextAssessments = derived.assessments;
        }
        setAssessments(nextAssessments);
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
    if (!game) return;
    const currentGame = game;
    let cancelled = false;
    async function loadOpenings() {
      try {
        const entries = await loadOpeningEntries();
        if (cancelled) return;
        setOpeningIndex(buildOpeningIndex(entries));
        setOpening(findOpeningForGame(entries, currentGame));
      } catch {
        if (!cancelled) setOpening(null);
      }
    }
    void loadOpenings();
    return () => {
      cancelled = true;
    };
  }, [game]);

  useEffect(() => {
    return () => {
      unsubscribeStateRef.current?.();
      unsubscribeProgressRef.current?.();
      engineRef.current?.quit();
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedPly is the trigger for clearing stale position state.
  useEffect(() => {
    requestIdRef.current += 1;
    if (!queueRunningRef.current) {
      engineRef.current?.stop();
    }
    setPositionAnalysis(null);
    setPositionCached(false);
    setPositionError(null);
    setPv(null);
  }, [selectedPly]);

  const currentMove =
    game && selectedPly > 0 ? game.moves[selectedPly - 1] : undefined;
  const currentAssessment = assessments.find(
    (assessment) => assessment.ply === selectedPly,
  );
  const boardFen = game
    ? selectedPly === 0
      ? game.initialFen
      : (currentMove?.fenAfter ?? game.initialFen)
    : START_FEN;
  const analysedFen = game
    ? selectedPly === 0
      ? game.initialFen
      : (currentMove?.fenBefore ?? game.initialFen)
    : START_FEN;
  const captured = useMemo(
    () =>
      game ? capturedPieces(game, selectedPly) : { byWhite: [], byBlack: [] },
    [game, selectedPly],
  );
  const summary = useMemo(
    () => (game ? buildGameSummary({ game, assessments, opening }) : null),
    [game, assessments, opening],
  );
  const analysedMoves = assessments.length;
  const queueState = progress?.state ?? "idle";

  useEffect(() => {
    if (!game) return;
    const reference = assessments[0];
    const fen =
      selectedPly === 0
        ? game.initialFen
        : game.moves[selectedPly - 1]?.fenBefore;
    if (!fen) return;

    const engineVersion = reference?.engineVersion ?? DEFAULT_ENGINE_VERSION;
    const keys = new Set<string>();
    if (reference) {
      const configuration = reference.engineConfiguration;
      keys.add(
        analysisCacheKey({
          fen,
          engineVersion,
          depth: configuration.depth,
          movetimeMs: configuration.movetimeMs,
          multiPv: configuration.multiPv,
          threads: configuration.threads,
          hashMb: configuration.hashMb,
        }),
      );
    }
    const current = settings.enginePreferences;
    keys.add(
      analysisCacheKey({
        fen,
        engineVersion,
        depth: current.movetimeMs ? undefined : (current.depth ?? 14),
        movetimeMs: current.movetimeMs,
        multiPv: current.multiPv,
        threads: current.threads,
        hashMb: current.hashMb,
      }),
    );

    let cancelled = false;
    async function loadCached() {
      try {
        const db = await openChessForgeDatabase();
        const repository = createPositionAnalysisRepository(db);
        const results = await Promise.all(
          [...keys].map((key) => repository.get(key)),
        );
        if (cancelled) return;
        const analysis = results.find(Boolean);
        if (analysis) {
          setPositionAnalysis(analysis);
          setPositionCached(true);
        }
      } catch {
        // A corrupt cache entry is ignored; the user can analyse again.
      }
    }
    void loadCached();
    return () => {
      cancelled = true;
    };
  }, [assessments, game, selectedPly, settings.enginePreferences]);

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

  function getEngine(): BrowserStockfishEngine {
    if (!engineRef.current) {
      const engine = new BrowserStockfishEngine();
      engineRef.current = engine;
      unsubscribeStateRef.current = engine.onStateChange(setEngineState);
      unsubscribeProgressRef.current = engine.onProgress((next) => {
        const now = Date.now();
        if (
          now - lastProgressAtRef.current > 150 ||
          next.state !== "analysing"
        ) {
          lastProgressAtRef.current = now;
          setEngineProgress(next);
        }
      });
    }
    return engineRef.current;
  }

  async function analysePosition(options: { force?: boolean } = {}) {
    if (!game) return;
    setPositionError(null);
    setPositionCached(false);
    const requestId = ++requestIdRef.current;
    try {
      const engine = getEngine();
      await engine.load();
      const configuration = {
        ...settings.enginePreferences,
        depth: settings.enginePreferences.movetimeMs
          ? undefined
          : (settings.enginePreferences.depth ?? 14),
      };
      const db = await openChessForgeDatabase();
      const repository = createPositionAnalysisRepository(db);
      const key = analysisCacheKey({
        fen: analysedFen,
        engineVersion: engine.getVersion(),
        depth: configuration.depth,
        movetimeMs: configuration.movetimeMs,
        multiPv: configuration.multiPv,
        threads: configuration.threads,
        hashMb: configuration.hashMb,
      });
      if (!options.force) {
        const cached = await repository.get(key);
        if (requestId !== requestIdRef.current) return;
        if (cached) {
          setPositionAnalysis(cached);
          setPositionCached(true);
          return;
        }
      }
      const result = await engine.analyse({
        fen: analysedFen,
        depth: configuration.depth,
        movetimeMs: configuration.movetimeMs,
        multiPv: configuration.multiPv,
        configuration,
      });
      if (requestId !== requestIdRef.current) return;
      setPositionAnalysis(result);
      if (!result.partial) {
        await repository.save(result);
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setPositionError(toErrorMessage(error));
      }
    }
  }

  function stopPositionAnalysis() {
    engineRef.current?.stop();
  }

  function restartPositionAnalysis() {
    void analysePosition({ force: true });
  }

  async function ensureOpeningIndex(): Promise<OpeningIndex | undefined> {
    if (openingIndex) return openingIndex;
    try {
      const entries = await loadOpeningEntries();
      const index = buildOpeningIndex(entries);
      setOpeningIndex(index);
      return index;
    } catch {
      return undefined;
    }
  }

  async function startGameAnalysis() {
    if (!game || queueRunningRef.current) return;
    if (
      engineState === "loading" ||
      engineState === "analysing" ||
      engineState === "stopping"
    ) {
      return;
    }
    pauseRef.current = false;
    cancelRef.current = false;
    queueRunningRef.current = true;
    setGameError(null);
    setProgress({
      state: "running",
      completed: 0,
      total: game.moves.length + 1,
      skipped: 0,
      elapsedMs: 0,
    });
    try {
      const engine = getEngine();
      await engine.load();
      const db = await openChessForgeDatabase();
      const index = await ensureOpeningIndex();
      const decisions = new Map<number, BrilliantDecision>();
      for (const assessment of assessments) {
        if (assessment.brilliantDecision) {
          decisions.set(assessment.ply, assessment.brilliantDecision);
        }
      }
      const result = await runGameAnalysis({
        game,
        engine,
        cache: createPositionAnalysisRepository(db),
        configuration: {
          ...settings.enginePreferences,
          depth: settings.enginePreferences.depth ?? 14,
          movetimeMs: undefined,
          multiPv: 1,
        },
        openingIndex: index,
        existingDecisions: decisions,
        onProgress: setProgress,
        shouldPause: () => pauseRef.current,
        shouldCancel: () => cancelRef.current,
      });
      const nextAssessments =
        result.status === "completed"
          ? result.assessments
          : mergeAssessments(assessments, result.assessments);
      setAssessments(nextAssessments);
      await createMoveAssessmentRepository(db).replaceForGame(
        game.id,
        nextAssessments,
      );
      setProgress(result.progress);
      if (result.status === "error") {
        setGameError(result.error ?? "Analysis failed.");
      }
    } catch (error) {
      setGameError(toErrorMessage(error));
      setProgress((current) =>
        current
          ? { ...current, state: "error", error: toErrorMessage(error) }
          : null,
      );
    } finally {
      queueRunningRef.current = false;
      pauseRef.current = false;
      cancelRef.current = false;
    }
  }

  function pauseGameAnalysis() {
    pauseRef.current = true;
  }

  function resumeGameAnalysis() {
    void startGameAnalysis();
  }

  function cancelGameAnalysis() {
    cancelRef.current = true;
    engineRef.current?.stop();
  }

  async function decideBrilliant(decision: BrilliantDecision) {
    if (!game || !currentAssessment) return;
    setDecisionBusy(true);
    const updated = assessments.map((assessment) =>
      assessment.ply === currentAssessment.ply
        ? { ...assessment, brilliantDecision: decision }
        : assessment,
    );
    setAssessments(updated);
    try {
      const db = await openChessForgeDatabase();
      await createMoveAssessmentRepository(db).replaceForGame(game.id, updated);
    } catch (error) {
      setGameError(toErrorMessage(error));
    } finally {
      setDecisionBusy(false);
    }
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

  async function saveOpeningToRepertoire() {
    const opening = summary?.opening;
    if (!game || !opening) return;
    const moves = game.moves
      .slice(0, opening.ply)
      .map((move) => ({ san: move.san, uci: move.uci }));
    if (!moves.length) return;
    setSavingOpening(true);
    try {
      const db = await openChessForgeDatabase();
      const repository = createRepertoireRepository(db);
      const lineKey = moves.map((move) => move.uci).join(" ");
      const existing = await repository.list();
      if (
        existing.some(
          (line) => line.moves.map((move) => move.uci).join(" ") === lineKey,
        )
      ) {
        toast.message("That opening is already in your repertoire.");
        return;
      }
      const now = new Date().toISOString();
      const side = resolveUserSide(game, settings.playerNames);
      if (!side) {
        toast.error(
          "Set your player name in Settings before saving this opening.",
        );
        return;
      }
      await repository.save({
        id: crypto.randomUUID(),
        name: opening.name,
        side: side === "w" ? "white" : "black",
        eco: opening.eco,
        openingName: opening.name,
        startFen: game.initialFen,
        moves,
        notes: "",
        priority: "core",
        tags: [],
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1,
      });
      toast.success("Opening saved to your repertoire.");
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setSavingOpening(false);
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

  if (loadState === "error" || !game || !summary) {
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
  const queueRunning = queueState === "running";
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
      : `Before ${moveLabel(currentMove ?? game.moves[0])}`;
  const selectedVariation =
    pv && positionAnalysis
      ? positionAnalysis.principalVariations.find(
          (variation) => variation.multipv === pv.variation,
        )
      : undefined;
  const pvPosition =
    pv && positionAnalysis && selectedVariation
      ? applyPv(positionAnalysis.fen, selectedVariation.pv, pv.step)
      : null;
  const displayedFen = pvPosition?.fen ?? boardFen;
  const displayedLastMove = pvPosition ? undefined : currentMove?.uci;
  const displayedLabel = pvPosition
    ? `PV ${pv?.variation ?? 1}, step ${pv?.step ?? 0}`
    : `Position: ${positionLabel}`;
  const analysisEvaluation =
    positionAnalysis && positionAnalysis.fen === analysedFen
      ? positionAnalysis.score
      : currentAssessment?.evaluationBefore;
  const sideToMove = sideToMoveFromFen(analysedFen);
  const currentPhase = summary.phases.find(
    (phase) => selectedPly >= phase.startPly && selectedPly <= phase.endPly,
  );
  const gameMoveCount = game.moves.length;

  function jumpTo(ply: number) {
    setSelectedPly(Math.min(Math.max(0, ply), gameMoveCount));
    document.getElementById("analysis-board")?.scrollIntoView({
      block: "start",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${game.metadata.white} vs ${game.metadata.black}`}
        description={`${game.metadata.result} · ${game.moves.length} ply. Replay, analyse, and inspect the move evidence.`}
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.85fr)]">
        <div className="space-y-5">
          <Card id="analysis-board" className="border-border/80 bg-surface-1">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-[15px]">Replay</CardTitle>
                  <CardDescription>
                    {positionLabel}
                    {currentPhase ? ` · ${currentPhase.phase}` : ""}
                    {summary.opening
                      ? ` · ${summary.opening.name} (${summary.opening.eco})`
                      : " · Unknown opening"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-9 border-border/80 bg-transparent px-3"
                  >
                    <Link
                      href={`/library/openings?fen=${encodeURIComponent(displayedFen)}`}
                    >
                      <BookOpen aria-hidden className="size-3.5" />
                      Library
                    </Link>
                  </Button>
                  {summary.opening && summary.opening.ply > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 border-border/80 bg-transparent px-3"
                      disabled={savingOpening}
                      onClick={() => void saveOpeningToRepertoire()}
                    >
                      Add opening
                    </Button>
                  ) : null}
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="mx-auto w-full max-w-[620px]">
                <PlayerRow
                  name={topPlayer}
                  elo={topElo}
                  captured={topCaptured}
                  capturedColor={topCapturedColor}
                  playerColor={orientation === "w" ? "b" : "w"}
                />
                <div className="mt-2 flex items-stretch gap-2">
                  {analysisEvaluation ? (
                    <EvaluationBar
                      evaluation={analysisEvaluation}
                      sideToMove={sideToMove}
                      perspective={perspective}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1 rounded-xl border border-border/80 bg-surface-2 p-2 board-shadow">
                    <ChessgroundBoard
                      fen={displayedFen}
                      orientation={orientation}
                      lastMove={displayedLastMove}
                      theme={boardTheme}
                      label={displayedLabel}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <PlayerRow
                    name={bottomPlayer}
                    elo={bottomElo}
                    captured={bottomCaptured}
                    capturedColor={bottomCapturedColor}
                    playerColor={orientation === "w" ? "w" : "b"}
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-border/80 bg-transparent"
                  onClick={() => jumpTo(0)}
                  disabled={selectedPly === 0}
                  aria-label="First move"
                >
                  <ChevronFirst aria-hidden className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-border/80 bg-transparent"
                  onClick={() => jumpTo(selectedPly - 1)}
                  disabled={selectedPly === 0}
                  aria-label="Previous move"
                >
                  <ChevronLeft aria-hidden className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-border/80 bg-transparent"
                  onClick={() => jumpTo(selectedPly + 1)}
                  disabled={selectedPly === game.moves.length}
                  aria-label="Next move"
                >
                  <ChevronRight aria-hidden className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-border/80 bg-transparent"
                  onClick={() => jumpTo(game.moves.length)}
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
                Direct selection updates the board and move detail.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[420px] grid grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => jumpTo(0)}
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
                  const assessment = assessments.find(
                    (item) => item.ply === move.ply,
                  );
                  const nags = nagLabels(move.nags);
                  const display = assessment
                    ? displayMoveClassification(assessment)
                    : undefined;
                  return (
                    <button
                      key={move.ply}
                      type="button"
                      onClick={() => jumpTo(move.ply)}
                      aria-current={
                        selectedPly === move.ply ? "true" : undefined
                      }
                      className={`flex min-h-9 items-center justify-between gap-1 rounded-md border px-2.5 py-1 text-left font-mono text-[11px] transition-colors ${
                        selectedPly === move.ply
                          ? "border-brand/40 bg-brand/10 text-foreground"
                          : "border-border/70 bg-surface-2/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">
                          {moveLabel(move)}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1">
                          {display ? (
                            <ClassificationBadge
                              classification={display}
                              compact
                            />
                          ) : null}
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
                              className="size-1.5 rounded-full bg-muted-foreground"
                            />
                          ) : null}
                        </span>
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
                Engine evidence, threats, comments, and variations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MoveDetail
                move={currentMove}
                assessment={currentAssessment}
                sideToMove={currentMove?.color ?? "w"}
                perspective={perspective}
                decisionBusy={decisionBusy}
                onDecision={
                  currentAssessment?.candidateBrilliant
                    ? (decision) => void decideBrilliant(decision)
                    : undefined
                }
              />
            </CardContent>
          </Card>

          {currentMove ? (
            <NotesPanel
              targetType="move"
              targetId={`${game.id}:${currentMove.ply}`}
              targetLabel={moveLabel(currentMove)}
            />
          ) : null}

          <GameSummaryPanel
            summary={summary}
            analysed={analysedMoves > 0}
            onJump={jumpTo}
          />
        </div>

        <div className="space-y-5">
          <EnginePanel
            state={engineState}
            analysis={positionAnalysis}
            progress={engineProgress}
            cached={positionCached}
            busy={engineBusy}
            error={positionError}
            perspective={perspective}
            positionLabel={positionLabel}
            sideToMove={sideToMove}
            onPerspectiveChange={setPerspective}
            onAnalyse={() => void analysePosition()}
            onStop={stopPositionAnalysis}
            onRestart={restartPositionAnalysis}
            stopDisabled={queueRunning}
            pvVariation={pv?.variation ?? null}
            pvStep={pv?.step ?? 0}
            onPvSelect={(variation) => setPv({ variation, step: 1 })}
            onPvStep={(step) =>
              setPv((current) => (current ? { ...current, step } : null))
            }
            onPvExit={() => setPv(null)}
          />

          <GameAnalysisPanel
            progress={progress}
            analysedMoves={analysedMoves}
            moveCount={game.moves.length}
            error={gameError}
            busy={engineBusy}
            onStart={() => void startGameAnalysis()}
            onPause={pauseGameAnalysis}
            onResume={resumeGameAnalysis}
            onCancel={cancelGameAnalysis}
            onRetry={() => void startGameAnalysis()}
          />

          {queueState === "running" ? (
            <p className="text-[10px] text-muted-foreground" aria-live="polite">
              Current engine depth: {engineProgress?.depth ?? "waiting"}.
            </p>
          ) : null}

          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[15px]">Create a video</CardTitle>
              <CardDescription>
                Build a templated sequence from the full game or selected
                moments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="h-10 px-4"
              >
                <Clapperboard aria-hidden className="size-4" />
                Create video
              </Button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Opens the template and source picker. The project saves before
                the studio opens.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[15px]">
                Quick 3-second scene
              </CardTitle>
              <CardDescription>
                One move, three seconds, 9:16, with the move sound.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                variant="outline"
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

      {game ? (
        <CreateProjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          game={game}
          summary={summary}
          onCreated={(project) => router.push(`/studio/${project.id}`)}
        />
      ) : null}
    </div>
  );
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
  captured: Parameters<typeof CapturedPieces>[0]["pieces"];
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
