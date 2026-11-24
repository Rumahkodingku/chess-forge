import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import type { OpeningEntry } from "@/features/analysis/openings/lookup";
import {
  buildOpeningIndex,
  epdFromFen,
  findOpeningForGame,
  isOpeningPosition,
  loadOpeningEntries,
  openingAtFen,
} from "@/features/analysis/openings/lookup";
import { parseSinglePgn } from "@/features/games/pgn";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const E4_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const E4_E5_FEN =
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

const entries: OpeningEntry[] = [
  {
    eco: "A00",
    name: "Start",
    epd: epdFromFen(START_FEN),
    ply: 0,
    moves: [],
  },
  {
    eco: "B00",
    name: "King's Pawn",
    epd: epdFromFen(E4_FEN),
    ply: 1,
    moves: ["e4"],
  },
  {
    eco: "C20",
    name: "King's Pawn Game",
    epd: epdFromFen(E4_E5_FEN),
    ply: 2,
    moves: ["e4", "e5"],
  },
  {
    eco: "C20",
    name: "Open Game",
    epd: epdFromFen(E4_E5_FEN),
    ply: 2,
    moves: ["e4", "e5"],
  },
];

describe("opening lookup", () => {
  it("strips clocks and move counters from a FEN", () => {
    expect(epdFromFen(E4_FEN)).toBe(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -",
    );
  });

  it("returns the deepest matching opening", () => {
    const game = parseSinglePgn(`[Event "Opening"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 e5 2. Nf3 *`);
    expect(findOpeningForGame(entries, game)).toEqual({
      eco: "C20",
      name: "King's Pawn Game",
      epd: epdFromFen(E4_E5_FEN),
      ply: 2,
      moves: ["e4", "e5"],
    });
  });

  it("matches transpositions by EPD", () => {
    const index = buildOpeningIndex(entries);
    const transposed =
      "rnbqkbnr/ppp1pppp/8/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq -";
    expect(
      openingAtFen(
        index,
        "rnbqkbnr/ppp1pppp/8/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq - 2 3",
      ),
    ).toBeNull();
    const enriched = buildOpeningIndex([
      ...entries,
      {
        eco: "D02",
        name: "Transposed",
        epd: epdFromFen(transposed),
        ply: 3,
        moves: ["d4", "d5", "Nf3"],
      },
    ]);
    expect(
      openingAtFen(
        enriched,
        "rnbqkbnr/ppp1pppp/8/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq - 2 3",
      )?.name,
    ).toBe("Transposed");
  });

  it("ties by ECO then name", () => {
    expect(openingAtFen(buildOpeningIndex(entries), E4_E5_FEN)?.name).toBe(
      "King's Pawn Game",
    );
  });

  it("recognises whether a position is in the book", () => {
    const index = buildOpeningIndex(entries);
    expect(isOpeningPosition(index, E4_FEN)).toBe(true);
    expect(isOpeningPosition(index, "4k3/8/8/8/8/8/8/4K3 w - - 0 1")).toBe(
      false,
    );
  });

  it("loads the vendored full dataset offline", async () => {
    const loaded = await loadOpeningEntries();
    expect(loaded.length).toBeGreaterThan(3000);
    expect(loaded.some((entry) => entry.eco === "C60")).toBe(true);
  });

  it("loads legal move sequences for every opening", async () => {
    const loaded = await loadOpeningEntries();
    for (const entry of loaded) {
      expect(entry.moves.length).toBe(entry.ply);
      const chess = new Chess();
      for (const san of entry.moves) {
        expect(() => chess.move(san)).not.toThrow();
      }
      expect(epdFromFen(chess.fen())).toBe(entry.epd);
    }
  });
});
