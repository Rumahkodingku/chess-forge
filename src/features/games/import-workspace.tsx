"use client";

import {
  AlertTriangle,
  ArrowRight,
  Database,
  FileText,
  Globe2,
  Loader2,
  Search,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  readChessComArchivesResponse,
  readChessComGamesResponse,
  readLichessGameResponse,
  readLichessGamesResponse,
} from "@/features/games/api-response";
import {
  candidateFromChessComSummary,
  candidateFromGame,
  capCandidates,
  filterCandidates,
  MAX_IMPORT_CANDIDATES,
  sortCandidates,
} from "@/features/games/candidates";
import { decodePgnFile, PgnFileError } from "@/features/games/file-import";
import { R1_FIXTURE_PGN } from "@/features/games/fixtures/r1-walking-skeleton";
import {
  type PgnCandidate,
  PgnImportError,
  parsePgnCandidates,
} from "@/features/games/pgn";
import type { Game } from "@/features/games/types";
import {
  createGameRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { toErrorNotice } from "@/lib/errors";

export type ImportSource = "paste" | "file" | "chesscom" | "lichess";

const SOURCE_LABELS: Record<ImportSource, string> = {
  paste: "Paste",
  file: "File",
  chesscom: "Chess.com",
  lichess: "Lichess",
};

interface ApiErrorBody {
  error?: {
    message?: string;
    code?: string;
    recovery?: string;
  };
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    const message =
      body.error?.message ?? `Request failed with ${response.status}.`;
    return body.error?.recovery ? `${message} ${body.error.recovery}` : message;
  } catch {
    return `Request failed with ${response.status}.`;
  }
}

function mapFileWarnings(
  candidates: PgnCandidate[],
  warnings: string[],
): PgnCandidate[] {
  if (!warnings.length) return candidates;
  return candidates.map((candidate) => {
    const merged = [...candidate.warnings, ...warnings];
    return {
      ...candidate,
      warnings: merged,
      status:
        candidate.status === "invalid" ? "invalid" : "valid-with-warnings",
    };
  });
}

function withWarnings(game: Game, warnings: string[]): Game {
  if (!warnings.length) return game;
  const merged = Array.from(
    new Set([...(game.importWarnings ?? []), ...warnings]),
  );
  return {
    ...game,
    importWarnings: merged,
    importStatus: "valid-with-warnings",
  };
}

