"use client";

import { Loader2, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Game } from "@/features/games/types";
import { resolveUserSide } from "@/features/library/games/aliases";
import { DEFAULT_SETTINGS } from "@/features/settings/types";
import {
  createGameRepository,
  createMoveAssessmentRepository,
  createSettingsRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { toErrorMessage } from "@/lib/errors";

interface GameRow {
  game: Game;
  userSide: "w" | "b" | null;
  analyzed: boolean;
}

export function GamesWorkspace() {
  const [rows, setRows] = useState<GameRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [side, setSide] = useState("all");
  const [analyzed, setAnalyzed] = useState("all");
  const [result, setResult] = useState("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const [games, settings] = await Promise.all([
          createGameRepository(db).list(),
          createSettingsRepository(db).get(),
        ]);
        const allAssessments =
          await createMoveAssessmentRepository(db).listAll();
        const analyzedGames = new Set(
          allAssessments.map((assessment) => assessment.gameId),
        );
        const next: GameRow[] = games.map((game) => ({
          game,
          userSide: resolveUserSide(
            game,
            (settings ?? DEFAULT_SETTINGS).playerNames,
          ),
          analyzed: analyzedGames.has(game.id),
        }));
        if (!cancelled) {
          setRows(
            next.sort((left, right) =>
              right.game.updatedAt.localeCompare(left.game.updatedAt),
            ),
          );
          setState("ready");
        }
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
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const { game } = row;
      if (source !== "all" && game.source !== source) {
        return false;
      }
      if (result !== "all" && game.metadata.result !== result) return false;
      if (analyzed !== "all" && String(row.analyzed) !== analyzed) return false;
      if (side !== "all" && row.userSide !== side) return false;
      if (!normalized) return true;
      return [
        game.metadata.white,
        game.metadata.black,
        game.metadata.event,
        game.metadata.opening,
        game.metadata.eco,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized));
    });
  }, [analyzed, query, result, rows, side, source]);

  if (state === "loading") {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-xl border border-border/80 bg-surface-1 text-[12px] text-muted-foreground">
        <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
        Loading games
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-[12px] text-destructive">
        {error ?? "Games could not load."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search player, event, or opening"
          aria-label="Search games"
          className="h-10 pl-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select value={side} onValueChange={setSide}>
          <SelectTrigger aria-label="Filter by side">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any side</SelectItem>
            <SelectItem value="w">White</SelectItem>
            <SelectItem value="b">Black</SelectItem>
          </SelectContent>
        </Select>
        <Select value={analyzed} onValueChange={setAnalyzed}>
          <SelectTrigger aria-label="Filter by analysis">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any analysis</SelectItem>
            <SelectItem value="true">Analyzed</SelectItem>
            <SelectItem value="false">Not analyzed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger aria-label="Filter by source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any source</SelectItem>
            <SelectItem value="pgn-text">Paste</SelectItem>
            <SelectItem value="pgn-file">File</SelectItem>
            <SelectItem value="chesscom">Chess.com</SelectItem>
            <SelectItem value="lichess">Lichess</SelectItem>
          </SelectContent>
        </Select>
        <Select value={result} onValueChange={setResult}>
          <SelectTrigger aria-label="Filter by result">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any result</SelectItem>
            <SelectItem value="1-0">White win</SelectItem>
            <SelectItem value="0-1">Black win</SelectItem>
            <SelectItem value="1/2-1/2">Draw</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length ? (
        <div className="space-y-2">
          {filtered.map(({ game, userSide, analyzed }) => (
            <div
              key={game.id}
              className="flex flex-col gap-3 rounded-xl border border-border/80 bg-surface-1 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {game.metadata.white} vs {game.metadata.black}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {game.metadata.result} · {game.moves.length} ply ·{" "}
                  {game.metadata.event ?? game.metadata.date ?? "Local game"}
                  {game.metadata.opening ? ` · ${game.metadata.opening}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Badge variant="outline">
                  {userSide === "w"
                    ? "White"
                    : userSide === "b"
                      ? "Black"
                      : "Side unknown"}
                </Badge>
                <Badge variant="outline">
                  {analyzed ? "Analyzed" : "Not analyzed"}
                </Badge>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 border-border/80 bg-transparent px-2.5"
                >
                  <Link href={`/analysis/${game.id}`}>Open</Link>
                </Button>
                <Button asChild size="sm" className="h-8 px-2.5">
                  <Link href={`/library/games/${game.id}/insights`}>
                    Insights
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border/80 bg-surface-1 p-6 text-center">
          <UserRound
            aria-hidden
            className="mx-auto size-6 text-muted-foreground"
          />
          <p className="mt-3 text-[14px] font-medium text-foreground">
            No games match this view
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Import a game in Analysis, then return here.
          </p>
          <Button asChild className="mt-4 h-9">
            <Link href="/analysis">Open Analysis</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
