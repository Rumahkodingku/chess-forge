import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Chess } from "chess.js";

const SOURCE_URL =
  "https://raw.githubusercontent.com/lichess-org/chess-openings/master";
const OUTPUT = "src/features/analysis/openings/openings.generated.json";

function parseMoves(pgn) {
  return pgn
    .replace(/\d+\.(?:\.\.)?/g, " ")
    .replace(/\b(?:1-0|0-1|1\/2-1\/2|\*)\b/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function epdForMoves(moves) {
  const chess = new Chess();
  for (const san of moves) {
    try {
      chess.move(san);
    } catch {
      throw new Error(`Illegal SAN "${san}" in ${moves.join(" ")}`);
    }
  }
  return chess.fen().split(" ").slice(0, 4).join(" ");
}

async function readSources(sourceDir) {
  const files = [];
  if (sourceDir) {
    for (const name of await readdir(sourceDir)) {
      if (name.endsWith(".tsv")) {
        files.push({
          name,
          text: await readFile(join(sourceDir, name), "utf8"),
        });
      }
    }
    return files;
  }
  for (const letter of ["a", "b", "c", "d", "e"]) {
    const response = await fetch(`${SOURCE_URL}/${letter}.tsv`);
    if (!response.ok) {
      throw new Error(
        `Opening source ${letter}.tsv returned ${response.status}`,
      );
    }
    files.push({ name: `${letter}.tsv`, text: await response.text() });
  }
  return files;
}

const sources = await readSources(process.argv[2]);
const seen = new Set();
const openings = [];

for (const source of sources) {
  const lines = source.text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!line.trim() || index === 0) continue;
    const [eco, name, pgn] = line.split("\t");
    if (!eco || !name || !pgn) {
      throw new Error(`Invalid row in ${source.name}:${index + 1}`);
    }
    const moves = parseMoves(pgn);
    const epd = epdForMoves(moves);
    const key = `${eco}|${name}|${epd}|${moves.length}`;
    if (seen.has(key)) continue;
    seen.add(key);
    openings.push({ eco, name, epd, ply: moves.length, moves });
  }
}

openings.sort(
  (left, right) =>
    left.ply - right.ply ||
    left.eco.localeCompare(right.eco) ||
    left.name.localeCompare(right.name) ||
    left.epd.localeCompare(right.epd),
);

await mkdir("src/features/analysis/openings", { recursive: true });
await writeFile(
  OUTPUT,
  JSON.stringify({
    source: "https://github.com/lichess-org/chess-openings",
    licence: "CC0-1.0",
    openings,
  }),
);
console.log(`Wrote ${openings.length} openings to ${OUTPUT}`);
