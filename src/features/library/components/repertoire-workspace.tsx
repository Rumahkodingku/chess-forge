"use client";

import { BookOpen, Loader2, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChessgroundBoard } from "@/features/chess/chessground-board";
import {
  lineFen,
  parseRepertoireMoves,
  START_FEN,
} from "@/features/library/repertoire/model";
import type {
  RepertoireLine,
  RepertoirePriority,
} from "@/features/library/schemas";
import {
  createRepertoireRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { toErrorMessage } from "@/lib/errors";

type LoadState = "loading" | "ready" | "error";

interface EditorState {
  id?: string;
  name: string;
  side: "white" | "black";
  eco: string;
  priority: RepertoirePriority;
  movesText: string;
  notes: string;
}

const EMPTY_EDITOR: EditorState = {
  name: "",
  side: "white",
  eco: "",
  priority: "core",
  movesText: "",
  notes: "",
};

export function RepertoireWorkspace() {
  const [lines, setLines] = useState<RepertoireLine[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const db = await openChessForgeDatabase();
      setLines(await createRepertoireRepository(db).list());
      setState("ready");
    } catch (loadError) {
      setError(toErrorMessage(loadError));
      setState("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const previewFen = useMemo(() => {
    if (!editor?.movesText.trim()) return START_FEN;
    try {
      return lineFen(
        START_FEN,
        parseRepertoireMoves(START_FEN, editor.movesText),
      );
    } catch {
      return START_FEN;
    }
  }, [editor?.movesText]);

  async function saveEditor() {
    if (!editor) return;
    setSaving(true);
    try {
      const moves = parseRepertoireMoves(START_FEN, editor.movesText);
      const db = await openChessForgeDatabase();
      const now = new Date().toISOString();
      const existing = editor.id
        ? lines.find((line) => line.id === editor.id)
        : undefined;
      await createRepertoireRepository(db).save({
        id: editor.id ?? crypto.randomUUID(),
        name: editor.name.trim(),
        side: editor.side,
        eco: editor.eco.trim() || undefined,
        openingName: existing?.openingName,
        startFen: START_FEN,
        moves,
        notes: editor.notes,
        priority: editor.priority,
        tags: existing?.tags ?? [],
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        schemaVersion: 1,
      });
      setEditor(null);
      await reload();
      toast.success("Repertoire line saved.");
    } catch (saveError) {
      toast.error(toErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function remove(line: RepertoireLine) {
    if (!window.confirm(`Delete "${line.name}"?`)) return;
    try {
      const db = await openChessForgeDatabase();
      await createRepertoireRepository(db).delete(line.id);
      await reload();
      toast.success("Repertoire line deleted.");
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  }

  function edit(line: RepertoireLine) {
    setEditor({
      id: line.id,
      name: line.name,
      side: line.side,
      eco: line.eco ?? "",
      priority: line.priority,
      movesText: line.moves.map((move) => move.san).join(" "),
      notes: line.notes,
    });
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-xl border border-border/80 bg-surface-1 text-[12px] text-muted-foreground">
        <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
        Loading repertoire
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-[12px] text-destructive">
        {error ?? "Repertoire could not load."}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-muted-foreground">
            {lines.length} saved line{lines.length === 1 ? "" : "s"}
          </p>
          <Button
            type="button"
            className="h-9 px-3"
            onClick={() => setEditor({ ...EMPTY_EDITOR })}
          >
            <Plus aria-hidden className="size-3.5" />
            New line
          </Button>
        </div>
        {lines.length ? (
          lines.map((line) => (
            <Card key={line.id} className="border-border/80 bg-surface-1">
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-[14px]">
                    {line.name}
                  </CardTitle>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {line.side === "white" ? "White" : "Black"}
                    {line.eco ? ` · ${line.eco}` : ""} · {line.moves.length} ply
                  </p>
                </div>
                <Badge variant="outline">{line.priority}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {line.moves.map((move) => move.san).join(" ")}
                </p>
                {line.notes ? (
                  <p className="text-[12px] leading-relaxed text-foreground">
                    {line.notes}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 border-border/80 bg-transparent px-3"
                    onClick={() => edit(line)}
                  >
                    Edit
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 border-border/80 bg-transparent px-3"
                  >
                    <Link href={`/library/repertoire/${line.id}`}>Open</Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3 text-destructive"
                    onClick={() => void remove(line)}
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="rounded-xl border border-border/80 bg-surface-1 p-6 text-center">
            <BookOpen
              aria-hidden
              className="mx-auto size-6 text-muted-foreground"
            />
            <p className="mt-3 text-[14px] font-medium text-foreground">
              No repertoire lines yet
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Build a line from the Opening Explorer or create one manually.
            </p>
            <Button asChild className="mt-4 h-9">
              <Link href="/library/openings">Explore openings</Link>
            </Button>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        {editor ? (
          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[14px]">
                {editor.id ? "Edit line" : "New line"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={editor.name}
                onChange={(event) =>
                  setEditor((current) =>
                    current
                      ? { ...current, name: event.target.value }
                      : current,
                  )
                }
                placeholder="Line name"
                aria-label="Line name"
              />
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={editor.side}
                  onValueChange={(value) =>
                    setEditor((current) =>
                      current
                        ? { ...current, side: value as "white" | "black" }
                        : current,
                    )
                  }
                >
                  <SelectTrigger aria-label="Side">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="black">Black</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={editor.priority}
                  onValueChange={(value) =>
                    setEditor((current) =>
                      current
                        ? {
                            ...current,
                            priority: value as RepertoirePriority,
                          }
                        : current,
                    )
                  }
                >
                  <SelectTrigger aria-label="Priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="core">Core</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="idea">Idea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                value={editor.eco}
                onChange={(event) =>
                  setEditor((current) =>
                    current ? { ...current, eco: event.target.value } : current,
                  )
                }
                placeholder="ECO (optional)"
                aria-label="ECO"
              />
              <Textarea
                value={editor.movesText}
                onChange={(event) =>
                  setEditor((current) =>
                    current
                      ? { ...current, movesText: event.target.value }
                      : current,
                  )
                }
                placeholder="1. e4 e5 2. Nf3 Nc6"
                aria-label="Moves"
                className="min-h-24 font-mono text-[12px]"
              />
              <Textarea
                value={editor.notes}
                onChange={(event) =>
                  setEditor((current) =>
                    current
                      ? { ...current, notes: event.target.value }
                      : current,
                  )
                }
                placeholder="Why do you play this line?"
                aria-label="Repertoire notes"
                className="min-h-20"
              />
              <div className="overflow-hidden rounded-lg border border-border/70 bg-black p-1">
                <ChessgroundBoard
                  fen={previewFen}
                  orientation={editor.side === "white" ? "w" : "b"}
                  label="Repertoire preview"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="h-9 px-3"
                  disabled={saving}
                  onClick={() => void saveEditor()}
                >
                  {saving ? (
                    <Loader2 aria-hidden className="size-3.5 animate-spin" />
                  ) : (
                    <Save aria-hidden className="size-3.5" />
                  )}
                  Save line
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 border-border/80 bg-transparent px-3"
                  onClick={() => setEditor(null)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-border/80 bg-surface-1 p-4 text-[12px] leading-relaxed text-muted-foreground">
            Select a line to edit, or create a new one. Repertoire lines are
            stored locally in this browser.
          </div>
        )}
      </aside>
    </div>
  );
}
