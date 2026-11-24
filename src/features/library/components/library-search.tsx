"use client";

import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { Game } from "@/features/games/types";
import { loadLibraryOpenings } from "@/features/library/openings/load";
import {
  type OpeningTree,
  searchOpenings,
} from "@/features/library/openings/tree";
import { searchReferenceArticles } from "@/features/library/reference";
import type { LibraryNote, RepertoireLine } from "@/features/library/schemas";
import {
  createGameRepository,
  createLibraryNoteRepository,
  createRepertoireRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";

interface Results {
  openings: Array<{ label: string; href: string; detail: string }>;
  repertoire: Array<{ label: string; href: string; detail: string }>;
  notes: Array<{ label: string; href: string; detail: string }>;
  games: Array<{ label: string; href: string; detail: string }>;
  articles: Array<{ label: string; href: string; detail: string }>;
}

const EMPTY: Results = {
  openings: [],
  repertoire: [],
  notes: [],
  games: [],
  articles: [],
};

export function LibrarySearch() {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [tree, setTree] = useState<OpeningTree | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [lines, setLines] = useState<RepertoireLine[]>([]);
  const [notes, setNotes] = useState<LibraryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [openingData, db] = await Promise.all([
          loadLibraryOpenings(),
          openChessForgeDatabase(),
        ]);
        const [storedGames, storedLines, storedNotes] = await Promise.all([
          createGameRepository(db).list(),
          createRepertoireRepository(db).list(),
          createLibraryNoteRepository(db).listAll(),
        ]);
        if (cancelled) return;
        setTree(openingData.tree);
        setGames(storedGames);
        setLines(storedLines);
        setNotes(storedNotes);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Local Library index could not load.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo<Results>(() => {
    const term = deferred.trim().toLowerCase();
    if (!term || !tree) return EMPTY;
    const matchingOpenings = searchOpenings(tree, term, 8).map((item) => ({
      label: item.name,
      href: "/library/openings",
      detail: item.eco,
    }));
    const matchingLines = lines
      .filter((line) =>
        [line.name, line.eco, line.openingName, ...line.tags]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term)),
      )
      .slice(0, 8)
      .map((line) => ({
        label: line.name,
        href: `/library/repertoire/${line.id}`,
        detail: line.side,
      }));
    const matchingNotes = notes
      .filter((note) =>
        [note.targetLabel, note.body, ...note.tags]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
      .slice(0, 8)
      .map((note) => ({
        label: note.targetLabel,
        href:
          note.targetType === "article"
            ? `/library/reference/${note.targetId}`
            : note.targetType === "repertoire"
              ? `/library/repertoire/${note.targetId}`
              : "/library",
        detail: note.body.slice(0, 80),
      }));
    const matchingGames = games
      .filter((game) =>
        [
          game.metadata.white,
          game.metadata.black,
          game.metadata.event,
          game.metadata.opening,
          game.metadata.eco,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term)),
      )
      .slice(0, 8)
      .map((game) => ({
        label: `${game.metadata.white} vs ${game.metadata.black}`,
        href: `/library/games/${game.id}/insights`,
        detail: game.metadata.result,
      }));
    const matchingArticles = searchReferenceArticles(term)
      .slice(0, 8)
      .map((article) => ({
        label: article.title,
        href: `/library/reference/${article.slug}`,
        detail: article.category,
      }));
    return {
      openings: matchingOpenings,
      repertoire: matchingLines,
      notes: matchingNotes,
      games: matchingGames,
      articles: matchingArticles,
    };
  }, [deferred, games, lines, notes, tree]);

  const total = Object.values(results).reduce(
    (sum, group) => sum + group.length,
    0,
  );

  return (
    <div className="rounded-xl border border-border/80 bg-surface-1 p-3">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search openings, games, notes, repertoire, or articles"
          aria-label="Search Chess Library"
          className="h-10 pl-9"
        />
      </div>
      {loading ? (
        <p className="mt-2 flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
          <Loader2 aria-hidden className="size-3 animate-spin" />
          Loading local index
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
          {error}
        </p>
      ) : null}
      {query.trim() && !loading ? (
        <div className="mt-3 space-y-3">
          {total === 0 ? (
            <p className="px-1 text-[12px] text-muted-foreground">
              No Library item matches this search.
            </p>
          ) : (
            (
              [
                ["Openings", results.openings],
                ["Repertoire", results.repertoire],
                ["Notes", results.notes],
                ["Games", results.games],
                ["Reference", results.articles],
              ] as const
            ).map(([label, group]) =>
              group.length ? (
                <div key={label}>
                  <p className="px-1 text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                    {label}
                  </p>
                  <div className="mt-1 space-y-1">
                    {group.map((item) => (
                      <Link
                        key={`${label}-${item.href}-${item.label}`}
                        href={item.href}
                        className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-surface-2/60 px-3 py-2 text-[12px] transition-colors hover:border-border-strong hover:bg-surface-2"
                      >
                        <span className="truncate text-foreground">
                          {item.label}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          {item.detail}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null,
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
