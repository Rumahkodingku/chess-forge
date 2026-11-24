import { describe, expect, it } from "vitest";
import type { OpeningEntry } from "@/features/analysis/openings/lookup";
import {
  buildOpeningTree,
  lineSan,
  namedContinuations,
  openingNodeAtFen,
  pathToNode,
  searchOpenings,
} from "@/features/library/openings/tree";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const E4_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const E4_E5_FEN =
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

const entries: OpeningEntry[] = [
  {
    eco: "B00",
    name: "King's Pawn",
    epd: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -",
    ply: 1,
    moves: ["e4"],
  },
  {
    eco: "C20",
    name: "Open Game",
    epd: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
    ply: 2,
    moves: ["e4", "e5"],
  },
  {
    eco: "C20",
    name: "King's Pawn Game",
    epd: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
    ply: 2,
    moves: ["e4", "e5"],
  },
];

describe("opening tree", () => {
  it("builds a root and legal child nodes", () => {
    const tree = buildOpeningTree(entries);
    const root = tree.nodes.get(tree.rootId);
    expect(root?.fen).toBe(START_FEN);
    expect(root?.childIds).toHaveLength(1);
    const e4 = tree.nodes.get(root?.childIds[0] ?? "");
    expect(e4?.move?.san).toBe("e4");
    expect(e4?.epd).toBe(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -",
    );
  });

  it("finds nodes by full FEN and EPD", () => {
    const tree = buildOpeningTree(entries);
    expect(openingNodeAtFen(tree, E4_FEN)?.move?.san).toBe("e4");
    expect(openingNodeAtFen(tree, E4_E5_FEN)?.move?.san).toBe("e5");
  });

  it("returns named continuations", () => {
    const tree = buildOpeningTree(entries);
    const root = tree.nodes.get(tree.rootId);
    const continuations = namedContinuations(tree, root?.id ?? "");
    expect(
      continuations[0]?.name ?? continuations[0]?.node.names[0]?.name,
    ).toBe("King's Pawn");
  });

  it("ranks exact and prefix search matches", () => {
    const tree = buildOpeningTree(entries);
    expect(searchOpenings(tree, "Open Game")[0]?.name).toBe("Open Game");
    expect(searchOpenings(tree, "C20")[0]?.eco).toBe("C20");
    expect(searchOpenings(tree, "king")[0]?.name).toBe("King's Pawn");
  });

  it("sorts multiple names by ECO then name", () => {
    const tree = buildOpeningTree(entries);
    const node = openingNodeAtFen(tree, E4_E5_FEN);
    expect(node?.names.map((name) => name.name)).toEqual([
      "King's Pawn Game",
      "Open Game",
    ]);
  });

  it("returns the root-to-node path", () => {
    const tree = buildOpeningTree(entries);
    const node = openingNodeAtFen(tree, E4_E5_FEN);
    const path = pathToNode(tree, node?.id ?? "");
    expect(path.map((item) => item.move?.san ?? "start")).toEqual([
      "start",
      "e4",
      "e5",
    ]);
    expect(lineSan(path)).toBe("1. e4 e5");
  });
});
