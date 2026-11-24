"use client";

import {
  ArrowLeft,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import {
  ChessgroundBoard,
  type PromotionPiece,
} from "@/features/chess/chessground-board";
import { LibraryEnginePanel } from "@/features/library/components/library-engine-panel";
import { NotesPanel } from "@/features/library/components/notes-panel";
import { loadLibraryOpenings } from "@/features/library/openings/load";
import {
  lineSan,
  namedContinuations,
  nodeForLine,
  type OpeningNode,
  type OpeningTree,
  openingNodeAtFen,
  pathToNode,
  primaryName,
  searchOpenings,
} from "@/features/library/openings/tree";
import {
  createRepertoireRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { toErrorMessage } from "@/lib/errors";

type LoadState = "loading" | "ready" | "error";

export function OpeningExplorer() {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<OpeningTree | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"explore" | "counters">("explore");
  const [orientation, setOrientation] = useState<"w" | "b">("w");
  const [side, setSide] = useState<"white" | "black">("white");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { tree: loaded } = await loadLibraryOpenings();
        if (cancelled) return;
        const params = new URLSearchParams(window.location.search);
        const search = params.get("search");
        if (search) setQuery(search);
        const moves = params
          .get("line")
          ?.split(",")
          .map((move) => move.trim())
          .filter(Boolean);
        const fen = params.get("fen");
        const linked = moves?.length
          ? nodeForLine(loaded, moves)
          : fen
            ? openingNodeAtFen(loaded, fen)
            : undefined;
        setTree(loaded);
        setCurrentId(linked?.id ?? loaded.rootId);
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
  }, []);

  const current = tree && currentId ? tree.nodes.get(currentId) : undefined;
  const path = tree && current ? pathToNode(tree, current.id) : [];
  const continuations =
    tree && current ? namedContinuations(tree, current.id) : [];
  const results = useMemo(
    () => (tree ? searchOpenings(tree, query) : []),
    [query, tree],
  );
  const currentName = current ? primaryName(current) : undefined;

  useEffect(() => {
    if (!current) return;
    const url = new URL(window.location.href);
    url.searchParams.set("fen", current.fen);
    const line = path
      .filter((node) => node.move)
      .map((node) => node.move?.uci)
      .join(",");
    if (line) url.searchParams.set("line", line);
    else url.searchParams.delete("line");
    window.history.replaceState(null, "", url);
  }, [current, path]);

  function goTo(node: OpeningNode | undefined) {
    if (!node) return;
    setCurrentId(node.id);
    setNotice(null);
  }

  function playMove(from: string, to: string, promotion?: PromotionPiece) {
    if (!tree || !current) return;
    const move = `${from}${to}${promotion ?? ""}`;
    const childId = current.childIds.find((id) => {
      const child = tree.nodes.get(id);
      return child?.move?.uci === move || child?.move?.uci.startsWith(move);
    });
    if (!childId) {
      setNotice("That move is legal, but it is not in the named opening data.");
      return;
    }
    setCurrentId(childId);
    setNotice(null);
  }

  function reset() {
    if (tree) setCurrentId(tree.rootId);
    setNotice(null);
  }

  async function addToRepertoire() {
    if (!current || !path.length) return;
    const moves = path
      .filter((node) => node.move)
      .map((node) => ({ san: node.move!.san, uci: node.move!.uci }));
    if (!moves.length) {
      toast.error("Play a move before saving a repertoire line.");
      return;
    }
    setSaving(true);
    try {
      const db = await openChessForgeDatabase();
      const repository = createRepertoireRepository(db);
      const lineKey = moves.map((move) => move.uci).join(" ");
      const existing = await repository.list();
      const duplicate = existing.find(
        (line) =>
          line.side === side &&
          line.moves.map((move) => move.uci).join(" ") === lineKey,
      );
      if (duplicate) {
        const shouldDuplicate = window.confirm(
          "This line already exists. OK to duplicate it, Cancel to open the existing line.",
        );
        if (!shouldDuplicate) {
          window.location.href = `/library/repertoire/${duplicate.id}`;
          return;
        }
      }
      const now = new Date().toISOString();
      await repository.save({
        id: crypto.randomUUID(),
        name: duplicate
          ? `${currentName?.name ?? "My opening line"} copy`
          : (currentName?.name ?? "My opening line"),
        side,
        eco: currentName?.eco,
        openingName: currentName?.name,
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        moves,
        notes: "",
        priority: "core",
        tags: [],
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1,
      });
      toast.success("Opening line saved to your repertoire.");
    } catch (saveError) {
      toast.error(toErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-border/80 bg-surface-1">
        <Loader2
          aria-hidden
          className="size-5 animate-spin text-muted-foreground"
        />
        <span className="ml-2 text-[12px] text-muted-foreground">
          Loading opening data
        </span>
      </div>
    );
  }

  if (state === "error" || !tree || !current) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5">
        <p className="text-[13px] font-medium text-destructive">
          Opening data could not load.
        </p>
        <p className="mt-1 text-[12px] text-destructive/80">
          {error ?? "Unknown error"}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 h-9 border-destructive/40 bg-transparent"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <div className="space-y-4">
        <div className="rounded-xl border border-border/80 bg-surface-1 p-3">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search opening name or ECO"
              aria-label="Search openings"
              className="h-10 pl-9"
            />
          </div>
          <div className="mt-2 flex gap-1 rounded-lg border border-border/70 bg-surface-2/60 p-1">
            {(
              [
                ["explore", "Explore"],
                ["counters", "Counters & Defenses"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-current={mode === value ? "page" : undefined}
                className={`min-h-8 rounded-md px-2.5 text-[11px] font-medium ${
                  mode === value
                    ? "bg-brand/15 text-brand"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {query.trim() ? (
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {results.length ? (
                results.map((result) => (
                  <button
                    key={`${result.node.id}-${result.eco}-${result.name}`}
                    type="button"
                    onClick={() => goTo(result.node)}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border/70 bg-surface-2/60 px-3 py-2 text-left text-[12px] transition-colors hover:border-border-strong hover:bg-surface-2"
                  >
                    <span className="truncate">{result.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {result.eco}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-2 py-3 text-[12px] text-muted-foreground">
                  No named opening matches that search.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-border/80 bg-surface-1 p-3">
          <ChessgroundBoard
            fen={current.fen}
            orientation={orientation}
            lastMove={current.move?.uci}
            label="Opening explorer board"
            onMove={playMove}
          />
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-border/80 bg-transparent px-2"
              onClick={reset}
              aria-label="Reset to starting position"
            >
              <RotateCcw aria-hidden className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-border/80 bg-transparent px-2"
              onClick={() =>
                setOrientation((value) => (value === "w" ? "b" : "w"))
              }
            >
              Flip board
            </Button>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {current.epd}
            </span>
          </div>
          {notice ? (
            <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-200">
              {notice}
            </p>
          ) : null}
        </div>

        {mode === "explore" ? (
          <div className="rounded-xl border border-border/80 bg-surface-1 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-medium text-foreground">
                Move list
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {path.filter((node) => node.move).length} ply
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {path
                .filter((node) => node.move)
                .map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setCurrentId(node.id)}
                    className="rounded border border-border/70 bg-surface-2 px-2 py-1 font-mono text-[11px] text-foreground hover:border-border-strong"
                  >
                    {node.move?.san}
                  </button>
                ))}
              {path.length <= 1 ? (
                <p className="px-1 py-1 text-[11px] text-muted-foreground">
                  Play a move on the board or choose a continuation.
                </p>
              ) : null}
            </div>
            <div className="mt-3 flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-border/80 bg-transparent px-2"
                disabled={path.length <= 1}
                onClick={() => setCurrentId(path[0]?.id ?? current.id)}
                aria-label="First move"
              >
                <ChevronFirst aria-hidden className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-border/80 bg-transparent px-2"
                disabled={path.length <= 1}
                onClick={() =>
                  setCurrentId(path[path.length - 2]?.id ?? current.id)
                }
                aria-label="Previous move"
              >
                <ChevronLeft aria-hidden className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-border/80 bg-transparent px-2"
                disabled={!continuations.length}
                onClick={() => goTo(continuations[0]?.node)}
                aria-label="Next named move"
              >
                <ChevronRight aria-hidden className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-border/80 bg-transparent px-2"
                disabled={!continuations.length}
                onClick={() => {
                  let node = current;
                  while (node.childIds.length) {
                    node = tree.nodes.get(node.childIds[0]) ?? node;
                  }
                  setCurrentId(node.id);
                }}
                aria-label="Last named move"
              >
                <ChevronLast aria-hidden className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
            <p className="text-[12px] font-medium text-foreground">
              Counters &amp; Defenses
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Use the named continuations panel on the right to follow a
              documented response. The engine panel below gives a concrete
              alternative for the current position. Names are documentation, not
              popularity data.
            </p>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-brand">Opening</p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-foreground">
                {currentName?.name ?? "Unnamed position"}
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {currentName ? `${currentName.eco} · ` : ""}
                {current.epd}
              </p>
            </div>
            <Waypoints
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
          </div>
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {lineSan(path) || "Starting position"}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Select
              value={side}
              onValueChange={(value) => setSide(value as "white" | "black")}
            >
              <SelectTrigger className="h-9 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="white">White</SelectItem>
                <SelectItem value="black">Black</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              className="h-9 px-3"
              disabled={saving || path.length <= 1}
              onClick={() => void addToRepertoire()}
            >
              {saving ? (
                <Loader2 aria-hidden className="size-3.5 animate-spin" />
              ) : (
                <Plus aria-hidden className="size-3.5" />
              )}
              Add to repertoire
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-9 border-border/80 bg-transparent px-3"
            >
              <Link href="/library/repertoire">Open repertoire</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-medium text-foreground">
                Counters &amp; Defenses
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Named continuations, not popularity data.
              </p>
            </div>
            <Badge variant="outline">{continuations.length}</Badge>
          </div>
          <div className="mt-3 space-y-1.5">
            {continuations.length ? (
              continuations.map((continuation) => (
                <button
                  key={continuation.node.id}
                  type="button"
                  onClick={() => goTo(continuation.node)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-border/70 bg-surface-2/60 px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface-2"
                >
                  <span className="font-mono text-[12px] text-foreground">
                    {continuation.node.move?.san}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {continuation.name ?? "Unnamed"}
                  </span>
                  <ArrowLeft
                    aria-hidden
                    className="size-3 rotate-180 text-muted-foreground"
                  />
                </button>
              ))
            ) : (
              <p className="rounded-md border border-border/70 bg-surface-2/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
                No named continuation is stored for this position. You can still
                analyse it with Stockfish from Analysis.
              </p>
            )}
          </div>
        </div>

        <LibraryEnginePanel fen={current.fen} />

        <NotesPanel
          targetType="opening"
          targetId={current.epd}
          targetLabel={
            currentName
              ? `${currentName.name} (${currentName.eco})`
              : "Opening position"
          }
        />

        <div className="rounded-xl border border-border/80 bg-surface-1 p-4 text-[11px] leading-relaxed text-muted-foreground">
          Opening names and move sequences come from the CC0
          <span className="text-foreground"> chess-openings </span>
          dataset. Counters are documented continuations, not win-rate claims.
        </div>
      </aside>
    </div>
  );
}
