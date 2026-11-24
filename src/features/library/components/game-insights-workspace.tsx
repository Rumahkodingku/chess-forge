"use client";

import { AlertTriangle, Brain, Loader2, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BrowserStockfishEngine,
  type EngineState,
} from "@/features/analysis/engine/stockfish-adapter";
import { findGameOpening } from "@/features/analysis/openings/lookup";
import type {
  MoveAssessment,
  OpeningMatch,
  PositionAnalysis,
} from "@/features/analysis/types";
import {
  ChessgroundBoard,
  type PromotionPiece,
} from "@/features/chess/chessground-board";
import type { Game } from "@/features/games/types";
import { NotesPanel } from "@/features/library/components/notes-panel";
import { resolveUserSide } from "@/features/library/games/aliases";
import {
  buildGameInsights,
  type MistakeCandidate,
} from "@/features/library/games/insights";
import {
  initialProgress,
  reviewProgress,
} from "@/features/library/practice/review";
import { DEFAULT_SETTINGS } from "@/features/settings/types";
import {
  createGameRepository,
  createLearningProgressRepository,
  createMoveAssessmentRepository,
  createSettingsRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { toErrorMessage } from "@/lib/errors";

interface Props {
  gameId: string;
}

export function GameInsightsWorkspace({ gameId }: Props) {
  const [game, setGame] = useState<Game | null>(null);
  const [assessments, setAssessments] = useState<MoveAssessment[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [opening, setOpening] = useState<OpeningMatch | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MistakeCandidate | null>(null);
  const [engineState, setEngineState] = useState<EngineState>("idle");
  const [analysis, setAnalysis] = useState<PositionAnalysis | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const engineRef = useRef<BrowserStockfishEngine | null>(null);
  const runRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const [stored, storedSettings] = await Promise.all([
          createGameRepository(db).getById(gameId),
          createSettingsRepository(db).get(),
        ]);
        if (cancelled) return;
        if (!stored) {
          setError("Game not found.");
          setState("error");
          return;
        }
        const assessments =
          await createMoveAssessmentRepository(db).listByGame(gameId);
        if (cancelled) return;
        setGame(stored);
        setAssessments(assessments);
        setSettings(storedSettings ?? DEFAULT_SETTINGS);
        const match = await findGameOpening(stored);
        if (cancelled) return;
        setOpening(match);
        setState("ready");
      } catch (loadError) {
        if (!cancelled) {
          setError(toErrorMessage(loadError));
          setState("error");
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
      engineRef.current?.quit();
      engineRef.current = null;
    };
  }, []);

  const insights = useMemo(() => {
    if (!game) return null;
    const userSide = resolveUserSide(game, settings.playerNames);
    return buildGameInsights({
      game,
      assessments,
      opening,
      userSide,
    });
  }, [assessments, game, opening, settings.playerNames]);

  async function selectMistake(mistake: MistakeCandidate) {
    setSelected(mistake);
    setAnalysis(null);
    setFeedback(null);
    setEngineState("loading");
    const runId = ++runRef.current;
    engineRef.current?.quit();
    const engine = new BrowserStockfishEngine();
    engineRef.current = engine;
    try {
      await engine.load();
      if (runRef.current !== runId) return;
      setEngineState("analysing");
      const result = await engine.analyse({
        fen: mistake.fenBefore,
        depth: settings.enginePreferences.depth ?? 14,
        multiPv: 1,
        configuration: settings.enginePreferences,
      });
      if (runRef.current !== runId) return;
      setAnalysis(result);
      setEngineState("ready");
    } catch (engineError) {
      if (runRef.current !== runId) return;
      setEngineState("error");
      setFeedback(toErrorMessage(engineError));
    }
  }

  async function play(from: string, to: string, promotion?: PromotionPiece) {
    if (!analysis || !selected) return;
    const uci = `${from}${to}${promotion ?? ""}`;
    const best = analysis.bestMoveUci ?? "";
    setFeedback(
      uci === best
        ? "Correct. That matches the engine's first choice."
        : `The engine prefers ${best}. Your move was ${uci}.`,
    );
    try {
      const db = await openChessForgeDatabase();
      const repository = createLearningProgressRepository(db);
      const itemId = `${selected.gameId}:${selected.ply}`;
      const existing = await repository.get("game-mistake", itemId);
      await repository.save(
        reviewProgress(
          existing ?? initialProgress("game-mistake", itemId),
          uci === best,
        ),
      );
    } catch {
      // Progress is best-effort; the drill feedback remains usable.
    }
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-xl border border-border/80 bg-surface-1 text-[12px] text-muted-foreground">
        <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
        Loading insights
      </div>
    );
  }

  if (state === "error" || !game || !insights) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-[12px] text-destructive">
        {error ?? "Insights could not load."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-medium text-foreground">
            {game.metadata.white} vs {game.metadata.black}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {game.metadata.result} · {game.moves.length} ply ·{" "}
            {insights.analyzedGames ? "analysed" : "not analysed"}
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="h-9 border-border/80 bg-transparent px-3"
        >
          <Link href={`/analysis/${game.id}`}>Open Analysis</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/80 bg-surface-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-[12px] text-muted-foreground">
              Classification
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[24px] font-semibold text-foreground">
            {insights.classificationCounts.blunder +
              insights.classificationCounts.mistake}
            <span className="ml-2 text-[11px] font-normal text-muted-foreground">
              mistakes + blunders
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-surface-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-[12px] text-muted-foreground">
              Known side
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[24px] font-semibold text-foreground">
            {insights.gamesWithKnownSide ? "Yes" : "Unknown"}
            <span className="ml-2 text-[11px] font-normal text-muted-foreground">
              {insights.gamesWithKnownSide
                ? "personal stats enabled"
                : "add your name in Settings"}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-surface-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-[12px] text-muted-foreground">
              Practice positions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[24px] font-semibold text-foreground">
            {insights.mistakes.length}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="space-y-3">
          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[14px]">Opening performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.openingInsights.length ? (
                insights.openingInsights.map((opening) => (
                  <div
                    key={`${opening.eco}-${opening.name}`}
                    className="rounded-lg border border-border/70 bg-surface-2/60 px-3 py-2 text-[12px]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-foreground">
                        {opening.name} ({opening.eco})
                      </span>
                      <span className="text-muted-foreground">
                        {opening.wins}W {opening.draws}D {opening.losses}L
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {opening.mistakes} mistakes · {opening.blunders} blunders
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  No opening match was found for this game.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[14px]">
                <Target aria-hidden className="size-4 text-brand" />
                Phase performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.phaseInsights.length ? (
                insights.phaseInsights.map((phase) => (
                  <div
                    key={phase.phase}
                    className="flex items-center justify-between rounded-lg border border-border/70 bg-surface-2/60 px-3 py-2 text-[12px]"
                  >
                    <span className="capitalize text-foreground">
                      {phase.phase}
                    </span>
                    <span className="text-muted-foreground">
                      {phase.moves} moves · {phase.mistakes} mistakes ·{" "}
                      {phase.blunders} blunders
                      {phase.averageCentipawnLoss !== null
                        ? ` · ${phase.averageCentipawnLoss} avg CPL`
                        : ""}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  Analyse the game to see phase performance.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[14px]">
                <Brain aria-hidden className="size-4 text-brand" />
                Mistake trainer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.mistakes.length ? (
                insights.mistakes.map((mistake) => (
                  <button
                    key={`${mistake.gameId}:${mistake.ply}`}
                    type="button"
                    onClick={() => void selectMistake(mistake)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-[12px] transition-colors ${
                      selected?.ply === mistake.ply
                        ? "border-brand/40 bg-brand/10"
                        : "border-border/70 bg-surface-2/60 hover:border-border-strong"
                    }`}
                  >
                    <span className="font-mono text-foreground">
                      {Math.ceil(mistake.ply / 2)}. {mistake.san}
                    </span>
                    <span className="text-muted-foreground">
                      {mistake.classification}
                      {mistake.centipawnLoss !== undefined
                        ? ` · ${mistake.centipawnLoss} cp`
                        : ""}
                    </span>
                  </button>
                ))
              ) : (
                <p className="rounded-lg border border-border/70 bg-surface-2/60 p-3 text-[12px] text-muted-foreground">
                  {insights.gamesWithKnownSide
                    ? "No mistake positions were stored for this game."
                    : "Set your player name in Settings to enable side-specific mistake drills."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-3">
          {selected ? (
            <div className="rounded-xl border border-border/80 bg-surface-1 p-3">
              <ChessgroundBoard
                fen={selected.fenBefore}
                orientation={selected.userSide === "w" ? "w" : "b"}
                label="Mistake practice board"
                onMove={(from, to, promotion) => void play(from, to, promotion)}
              />
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <AlertTriangle aria-hidden className="size-3.5" />
                  Engine: {engineState}
                  {analysis?.bestMoveUci
                    ? ` · best ${analysis.bestMoveUci}`
                    : ""}
                </div>
                {feedback ? (
                  <p className="rounded-lg border border-border/70 bg-surface-2/60 p-3 text-[12px] leading-relaxed text-foreground">
                    {feedback}
                  </p>
                ) : (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Find a better move for the side that played the mistake.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border/80 bg-surface-1 p-4 text-[12px] leading-relaxed text-muted-foreground">
              Select a mistake to open the position. The engine runs locally
              only when you start a drill.
            </div>
          )}
          <NotesPanel
            targetType="game"
            targetId={game.id}
            targetLabel={`${game.metadata.white} vs ${game.metadata.black}`}
          />
          <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
            <p className="text-[11px] font-medium text-muted-foreground">
              Caveats
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {insights.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
