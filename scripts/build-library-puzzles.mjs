import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname } from "node:path";
import { createInterface } from "node:readline";
import { createZstdDecompress } from "node:zlib";
import { Chess } from "chess.js";

const DEFAULT_INPUT = "/tmp/opencode/lichess_db_puzzle.csv.zst";
const DEFAULT_OUTPUT = "src/features/library/puzzles/puzzles.generated.json";
const TARGET_COUNT = 5000;
const RATING_MIN = 600;
const RATING_MAX = 2400;
const MIN_POPULARITY = 50;
const MIN_PLAYS = 100;
const MAX_RATING_DEVIATION = 100;

const THEME_GROUPS = [
  { key: "mate", themes: ["mateIn1", "mateIn2", "mateIn3"], quota: 900 },
  { key: "fork", themes: ["fork"], quota: 700 },
  { key: "pin", themes: ["pin"], quota: 600 },
  { key: "skewer", themes: ["skewer"], quota: 500 },
  { key: "discoveredAttack", themes: ["discoveredAttack"], quota: 500 },
  { key: "hangingPiece", themes: ["hangingPiece"], quota: 500 },
  { key: "backRankMate", themes: ["backRankMate"], quota: 400 },
  { key: "endgame", themes: ["endgame"], quota: 400 },
  { key: "sacrifice", themes: ["sacrifice"], quota: 300 },
  { key: "deflection", themes: ["deflection"], quota: 200 },
];

function groupFor(themes) {
  for (const group of THEME_GROUPS) {
    if (group.themes.some((theme) => themes.includes(theme))) return group.key;
  }
  return "other";
}

function score(puzzle) {
  return {
    popularity: puzzle.popularity,
    distance: Math.abs(puzzle.rating - 1500),
    id: puzzle.id,
  };
}

function compare(left, right) {
  const a = score(left);
  const b = score(right);
  if (a.popularity !== b.popularity) return b.popularity - a.popularity;
  if (a.distance !== b.distance) return a.distance - b.distance;
  return a.id.localeCompare(b.id);
}

function trimBucket(bucket, limit) {
  if (bucket.length <= limit) return;
  bucket.sort(compare);
  bucket.length = limit;
}

function parseUci(uci) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length === 5 ? uci[4] : undefined,
  };
}

function isValidPuzzle(puzzle) {
  if (puzzle.moves.length < 2) return false;
  let chess;
  try {
    chess = new Chess(puzzle.fen);
  } catch {
    return false;
  }
  for (const uci of puzzle.moves) {
    const move = parseUci(uci);
    if (!move) return false;
    try {
      chess.move(move);
    } catch {
      return false;
    }
  }
  return true;
}

function csvParts(line) {
  return line.split(",");
}

async function* readLines(input) {
  const extension = extname(input).toLowerCase();
  const source = createReadStream(input);
  const stream =
    extension === ".zst" ? source.pipe(createZstdDecompress()) : source;
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of lines) {
    yield line;
  }
}

async function main() {
  const input = process.argv[2] ?? DEFAULT_INPUT;
  const output = process.argv[3] ?? DEFAULT_OUTPUT;
  const buckets = new Map();
  let seen = 0;
  let candidates = 0;
  let header = true;

  for await (const line of readLines(input)) {
    if (!line.trim()) continue;
    if (header) {
      header = false;
      if (line.startsWith("PuzzleId,")) continue;
    }
    seen += 1;
    const parts = csvParts(line);
    if (parts.length < 10) continue;
    const [
      id,
      fen,
      moveText,
      ratingText,
      deviationText,
      popularityText,
      playsText,
      themeText,
      gameUrl,
      openingText,
    ] = parts;
    const rating = Number(ratingText);
    const ratingDeviation = Number(deviationText);
    const popularity = Number(popularityText);
    const nbPlays = Number(playsText);
    if (
      !id ||
      !fen ||
      !Number.isFinite(rating) ||
      rating < RATING_MIN ||
      rating > RATING_MAX ||
      !Number.isFinite(ratingDeviation) ||
      ratingDeviation > MAX_RATING_DEVIATION ||
      !Number.isFinite(popularity) ||
      popularity < MIN_POPULARITY ||
      !Number.isFinite(nbPlays) ||
      nbPlays < MIN_PLAYS
    ) {
      continue;
    }
    const moves = moveText.split(/\s+/).filter(Boolean);
    if (moves.length < 2) continue;
    const themes = themeText.split(/\s+/).filter(Boolean);
    const openingTags = openingText.split(/\s+/).filter(Boolean);
    const puzzle = {
      id,
      fen,
      moves,
      rating,
      ratingDeviation,
      popularity,
      nbPlays,
      themes,
      openingTags,
      gameUrl: gameUrl || undefined,
    };
    candidates += 1;
    const group = groupFor(themes);
    const bucket = buckets.get(group) ?? [];
    bucket.push(puzzle);
    const limit =
      group === "other"
        ? TARGET_COUNT * 4
        : (THEME_GROUPS.find((item) => item.key === group)?.quota ?? 0) * 3;
    if (bucket.length > limit * 2) trimBucket(bucket, limit);
    buckets.set(group, bucket);
  }

  if (candidates < TARGET_COUNT) {
    throw new Error(
      `Only ${candidates} valid candidates were available; ${TARGET_COUNT} are required.`,
    );
  }

  const selected = [];
  const selectedIds = new Set();
  for (const group of THEME_GROUPS) {
    const bucket = (buckets.get(group.key) ?? []).sort(compare);
    let groupSelected = 0;
    for (const puzzle of bucket) {
      if (selected.length >= TARGET_COUNT) break;
      if (groupSelected >= group.quota) break;
      if (selectedIds.has(puzzle.id)) continue;
      if (!isValidPuzzle(puzzle)) continue;
      selected.push(puzzle);
      selectedIds.add(puzzle.id);
      groupSelected += 1;
    }
  }

  const overflow = [];
  for (const group of THEME_GROUPS) {
    for (const puzzle of buckets.get(group.key) ?? []) {
      if (!selectedIds.has(puzzle.id)) overflow.push(puzzle);
    }
  }
  for (const puzzle of buckets.get("other") ?? []) {
    if (!selectedIds.has(puzzle.id)) overflow.push(puzzle);
  }
  overflow.sort(compare);
  for (const puzzle of overflow) {
    if (selected.length >= TARGET_COUNT) break;
    if (!isValidPuzzle(puzzle)) continue;
    selected.push(puzzle);
    selectedIds.add(puzzle.id);
  }

  if (selected.length !== TARGET_COUNT) {
    throw new Error(
      `Selected ${selected.length} puzzles; ${TARGET_COUNT} are required.`,
    );
  }

  selected.sort((left, right) => left.id.localeCompare(right.id));
  await mkdir(dirname(output), { recursive: true });
  await writeFile(
    output,
    JSON.stringify({
      source: "https://database.lichess.org/lichess_db_puzzle.csv.zst",
      licence: "CC0-1.0",
      selectionVersion: 1,
      count: selected.length,
      puzzles: selected,
    }),
  );
  console.log(
    `Wrote ${selected.length} puzzles from ${candidates} candidates (${seen} rows) to ${output}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
