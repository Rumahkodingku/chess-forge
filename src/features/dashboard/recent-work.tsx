"use client";

import { ArrowUpRight, Clapperboard, ScanSearch } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { latestByUpdatedAt } from "@/features/dashboard/latest";
import type { Game } from "@/features/games/types";
import {
  createGameRepository,
  createProjectRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import type { VideoProject } from "@/features/studio/scene/scene.types";
import { toErrorMessage } from "@/lib/errors";

interface RecentWorkState {
  game?: Game;
  project?: VideoProject;
  loading: boolean;
  error?: string;
}

export function RecentWork() {
  const [state, setState] = useState<RecentWorkState>({ loading: true });

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
        const game = latestByUpdatedAt(games);
        const project = latestByUpdatedAt(projects);
        setState({ game, project, loading: false });
      } catch (error) {
        if (!cancelled) {
          setState({ loading: false, error: toErrorMessage(error) });
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
              Recent game
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              The latest imported game in this local workspace.
            </p>
          </div>
          <ScanSearch aria-hidden className="size-4 text-muted-foreground" />
        </div>
        {state.game ? (
          <div className="rounded-lg border border-border/80 bg-surface-2 p-4">
            <p className="text-[14px] font-medium text-foreground">
              {state.game.metadata.white} vs {state.game.metadata.black}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {state.game.metadata.result} · {state.game.moves.length} ply
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-4 h-9 border-border/80 bg-transparent px-3"
            >
              <Link href={`/analysis/${state.game.id}`}>
                Open game
                <ArrowUpRight aria-hidden className="size-3.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <EmptyState
            title="No games imported yet"
            description="Paste a PGN or use the R1 fixture to create the first local game."
            action={
              <Button asChild variant="outline" size="sm" className="h-9">
                <Link href="/analysis">Import a game</Link>
              </Button>
            }
          />
        )}
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
