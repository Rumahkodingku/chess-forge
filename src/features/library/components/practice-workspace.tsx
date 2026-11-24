"use client";

import {
  Brain,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChessgroundBoard,
  type PromotionPiece,
} from "@/features/chess/chessground-board";
import { NotesPanel } from "@/features/library/components/notes-panel";
import { loadLibraryOpenings } from "@/features/library/openings/load";
import {
  type OpeningTree,
  pathToNode,
  primaryName,
} from "@/features/library/openings/tree";
import {
  applyPuzzleSetup,
  isCorrectPuzzleMove,
  type PuzzleSetup,
} from "@/features/library/practice/puzzle";
import {
  initialProgress,
  reviewProgress,
} from "@/features/library/practice/review";
import { loadLibraryPuzzles } from "@/features/library/puzzles/load";
import { lineFen, START_FEN } from "@/features/library/repertoire/model";
import type {
  LearningItemType,
  LibraryPuzzle,
  RepertoireLine,
} from "@/features/library/schemas";
import {
  createLearningProgressRepository,
  createRepertoireRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { toErrorMessage } from "@/lib/errors";

type Mode = "puzzles" | "repertoire" | "recall";
type LoadState = "loading" | "ready" | "error";

interface Feedback {
  correct: boolean;
  message: string;
}

function uciOf(from: string, to: string, promotion?: PromotionPiece): string {
  return `${from}${to}${promotion ?? ""}`;
}

function randomPlyForSide(line: RepertoireLine): number {
  const startTurn = line.startFen.split(" ")[1] === "b" ? "b" : "w";
  const userTurn = line.side === "white" ? "w" : "b";
  const candidates = line.moves
    .map((_, index) => index)
    .filter((index) => {
      const turn =
        startTurn === "w"
          ? index % 2 === 0
            ? "w"
            : "b"
          : index % 2 === 0
            ? "b"
            : "w";
      return turn === userTurn;
    });
  return candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
}

async function saveResult(
  itemType: LearningItemType,
  itemId: string,
  correct: boolean,
): Promise<void> {
  const db = await openChessForgeDatabase();
  const repository = createLearningProgressRepository(db);
  const existing = await repository.get(itemType, itemId);
  const progress = existing ?? initialProgress(itemType, itemId);
  await repository.save(reviewProgress(progress, correct));
}

function PuzzlePanel() {
  const [puzzles, setPuzzles] = useState<LibraryPuzzle[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [index, setIndex] = useState(0);
  const [setup, setSetup] = useState<PuzzleSetup | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [solved, setSolved] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const loaded = await loadLibraryPuzzles();
        if (cancelled) return;
        const filtered = loaded.filter(
          (puzzle) => puzzle.rating >= 600 && puzzle.rating <= 2400,
        );
        const selected = [...filtered].sort(
          (left, right) =>
            right.popularity - left.popularity ||
            left.rating - right.rating ||
            left.id.localeCompare(right.id),
        );
        setPuzzles(selected.slice(0, 10));
        setState("ready");
      } catch (error) {
        if (!cancelled) {
          setState("error");
          toast.error(toErrorMessage(error));
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const puzzle = puzzles[index];
    if (!puzzle) {
      setSetup(null);
      return;
    }
    try {
      setSetup(applyPuzzleSetup(puzzle));
      setFeedback(null);
    } catch {
      setIndex((value) => value + 1);
    }
  }, [index, puzzles]);

  const puzzle = puzzles[index];

  async function answer(from: string, to: string, promotion?: PromotionPiece) {
    if (!puzzle || feedback) return;
    const correct = isCorrectPuzzleMove(puzzle, uciOf(from, to, promotion));
    setFeedback({
      correct,
      message: correct
        ? `Correct. Solution: ${setup?.solution.join(" ") ?? ""}.`
        : `Not this time. The expected move was ${setup?.expectedUci ?? "unavailable"}.`,
    });
    try {
      await saveResult("puzzle", puzzle.id, correct);
      if (correct) setSolved((value) => value + 1);
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-xl border border-border/80 bg-surface-1 text-[12px] text-muted-foreground">
        <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
        Loading puzzles
      </div>
    );
  }

  if (state === "error" || !puzzle || !setup) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-[12px] text-destructive">
        Puzzle data could not load.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="rounded-xl border border-border/80 bg-surface-1 p-3">
        <ChessgroundBoard
          fen={setup.fen}
          orientation={setup.sideToMove === "w" ? "w" : "b"}
          lastMove={setup.lastMove}
          label="Puzzle board"
          onMove={(from, to, promotion) => void answer(from, to, promotion)}
        />
      </div>
      <Card className="border-border/80 bg-surface-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[16px]">
            <Brain aria-hidden className="size-4 text-brand" />
            Find the best move
          </CardTitle>
          <p className="text-[12px] text-muted-foreground">
            Puzzle {index + 1} of {puzzles.length} · rating {puzzle.rating} ·{" "}
            {puzzle.themes.slice(0, 3).join(", ")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{solved} solved</Badge>
            <Badge variant="outline">
              {setup.sideToMove === "w" ? "White to move" : "Black to move"}
            </Badge>
          </div>
          {feedback ? (
            <div
              className={`rounded-lg border p-3 text-[12px] leading-relaxed ${
                feedback.correct
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {feedback.correct ? (
                  <CheckCircle2 aria-hidden className="size-4" />
                ) : (
                  <XCircle aria-hidden className="size-4" />
                )}
                {feedback.correct ? "Correct" : "Not quite"}
              </div>
              <p className="mt-1">{feedback.message}</p>
            </div>
          ) : (
            <p className="rounded-lg border border-border/70 bg-surface-2/60 p-3 text-[12px] leading-relaxed text-muted-foreground">
              Move a piece on the board. The puzzle checks the first move of the
              solution.
            </p>
          )}
          <Button
            type="button"
            className="h-9 px-3"
            onClick={() => setIndex((value) => value + 1)}
            disabled={index >= puzzles.length - 1}
          >
            Next puzzle
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </CardContent>
      </Card>
      <NotesPanel
        targetType="puzzle"
        targetId={puzzle.id}
        targetLabel={`Puzzle ${puzzle.id}`}
      />
    </div>
  );
}

function RepertoirePanel() {
  const [lines, setLines] = useState<RepertoireLine[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [line, setLine] = useState<RepertoireLine | null>(null);
  const [ply, setPly] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const loaded = await createRepertoireRepository(db).list();
        if (cancelled) return;
        setLines(loaded);
        const requested = new URLSearchParams(window.location.search).get(
          "line",
        );
        setSelectedId(
          requested && loaded.some((line) => line.id === requested)
            ? requested
            : (loaded[0]?.id ?? null),
        );
      } catch (error) {
        toast.error(toErrorMessage(error));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setLine(null);
      return;
    }
    const selected = lines.find((item) => item.id === selectedId) ?? null;
    setLine(selected);
    setPly(selected ? randomPlyForSide(selected) : 0);
    setFeedback(null);
  }, [lines, selectedId]);

  const fen = line ? lineFen(START_FEN, line.moves.slice(0, ply)) : START_FEN;
  const expected = line?.moves[ply];

  async function answer(from: string, to: string, promotion?: PromotionPiece) {
    if (!line || !expected || feedback) return;
    const correct = uciOf(from, to, promotion) === expected.uci;
    setFeedback({
      correct,
      message: correct
        ? "Correct repertoire move."
        : `The line plays ${expected.san}.`,
    });
    try {
      await saveResult("repertoire-line", line.id, correct);
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  }

  if (!lines.length) {
    return (
      <div className="rounded-xl border border-border/80 bg-surface-1 p-6 text-[12px] text-muted-foreground">
        Save a repertoire line first.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="rounded-xl border border-border/80 bg-surface-1 p-3">
        <ChessgroundBoard
          fen={fen}
          orientation={line?.side === "white" ? "w" : "b"}
          label="Repertoire review board"
          onMove={(from, to, promotion) => void answer(from, to, promotion)}
        />
      </div>
      <Card className="border-border/80 bg-surface-1">
        <CardHeader>
          <CardTitle className="text-[16px]">Repertoire review</CardTitle>
          <p className="text-[12px] text-muted-foreground">
            Play the next move in the saved line.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <select
            aria-label="Choose repertoire line"
            value={selectedId ?? ""}
            onChange={(event) => setSelectedId(event.target.value)}
            className="h-10 w-full rounded-md border border-border/80 bg-surface-2 px-3 text-[12px] text-foreground"
          >
            {lines.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.side}
              </option>
            ))}
          </select>
          <p className="font-mono text-[11px] text-muted-foreground">
            {line?.moves
              .slice(0, ply)
              .map((move) => move.san)
              .join(" ") || "Start"}
          </p>
          {feedback ? (
            <div
              className={`rounded-lg border p-3 text-[12px] ${
                feedback.correct
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-9 border-border/80 bg-transparent px-3"
            onClick={() => {
              if (!line) return;
              setPly(randomPlyForSide(line));
              setFeedback(null);
            }}
          >
            <RotateCcw aria-hidden className="size-3.5" />
            New position
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RecallPanel() {
  const [tree, setTree] = useState<OpeningTree | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const askNext = useCallback((loaded: OpeningTree) => {
    const named = [...loaded.nodes.values()].filter(
      (node) => node.names.length > 0,
    );
    const target = named[Math.floor(Math.random() * named.length)];
    if (!target) return;
    setNodeId(target.id);
    const names = new Set<string>();
    for (const node of named) {
      for (const name of node.names) names.add(name.name);
    }
    const options = [primaryName(target)?.name ?? "Unknown"];
    for (const name of names) {
      if (options.length >= 4) break;
      if (!options.includes(name)) options.push(name);
    }
    setChoices(options.sort(() => Math.random() - 0.5));
    setFeedback(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLibraryOpenings()
      .then(({ tree: loaded }) => {
        if (cancelled) return;
        setTree(loaded);
        askNext(loaded);
      })
      .catch((error) => toast.error(toErrorMessage(error)));
    return () => {
      cancelled = true;
    };
  }, [askNext]);

  const node = tree && nodeId ? tree.nodes.get(nodeId) : undefined;
  const answer = node ? primaryName(node)?.name : undefined;

  async function choose(name: string) {
    if (!node || !answer || feedback) return;
    const correct = name === answer;
    setFeedback({
      correct,
      message: correct ? "Correct." : `This position is ${answer}.`,
    });
    try {
      await saveResult("opening-recall", node.epd, correct);
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  }

  if (!node) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-xl border border-border/80 bg-surface-1 text-[12px] text-muted-foreground">
        <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
        Preparing opening recall
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="rounded-xl border border-border/80 bg-surface-1 p-3">
        <ChessgroundBoard
          fen={node.fen}
          orientation="w"
          label="Opening recall board"
        />
      </div>
      <Card className="border-border/80 bg-surface-1">
        <CardHeader>
          <CardTitle className="text-[16px]">Which opening is this?</CardTitle>
          <p className="text-[12px] text-muted-foreground">
            {pathToNode(tree ?? { rootId: "start", nodes: new Map() }, node.id)
              .filter((item) => item.move)
              .map((item) => item.move?.san)
              .join(" ")}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {choices.map((name) => (
            <Button
              key={name}
              type="button"
              variant="outline"
              className="h-auto min-h-10 w-full justify-start border-border/80 bg-transparent px-3 text-left text-[12px]"
              onClick={() => void choose(name)}
              disabled={Boolean(feedback)}
            >
              {name}
            </Button>
          ))}
          {feedback ? (
            <>
              <p
                className={`rounded-lg border p-3 text-[12px] ${
                  feedback.correct
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                }`}
              >
                {feedback.message}
              </p>
              <Button
                type="button"
                className="h-9 px-3"
                onClick={() => {
                  if (tree) askNext(tree);
                }}
              >
                Next question
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function PracticeWorkspace() {
  const [mode, setMode] = useState<Mode>("puzzles");
  const modeLabel = useMemo(
    () =>
      mode === "puzzles"
        ? "Puzzles"
        : mode === "repertoire"
          ? "Repertoire"
          : "Opening recall",
    [mode],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-xl border border-border/80 bg-surface-1 p-1">
        {(
          [
            ["puzzles", "Puzzles"],
            ["repertoire", "Repertoire"],
            ["recall", "Opening recall"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-current={mode === value ? "page" : undefined}
            className={`min-h-9 rounded-lg px-3 text-[12px] font-medium ${
              mode === value
                ? "bg-brand/15 text-brand"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-[12px] text-muted-foreground">{modeLabel} session</p>
      {mode === "puzzles" ? <PuzzlePanel /> : null}
      {mode === "repertoire" ? <RepertoirePanel /> : null}
      {mode === "recall" ? <RecallPanel /> : null}
    </div>
  );
}
