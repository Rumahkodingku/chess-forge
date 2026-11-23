import type { OpeningMatch } from "@/features/analysis/types";
import type { Game } from "@/features/games/types";

export interface OpeningEntry {
  eco: string;
  name: string;
  epd: string;
  ply: number;
}

export type OpeningIndex = Map<string, OpeningEntry[]>;

let cachedEntries: OpeningEntry[] | null = null;

export function epdFromFen(fen: string): string {
  return fen.split(/\s+/).slice(0, 4).join(" ");
}

export function buildOpeningIndex(entries: OpeningEntry[]): OpeningIndex {
  const index: OpeningIndex = new Map();
  for (const entry of entries) {
    const existing = index.get(entry.epd);
    if (existing) {
      existing.push(entry);
    } else {
      index.set(entry.epd, [entry]);
    }
  }
  for (const group of index.values()) {
    group.sort(
      (left, right) =>
        right.ply - left.ply ||
        left.eco.localeCompare(right.eco) ||
        left.name.localeCompare(right.name),
    );
  }
  return index;
}

export function openingAtFen(
  index: OpeningIndex,
  fen: string,
): OpeningEntry | null {
  const matches = index.get(epdFromFen(fen));
  return matches?.[0] ?? null;
}

export function isOpeningPosition(index: OpeningIndex, fen: string): boolean {
  return Boolean(openingAtFen(index, fen));
}

export function findOpeningForGame(
  entries: OpeningEntry[],
  game: Pick<Game, "initialFen" | "moves">,
): OpeningMatch | null {
  const index = buildOpeningIndex(entries);
  const positions = [
    game.initialFen,
    ...game.moves.map((move) => move.fenAfter),
  ];
  let best: OpeningMatch | null = null;

  for (const [ply, fen] of positions.entries()) {
    const match = openingAtFen(index, fen);
    if (!match) continue;
    const candidate = { ...match, ply };
    if (
      !best ||
      candidate.ply > best.ply ||
      (candidate.ply === best.ply &&
        (candidate.eco < best.eco ||
          (candidate.eco === best.eco && candidate.name < best.name)))
    ) {
      best = candidate;
    }
  }

  return best;
}

export async function loadOpeningEntries(): Promise<OpeningEntry[]> {
  if (cachedEntries) return cachedEntries;
  const module = await import("./openings.generated.json");
  const data = module.default as { openings: OpeningEntry[] };
  cachedEntries = data.openings;
  return cachedEntries;
}

export async function findGameOpening(
  game: Pick<Game, "initialFen" | "moves">,
): Promise<OpeningMatch | null> {
  try {
    return findOpeningForGame(await loadOpeningEntries(), game);
  } catch {
    return null;
  }
}
