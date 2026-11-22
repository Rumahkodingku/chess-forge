"use client";

import { FileText, Play } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PgnImportError, parsePgn } from "@/features/games/pgn";
import type { Game } from "@/features/games/types";
import { toErrorMessage } from "@/lib/errors";

const FIXTURE = `[Event "R0 parser fixture"]
[Site "local"]
[Date "2024.01.01"]
[Round "1"]
[White "White"]
[Black "Black"]
[Result "1-0"]
[TimeControl "180+2"]

1. e4 {best by test} e5 $1 2. Nf3 (2. Bc4 Nf6) Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0`;

const FEN_FIXTURE = `[Event "R0 FEN fixture"]
[Site "local"]
[Date "2024.01.01"]
[White "White"]
[Black "Black"]
[Result "*"]
[SetUp "1"]
[FEN "7k/8/5K2/8/8/8/8/6Q1 w - - 0 1"]

1. Qg7# *`;

const INVALID_FIXTURE = `[Event "R0 invalid fixture"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 e5 2. Qh9 *`;

type FixtureName = "standard" | "fen" | "invalid";

export default function PgnLabPage() {
  const [input, setInput] = useState(FIXTURE);
  const [games, setGames] = useState<Game[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function loadFixture(name: FixtureName) {
    setInput(
      name === "standard"
        ? FIXTURE
        : name === "fen"
          ? FEN_FIXTURE
          : INVALID_FIXTURE,
    );
    setGames(null);
    setWarnings([]);
    setError(null);
  }

  function parse() {
    setError(null);
    setGames(null);
    setWarnings([]);
    try {
      const result = parsePgn(input, "pgn-text", "R0 fixture");
      setGames(result.games);
      setWarnings(result.warnings);
    } catch (parseError) {
      if (parseError instanceof PgnImportError) {
        const details = [
          parseError.gameIndex !== undefined
            ? `game ${parseError.gameIndex + 1}`
            : null,
          parseError.ply !== undefined ? `ply ${parseError.ply}` : null,
          parseError.san ? `move ${parseError.san}` : null,
        ]
          .filter(Boolean)
          .join(", ");
        setError(`${parseError.message}${details ? ` (${details})` : ""}`);
        return;
      }
      setError(toErrorMessage(parseError));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="PGN parser lab"
        description="Gate G3 proof. Parse a fixture into the internal game model, preserve comments and variations, and fail bad SAN with a useful error."
        actions={
          <Button onClick={parse} className="h-10 px-4">
            <Play aria-hidden className="size-4" />
            Parse PGN
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card className="border-border/80 bg-surface-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <FileText aria-hidden className="size-4 text-brand" />
              PGN input
            </CardTitle>
            <CardDescription>
              Fixtures are local test data, not imported user games.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={input === FIXTURE ? "default" : "outline"}
                size="sm"
                className="h-9"
                onClick={() => loadFixture("standard")}
              >
                Standard fixture
              </Button>
              <Button
                type="button"
                variant={input === FEN_FIXTURE ? "default" : "outline"}
                size="sm"
                className="h-9"
                onClick={() => loadFixture("fen")}
              >
                FEN fixture
              </Button>
              <Button
                type="button"
                variant={input === INVALID_FIXTURE ? "default" : "outline"}
                size="sm"
                className="h-9"
                onClick={() => loadFixture("invalid")}
              >
                Invalid fixture
              </Button>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="pgn-input"
                className="text-[11px] font-medium text-muted-foreground"
              >
                PGN text
              </label>
              <Textarea
                id="pgn-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="min-h-[360px] font-mono text-[12px] leading-relaxed"
                spellCheck={false}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5" aria-live="polite">
          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-4"
            >
              <p className="text-[12px] font-medium text-destructive">
                PGN rejected
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-destructive/90">
                {error}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Check the reported game and ply. Existing games are not changed
                by a failed parse.
              </p>
            </div>
          ) : null}

          {games ? (
            <Card className="border-border/80 bg-surface-1">
              <CardHeader>
                <CardTitle className="text-[15px]">Parsed result</CardTitle>
                <CardDescription>
                  {games.length} game{games.length === 1 ? "" : "s"} converted
                  into the internal model.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="rounded-lg border border-border/80 bg-surface-2 p-3"
                  >
                    <p className="text-[12px] font-medium text-foreground">
                      {game.metadata.white} vs {game.metadata.black}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {game.metadata.result} · {game.moves.length} ply ·{" "}
                      {game.metadata.opening ?? "Unknown opening"}
                    </p>
                    <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {game.moves
                        .slice(0, 14)
                        .map((move) => move.san)
                        .join(" ")}
                    </p>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Comments:{" "}
                      {game.moves.filter((move) => move.comment).length} · NAGs:{" "}
                      {game.moves.filter((move) => move.nags?.length).length} ·
                      Variations:{" "}
                      {
                        game.moves.filter((move) => move.variations?.length)
                          .length
                      }
                    </p>
                  </div>
                ))}
                {warnings.length ? (
                  <div className="rounded-lg border border-border/80 bg-surface-2 p-3">
                    <p className="text-[11px] font-medium text-foreground">
                      Parser warnings
                    </p>
                    <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                      {warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {!games && !error ? (
            <Card className="border-dashed border-border/80 bg-surface-1">
              <CardHeader>
                <CardTitle className="text-[15px]">No parse yet</CardTitle>
                <CardDescription>
                  Choose a fixture or paste a PGN, then run the parser. Results
                  appear here with comments, NAGs, and variations counted.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
