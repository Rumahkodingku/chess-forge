"use client";

import { ArrowRight, FileText, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { R1_FIXTURE_PGN } from "@/features/games/fixtures/r1-walking-skeleton";
import { parseSinglePgn } from "@/features/games/pgn";
import {
  createGameRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { toErrorMessage } from "@/lib/errors";

type ImportState = "idle" | "importing";

export function ImportGameForm() {
  const router = useRouter();
  const [pgn, setPgn] = useState("");
  const [state, setState] = useState<ImportState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function importGame() {
    setError(null);
    if (!pgn.trim()) {
      setError("Paste a PGN or use the fixture before importing.");
      return;
    }

    setState("importing");
    try {
      const game = parseSinglePgn(pgn, "pgn-text", "R1 paste import");
      const db = await openChessForgeDatabase();
      await createGameRepository(db).save(game);
      router.push(`/analysis/${game.id}`);
    } catch (importError) {
      setError(toErrorMessage(importError));
      setState("idle");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="border-border/80 bg-surface-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <FileText aria-hidden className="size-4 text-brand" />
            Import one PGN
          </CardTitle>
          <CardDescription>
            R1 accepts one pasted game. File upload, multiple games, Chess.com,
            and Lichess arrive in R2.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="pgn-import"
              className="text-[11px] font-medium text-muted-foreground"
            >
              PGN text
            </label>
            <Textarea
              id="pgn-import"
              value={pgn}
              onChange={(event) => setPgn(event.target.value)}
              placeholder={'[Event "Local game"]\n\n1. e4 e5 2. Nf3 Nc6'}
              className="min-h-[320px] font-mono text-[12px] leading-relaxed"
              spellCheck={false}
              disabled={state === "importing"}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[12px] leading-relaxed text-destructive"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 border-border/80 bg-transparent px-4"
              onClick={() => {
                setPgn(R1_FIXTURE_PGN);
                setError(null);
              }}
              disabled={state === "importing"}
            >
              Use fixture
            </Button>
            <Button
              type="button"
              onClick={() => void importGame()}
              disabled={state === "importing"}
              className="h-10 px-4"
            >
              {state === "importing" ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <ArrowRight aria-hidden className="size-4" />
              )}
              {state === "importing" ? "Importing" : "Import game"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card className="border-border/80 bg-surface-1">
          <CardHeader>
            <CardTitle className="text-[15px]">What R1 proves</CardTitle>
            <CardDescription>
              The shortest path from a real PGN to a real video file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-[12px] leading-relaxed text-muted-foreground">
              <li>
                <span className="font-mono text-[11px] text-brand">01</span>{" "}
                Parse and validate a legal game.
              </li>
              <li>
                <span className="font-mono text-[11px] text-brand">02</span>{" "}
                Replay moves on the SVG board.
              </li>
              <li>
                <span className="font-mono text-[11px] text-brand">03</span>{" "}
                Analyse the position before a move.
              </li>
              <li>
                <span className="font-mono text-[11px] text-brand">04</span>{" "}
                Forge one scene and export WebM.
              </li>
            </ol>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-surface-1">
          <CardHeader>
            <CardTitle className="text-[15px]">Parser proof</CardTitle>
            <CardDescription>
              The R0 lab still exposes the parser without persistence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              variant="outline"
              className="h-10 border-border/80 bg-transparent px-4"
            >
              <a href="/labs/pgn">Open PGN lab</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
