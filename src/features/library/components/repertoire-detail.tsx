"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChessgroundBoard } from "@/features/chess/chessground-board";
import { NotesPanel } from "@/features/library/components/notes-panel";
import { lineFen, START_FEN } from "@/features/library/repertoire/model";
import type { RepertoireLine } from "@/features/library/schemas";
import {
  createRepertoireRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { toErrorMessage } from "@/lib/errors";

export function RepertoireDetail({ lineId }: { lineId: string }) {
  const [line, setLine] = useState<RepertoireLine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ply, setPly] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const stored = await createRepertoireRepository(db).getById(lineId);
        if (cancelled) return;
        if (!stored) setError("This repertoire line no longer exists.");
        else setLine(stored);
      } catch (loadError) {
        if (!cancelled) setError(toErrorMessage(loadError));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [lineId]);

  const fen = useMemo(() => {
    if (!line) return START_FEN;
    try {
      return lineFen(START_FEN, line.moves.slice(0, ply));
    } catch {
      return START_FEN;
    }
  }, [line, ply]);

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-[12px] text-destructive">
        {error}
      </div>
    );
  }

  if (!line) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-xl border border-border/80 bg-surface-1 text-[12px] text-muted-foreground">
        <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
        Loading line
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="rounded-xl border border-border/80 bg-surface-1 p-3">
        <ChessgroundBoard
          fen={fen}
          orientation={line.side === "white" ? "w" : "b"}
          label={`${line.name} board`}
        />
        <div className="mt-3 flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-border/80 bg-transparent px-2"
            onClick={() => setPly(0)}
            disabled={ply === 0}
          >
            Start
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-border/80 bg-transparent px-2"
            onClick={() => setPly((value) => Math.max(0, value - 1))}
            disabled={ply === 0}
          >
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-border/80 bg-transparent px-2"
            onClick={() =>
              setPly((value) => Math.min(line.moves.length, value + 1))
            }
            disabled={ply >= line.moves.length}
          >
            Next
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-border/80 bg-transparent px-2"
            onClick={() => setPly(line.moves.length)}
            disabled={ply >= line.moves.length}
          >
            End
          </Button>
        </div>
      </div>

      <Card className="border-border/80 bg-surface-1">
        <CardHeader>
          <CardTitle className="text-[18px]">{line.name}</CardTitle>
          <p className="text-[12px] text-muted-foreground">
            {line.side === "white" ? "White" : "Black"}
            {line.eco ? ` · ${line.eco}` : ""} · {line.moves.length} ply ·{" "}
            {line.priority}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {line.moves.map((move, index) => (
              <li key={`${move.uci}-${index}`}>
                <button
                  type="button"
                  onClick={() => setPly(index + 1)}
                  className={`w-full rounded-md border px-2 py-1 text-left font-mono text-[11px] ${
                    ply === index + 1
                      ? "border-brand/40 bg-brand/10 text-brand"
                      : "border-border/70 bg-surface-2/60 text-foreground hover:border-border-strong"
                  }`}
                >
                  {Math.floor(index / 2) + 1}
                  {index % 2 === 0 ? "." : "..."} {move.san}
                </button>
              </li>
            ))}
          </ol>
          {line.notes ? (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
              {line.notes}
            </p>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              No notes for this line yet.
            </p>
          )}
          <NotesPanel
            targetType="repertoire"
            targetId={line.id}
            targetLabel={line.name}
          />
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              className="h-9 border-border/80 bg-transparent px-3"
            >
              <Link href="/library/repertoire">Back to repertoire</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-9 border-border/80 bg-transparent px-3"
            >
              <Link href={`/library/practice?line=${line.id}`}>
                Review line
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