function CandidateList({
  candidates,
  selectedId,
  onSelect,
  search,
  onSearch,
}: {
  candidates: PgnCandidate[];
  selectedId?: string;
  onSelect: (candidate: PgnCandidate) => void;
  search: string;
  onSearch: (value: string) => void;
}) {
  const { visible, truncated } = capCandidates(candidates);

  return (
    <div className="space-y-3">
      {candidates.length > 1 ? (
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search player, event, date, or result"
            className="h-10 pl-9"
            aria-label="Search imported games"
          />
        </div>
      ) : null}

      {truncated ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-200">
          Showing the first {MAX_IMPORT_CANDIDATES} games. Use search to narrow
          the list.
        </p>
      ) : null}

      <div className="max-h-[460px] space-y-1.5 overflow-y-auto pr-1">
        {visible.map((candidate) => {
          const selected = candidate.id === selectedId;
          const invalid = candidate.status === "invalid";
          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onSelect(candidate)}
              disabled={invalid}
              aria-current={selected ? "true" : undefined}
              className={`flex w-full min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                selected
                  ? "border-brand/40 bg-brand/10"
                  : invalid
                    ? "border-destructive/20 bg-destructive/5 opacity-70"
                    : "border-border/70 bg-surface-2/60 hover:border-border-strong hover:bg-surface-2"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-medium text-foreground">
                  {candidate.metadata.white} vs {candidate.metadata.black}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                  {candidate.metadata.event ?? "Local game"} ·{" "}
                  {candidate.metadata.date ?? "Unknown date"} ·{" "}
                  {candidate.status === "invalid"
                    ? "Invalid PGN"
                    : `${candidate.plyCount || "?"} ply`}
                </span>
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {candidate.metadata.result}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PreviewPanel({
  game,
  warnings,
  onConfirm,
  onCancel,
  importing,
  error,
}: {
  game: Game;
  warnings: string[];
  onConfirm: () => void;
  onCancel: () => void;
  importing: boolean;
  error: string | null;
}) {
  const moves = game.moves.slice(0, 12).map((move) => move.san);
  return (
    <Card className="border-border/80 bg-surface-1">
      <CardHeader>
        <CardTitle className="text-[15px]">
          {game.metadata.white} vs {game.metadata.black}
        </CardTitle>
        <CardDescription>
          {game.metadata.result} · {game.moves.length} ply ·{" "}
          {game.metadata.event ?? "Local game"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
          {[
            ["Site", game.metadata.site],
            ["Date", game.metadata.date],
            ["Round", game.metadata.round],
            ["Time control", game.metadata.timeControl],
            ["ECO", game.metadata.eco],
            ["Opening", game.metadata.opening],
          ].map(([label, value]) =>
            value ? (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 truncate text-foreground">{value}</dd>
              </div>
            ) : null,
          )}
        </dl>

        <div>
          <p className="text-[11px] text-muted-foreground">Opening moves</p>
          <p className="mt-1 font-mono text-[11px] leading-relaxed text-foreground">
            {moves.join(" ")}
            {game.moves.length > 12 ? " ..." : ""}
          </p>
        </div>

        {warnings.length ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="flex items-center gap-2 text-[11px] font-medium text-amber-200">
              <AlertTriangle aria-hidden className="size-3.5" />
              Import warnings
            </p>
            <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-amber-100/80">
              {warnings.slice(0, 4).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="text-[11px] leading-relaxed text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={onConfirm}
            disabled={importing}
            className="h-10 px-4"
          >
            {importing ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Database aria-hidden className="size-4" />
            )}
            {importing ? "Importing" : "Confirm import"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={importing}
            className="h-10 border-border/80 bg-transparent px-4"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PastePanel({
  onCandidates,
}: {
  onCandidates: (candidates: PgnCandidate[]) => void;
}) {
  const [pgn, setPgn] = useState("");
  const [error, setError] = useState<string | null>(null);

  function parse() {
    setError(null);
    try {
      onCandidates(parsePgnCandidates(pgn, "pgn-text", "paste"));
    } catch (parseError) {
      setError(toErrorNotice(parseError));
    }
  }

  return (
    <Card className="border-border/80 bg-surface-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <FileText aria-hidden className="size-4 text-brand" />
          Paste PGN
        </CardTitle>
        <CardDescription>
          One or many games. Each game is validated before import.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor="pgn-paste"
            className="text-[11px] font-medium text-muted-foreground"
          >
            PGN text
          </label>
          <Textarea
            id="pgn-paste"
            value={pgn}
            onChange={(event) => setPgn(event.target.value)}
            placeholder={'[Event "Local game"]\n\n1. e4 e5 2. Nf3 Nc6'}
            className="min-h-[280px] font-mono text-[12px] leading-relaxed"
            spellCheck={false}
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
          >
            Use fixture
          </Button>
          <Button type="button" onClick={parse} className="h-10 px-4">
            <ArrowRight aria-hidden className="size-4" />
            Parse PGN
          </Button>
          <Button asChild variant="ghost" className="h-10 px-3 text-[11px]">
            <Link href="/labs/pgn">Open parser lab</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FilePanel({
  onCandidates,
}: {
  onCandidates: (candidates: PgnCandidate[]) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function parseFile() {
    if (!file) {
      setError("Choose a PGN file first.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const decoded = await decodePgnFile(file);
      const candidates = parsePgnCandidates(
        decoded.text,
        "pgn-file",
        file.name,
      );
      onCandidates(mapFileWarnings(candidates, decoded.warnings));
    } catch (parseError) {
      setError(
        parseError instanceof PgnFileError ||
          parseError instanceof PgnImportError
          ? parseError.message
          : toErrorNotice(parseError),
      );
    } finally {
      setBusy(false);
    }
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError(null);
  }

  return (
    <Card className="border-border/80 bg-surface-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Upload aria-hidden className="size-4 text-brand" />
          Upload PGN file
        </CardTitle>
        <CardDescription>
          Maximum 5 MB. UTF-8 is preferred, with Windows-1252 fallback.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor="pgn-file"
            className="text-[11px] font-medium text-muted-foreground"
          >
            PGN file
          </label>
          <Input
            id="pgn-file"
            type="file"
            accept=".pgn,text/plain,application/x-chess-pgn"
            onChange={onChange}
            className="h-10 file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-[11px] file:text-foreground"
          />
        </div>
        {file ? (
          <p className="text-[11px] text-muted-foreground">
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[12px] leading-relaxed text-destructive"
          >
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          onClick={() => void parseFile()}
          disabled={busy}
          className="h-10 px-4"
        >
          {busy ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <ArrowRight aria-hidden className="size-4" />
          )}
          {busy ? "Reading" : "Parse file"}
        </Button>
      </CardContent>
    </Card>
  );
}

interface ArchiveOption {
  label: string;
  year: number;
  month: number;
}

function parseArchive(url: string): ArchiveOption | null {
  const match = /\/(\d{4})\/(\d{2})$/.exec(url);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return {
    year,
    month,
    label: `${year}-${String(month).padStart(2, "0")}`,
  };
}

function ChessComPanel({
  onCandidates,
}: {
  onCandidates: (candidates: PgnCandidate[], warnings: string[]) => void;
}) {
  const [username, setUsername] = useState("");
  const [archives, setArchives] = useState<ArchiveOption[]>([]);
  const [archive, setArchive] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"archives" | "games" | null>(null);

  async function loadArchives() {
    setError(null);
    setBusy("archives");
    try {
      const response = await fetch(
        `/api/chesscom/archives?username=${encodeURIComponent(username)}`,
      );
      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }
      const body: unknown = await response.json();
      const archives = readChessComArchivesResponse(body);
      const options = archives
        .map(parseArchive)
        .filter((option): option is ArchiveOption => Boolean(option))
        .sort((left, right) => right.label.localeCompare(left.label));
      setArchives(options);
      setArchive(options[0]?.label ?? "");
    } catch (error) {
      setError(toErrorNotice(error));
    } finally {
      setBusy(null);
    }
  }

  async function loadGames() {
    const selected = archives.find((item) => item.label === archive);
    if (!selected) {
      setError("Load archives and choose a month first.");
      return;
    }
    setError(null);
    setBusy("games");
    try {
      const response = await fetch(
        `/api/chesscom/games?username=${encodeURIComponent(username)}&year=${selected.year}&month=${selected.month}`,
      );
      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }
      const body = readChessComGamesResponse(await response.json());
      onCandidates(body.games.map(candidateFromChessComSummary), body.warnings);
    } catch (error) {
      setError(toErrorNotice(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="border-border/80 bg-surface-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Globe2 aria-hidden className="size-4 text-brand" />
          Chess.com
        </CardTitle>
        <CardDescription>
          Public games only. No account, cookie, or password is requested.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor="chesscom-user"
            className="text-[11px] font-medium text-muted-foreground"
          >
            Chess.com username
          </label>
          <Input
            id="chesscom-user"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="public username"
            className="h-10"
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void loadArchives()}
          disabled={!username.trim() || busy !== null}
          className="h-10 border-border/80 bg-transparent px-4"
        >
          {busy === "archives" ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : null}
          Load archives
        </Button>
        {archives.length ? (
          <>
            <div className="space-y-1.5">
              <label
                htmlFor="chesscom-month"
                className="text-[11px] font-medium text-muted-foreground"
              >
                Month
              </label>
              <Select value={archive} onValueChange={setArchive}>
                <SelectTrigger id="chesscom-month" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {archives.map((item) => (
                    <SelectItem key={item.label} value={item.label}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={() => void loadGames()}
              disabled={!archive || busy !== null}
              className="h-10 px-4"
            >
              {busy === "games" ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <ArrowRight aria-hidden className="size-4" />
              )}
              Load games
            </Button>
          </>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[12px] leading-relaxed text-destructive"
          >
            {error}
          </p>
        ) : null}
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Chess.com is an external service. ChessForge is not affiliated with
          Chess.com.
        </p>
      </CardContent>
    </Card>
  );
}

function LichessPanel({
  onCandidates,
}: {
  onCandidates: (candidates: PgnCandidate[], warnings: string[]) => void;
}) {
  const [mode, setMode] = useState<"username" | "game">("username");
  const [username, setUsername] = useState("");
  const [gameRef, setGameRef] = useState("");
  const [max, setMax] = useState("20");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function parseGameId(value: string): string {
    const trimmed = value.trim();
    const match =
      /(?:lichess\.org\/(?:game\/export\/)?)([A-Za-z0-9]{8,12})/.exec(trimmed);
    return match?.[1] ?? trimmed;
  }

  async function load() {
    setError(null);
    setBusy(true);
    try {
      const safeMax = Math.min(50, Math.max(1, Math.round(Number(max) || 20)));
      const url =
        mode === "username"
          ? `/api/lichess/games?username=${encodeURIComponent(username)}&max=${safeMax}`
          : `/api/lichess/game/${encodeURIComponent(parseGameId(gameRef))}`;
      const response = await fetch(url);
      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }
      const body: unknown = await response.json();
      const games =
        mode === "username"
          ? readLichessGamesResponse(body)
          : [readLichessGameResponse(body)];
      onCandidates(games.map(candidateFromGame), []);
    } catch (error) {
      setError(toErrorNotice(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-border/80 bg-surface-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Globe2 aria-hidden className="size-4 text-brand" />
          Lichess
        </CardTitle>
        <CardDescription>
          Public games only. Use a username or a public game reference.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "username" ? "default" : "outline"}
            onClick={() => setMode("username")}
            className="h-9"
          >
            Username
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "game" ? "default" : "outline"}
            onClick={() => setMode("game")}
            className="h-9"
          >
            Game reference
          </Button>
        </div>
        {mode === "username" ? (
          <>
            <div className="space-y-1.5">
              <label
                htmlFor="lichess-user"
                className="text-[11px] font-medium text-muted-foreground"
              >
                Lichess username
              </label>
              <Input
                id="lichess-user"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="public username"
                className="h-10"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="lichess-max"
                className="text-[11px] font-medium text-muted-foreground"
              >
                Number of games
              </label>
              <Input
                id="lichess-max"
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                value={max}
                onChange={(event) => setMax(event.target.value)}
                className="h-10 w-full"
              />
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <label
              htmlFor="lichess-game"
              className="text-[11px] font-medium text-muted-foreground"
            >
              Game ID or URL
            </label>
            <Input
              id="lichess-game"
              value={gameRef}
              onChange={(event) => setGameRef(event.target.value)}
              placeholder="https://lichess.org/..."
              className="h-10"
              autoComplete="off"
            />
          </div>
        )}
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[12px] leading-relaxed text-destructive"
          >
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          onClick={() => void load()}
          disabled={
            busy || (mode === "username" ? !username.trim() : !gameRef.trim())
          }
          className="h-10 px-4"
        >
          {busy ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <ArrowRight aria-hidden className="size-4" />
          )}
          Load games
        </Button>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Lichess is an external service. ChessForge is not affiliated with
          Lichess.
        </p>
      </CardContent>
    </Card>
  );
}

export function ImportWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSource = searchParams.get("source");
  const [source, setSource] = useState<ImportSource>(
    initialSource === "file" ||
      initialSource === "chesscom" ||
      initialSource === "lichess" ||
      initialSource === "paste"
      ? initialSource
      : "paste",
  );
  const [candidates, setCandidates] = useState<PgnCandidate[]>([]);
  const [globalWarnings, setGlobalWarnings] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [preview, setPreview] = useState<Game | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (
      initialSource === "file" ||
      initialSource === "chesscom" ||
      initialSource === "lichess" ||
      initialSource === "paste"
    ) {
      setSource(initialSource);
    }
  }, [initialSource]);

  const filtered = useMemo(
    () => sortCandidates(filterCandidates(candidates, search)),
    [candidates, search],
  );

  function acceptCandidates(next: PgnCandidate[], warnings: string[] = []) {
    setError(null);
    setGlobalWarnings(warnings);
    setCandidates(next);
    setSearch("");
    const firstValid = next.find((candidate) => candidate.status !== "invalid");
    setSelectedId(firstValid?.id);
    if (firstValid?.game) {
      setPreview(withWarnings(firstValid.game, firstValid.warnings));
    } else {
      setPreview(null);
      if (firstValid) void selectCandidate(firstValid);
    }
  }

  async function selectCandidate(candidate: PgnCandidate) {
    if (candidate.status === "invalid") return;
    setSelectedId(candidate.id);
    setError(null);
    if (candidate.game) {
      setPreview(withWarnings(candidate.game, candidate.warnings));
      return;
    }
    function markInvalid(message: string) {
      setSelectedId(undefined);
      setError(message);
      setCandidates((current) =>
        current.map((item) =>
          item.id === candidate.id
            ? { ...item, status: "invalid" as const, error: message }
            : item,
        ),
      );
    }
    try {
      const parsed = parsePgnCandidates(
        candidate.pgn,
        candidate.source,
        candidate.sourceReference,
      );
      const game = parsed.find((item) => item.game)?.game;
      if (!game) {
        markInvalid("The selected game could not be parsed.");
        return;
      }
      setPreview(withWarnings(game, candidate.warnings));
    } catch (parseError) {
      markInvalid(toErrorNotice(parseError));
    }
  }

  async function confirmImport() {
    if (!preview) return;
    setImporting(true);
    setError(null);
    try {
      const db = await openChessForgeDatabase();
      await createGameRepository(db).save(preview);
      router.push(`/analysis/${preview.id}`);
    } catch (importError) {
      setError(toErrorNotice(importError));
      setImporting(false);
    }
  }

  const previewWarnings = [
    ...(preview?.importWarnings ?? []),
    ...globalWarnings,
  ];

  return (
    <div className="space-y-5">
      <Tabs
        value={source}
        onValueChange={(value) => {
          setSource(value as ImportSource);
          setCandidates([]);
          setPreview(null);
          setSelectedId(undefined);
          setGlobalWarnings([]);
          setError(null);
        }}
        className="space-y-4 flex flex-col"
      >
        <TabsList className="h-full w-full justify-start gap-1 overflow-x-auto border border-border/80 bg-surface-1 p-1">
          {(Object.keys(SOURCE_LABELS) as ImportSource[]).map((key) => (
            <TabsTrigger key={key} value={key} className="flex-none px-3">
              {SOURCE_LABELS[key]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="paste">
          <PastePanel onCandidates={(next) => acceptCandidates(next)} />
        </TabsContent>
        <TabsContent value="file">
          <FilePanel onCandidates={(next) => acceptCandidates(next)} />
        </TabsContent>
        <TabsContent value="chesscom">
          <ChessComPanel onCandidates={acceptCandidates} />
        </TabsContent>
        <TabsContent value="lichess">
          <LichessPanel onCandidates={acceptCandidates} />
        </TabsContent>
      </Tabs>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[12px] leading-relaxed text-destructive"
        >
          {error}
        </p>
      ) : null}

      {candidates.length ? (
        <div
          className={`grid gap-5 ${
            candidates.length > 1
              ? "xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]"
              : ""
          }`}
        >
          {candidates.length > 1 ? (
            <Card className="border-border/80 bg-surface-1">
              <CardHeader>
                <CardTitle className="text-[15px]">Candidate games</CardTitle>
                <CardDescription>
                  {candidates.length} games found. Select one to preview.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CandidateList
                  candidates={filtered}
                  selectedId={selectedId}
                  onSelect={(candidate) => void selectCandidate(candidate)}
                  search={search}
                  onSearch={setSearch}
                />
                {globalWarnings.length ? (
                  <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-[11px] font-medium text-amber-200">
                      Source warnings
                    </p>
                    <ul className="mt-1 space-y-1 text-[10px] leading-relaxed text-amber-100/80">
                      {globalWarnings.slice(0, 3).map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {preview ? (
            <PreviewPanel
              game={preview}
              warnings={previewWarnings}
              onConfirm={() => void confirmImport()}
              onCancel={() => setPreview(null)}
              importing={importing}
              error={error}
            />
          ) : (
            <Card className="border-dashed border-border/80 bg-surface-1">
              <CardHeader>
                <CardTitle className="text-[15px]">Preview a game</CardTitle>
                <CardDescription>
                  Select a valid candidate. The game is not saved until you
                  confirm.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 bg-surface-1/40 p-5">
          <p className="flex items-center gap-2 text-[12px] font-medium text-foreground">
            <Badge variant="outline" className="border-border/80">
              No candidates
            </Badge>
            Choose a source above and parse or load games.
          </p>
          <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
            Paste PGN, upload a file, or fetch a public game. Every import is
            previewed before it is written to IndexedDB.
          </p>
        </div>
      )}
    </div>
  );
}
