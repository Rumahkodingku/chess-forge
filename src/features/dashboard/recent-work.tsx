"use client";

import {
  ArrowUpRight,
  Clapperboard,
  FileText,
  Globe2,
  ScanSearch,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  latestByUpdatedAt,
  recentByUpdatedAt,
} from "@/features/dashboard/latest";
import type { Game } from "@/features/games/types";
import {
  createGameRepository,
  createProjectRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import type { VideoProject } from "@/features/studio/scene/scene.types";
import { toErrorMessage } from "@/lib/errors";

const RECENT_GAME_LIMIT = 5;

const SOURCE_LABELS: Record<Game["source"], string> = {
  "pgn-text": "Paste",
  "pgn-file": "File",
  chesscom: "Chess.com",
  lichess: "Lichess",
};

const IMPORT_LINKS = [
  { href: "/analysis?source=paste", label: "Paste PGN", Icon: FileText },
  { href: "/analysis?source=file", label: "Upload file", Icon: Upload },
  { href: "/analysis?source=chesscom", label: "Chess.com", Icon: Globe2 },
  { href: "/analysis?source=lichess", label: "Lichess", Icon: Globe2 },
];

interface RecentWorkState {
  games: Game[];
  project?: VideoProject;
  loading: boolean;
  error?: string;
}

export function RecentWork() {
  const [state, setState] = useState<RecentWorkState>({
    games: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const [games, projects] = await Promise.all([
          createGameRepository(db).list(),
          createProjectRepository(db).list(),
        ]);
        if (cancelled) return;
        setState({
          games: recentByUpdatedAt(games, RECENT_GAME_LIMIT),
          project: latestByUpdatedAt(projects),
          loading: false,
        });
      } catch (error) {
        if (!cancelled) {
          setState({ games: [], loading: false, error: toErrorMessage(error) });
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-24 w-full" />
        </div>
        <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-24 w-full" />
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <EmptyState
        title="Local work could not load"
        description={state.error}
        action={
          <Button asChild className="h-9">
            <Link href="/analysis">Open analysis</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-medium text-foreground">
              Recent games
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              The five latest imports in this local workspace.
            </p>
          </div>
          <ScanSearch aria-hidden className="size-4 text-muted-foreground" />
        </div>

        {state.games.length ? (
          <ul className="space-y-1.5">
            {state.games.map((game) => (
              <li key={game.id}>
                <Link
                  href={`/analysis/${game.id}`}
                  className="group flex min-h-12 items-center justify-between gap-3 rounded-lg border border-border/80 bg-surface-2 px-3 py-2 transition-colors hover:border-border-strong hover:bg-surface-2/80"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium text-foreground">
                      {game.metadata.white} vs {game.metadata.black}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                      {game.metadata.result} · {game.moves.length} ply ·{" "}
                      {game.metadata.event ??
                        game.metadata.date ??
                        "Unknown event"}{" "}
                      · {SOURCE_LABELS[game.source]}
                    </span>
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No games imported yet"
            description="Paste a PGN, upload a file, or fetch a public game."
            action={
              <Button asChild variant="outline" size="sm" className="h-9">
                <Link href="/analysis">Import a game</Link>
              </Button>
            }
          />
        )}

        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="text-[11px] text-muted-foreground">Import from</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {IMPORT_LINKS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-9 items-center gap-1.5 rounded-md border border-border/70 bg-surface-2/60 px-2.5 text-[11px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              >
                <Icon aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-medium text-foreground">
              Recent project
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              The latest scene saved from a selected move.
            </p>
          </div>
          <Clapperboard aria-hidden className="size-4 text-muted-foreground" />
        </div>
        {state.project ? (
          <div className="rounded-lg border border-border/80 bg-surface-2 p-4">
            <p className="text-[14px] font-medium text-foreground">
              {state.project.name}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {state.project.canvas.aspectRatio} · {state.project.scenes.length}{" "}
              scene
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-4 h-9 border-border/80 bg-transparent px-3"
            >
              <Link href={`/studio/${state.project.id}`}>
                Open project
                <ArrowUpRight aria-hidden className="size-3.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <EmptyState
            title="No video projects yet"
            description="Create a scene from a selected move. The saved project appears here."
            action={
              <Button asChild variant="outline" size="sm" className="h-9">
                <Link href="/studio">Open studio</Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
