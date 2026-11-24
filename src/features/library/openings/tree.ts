import { Chess } from "chess.js";
import {
  epdFromFen,
  type OpeningEntry,
} from "@/features/analysis/openings/lookup";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const ROOT_ID = "start";

export interface OpeningNode {
  id: string;
  fen: string;
  epd: string;
  parentId: string | null;
  move: { san: string; uci: string } | null;
  names: Array<{ eco: string; name: string }>;
  childIds: string[];
}

export interface OpeningTree {
  rootId: string;
  nodes: Map<string, OpeningNode>;
}

function resultUci(result: {
  from: string;
  to: string;
  promotion?: string;
}): string {
  return `${result.from}${result.to}${result.promotion ?? ""}`;
}

function addName(node: OpeningNode, eco: string, name: string): void {
  if (node.names.some((entry) => entry.eco === eco && entry.name === name)) {
    return;
  }
  node.names.push({ eco, name });
  node.names.sort(
    (left, right) =>
      left.eco.localeCompare(right.eco) || left.name.localeCompare(right.name),
  );
}

export function buildOpeningTree(entries: OpeningEntry[]): OpeningTree {
  const root: OpeningNode = {
    id: ROOT_ID,
    fen: START_FEN,
    epd: epdFromFen(START_FEN),
    parentId: null,
    move: null,
    names: [],
    childIds: [],
  };
  const nodes = new Map<string, OpeningNode>([[ROOT_ID, root]]);

  for (const entry of entries) {
    const chess = new Chess();
    let parent = root;
    for (const san of entry.moves) {
      const result = chess.move(san);
      const id = `${parent.id}|${result.san}`;
      let node = nodes.get(id);
      if (!node) {
        node = {
          id,
          fen: chess.fen(),
          epd: epdFromFen(chess.fen()),
          parentId: parent.id,
          move: { san: result.san, uci: resultUci(result) },
          names: [],
          childIds: [],
        };
        nodes.set(id, node);
        parent.childIds.push(id);
      }
      parent = node;
    }
    addName(parent, entry.eco, entry.name);
  }

  for (const node of nodes.values()) {
    node.childIds.sort((left, right) => {
      const a = nodes.get(left);
      const b = nodes.get(right);
      return (a?.move?.san ?? "").localeCompare(b?.move?.san ?? "");
    });
  }

  return { rootId: ROOT_ID, nodes };
}

export function nodeForLine(
  tree: OpeningTree,
  uciMoves: string[],
): OpeningNode | undefined {
  let node: OpeningNode | undefined = tree.nodes.get(tree.rootId);
  if (!node) return undefined;
  for (const uci of uciMoves) {
    const current: OpeningNode = node;
    const next: OpeningNode | undefined = current.childIds
      .map((id) => tree.nodes.get(id))
      .find((child) => child?.move?.uci === uci);
    if (!next) return current;
    node = next;
  }
  return node;
}

export function openingNodeAtFen(
  tree: OpeningTree,
  fen: string,
): OpeningNode | undefined {
  const epd = epdFromFen(fen);
  for (const node of tree.nodes.values()) {
    if (node.fen === fen || node.epd === epd) return node;
  }
  return undefined;
}

export function primaryName(
  node: OpeningNode,
): { eco: string; name: string } | undefined {
  return node.names[0];
}

export function pathToNode(tree: OpeningTree, nodeId: string): OpeningNode[] {
  const path: OpeningNode[] = [];
  let current = tree.nodes.get(nodeId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? tree.nodes.get(current.parentId) : undefined;
  }
  return path;
}

export function lineSan(path: OpeningNode[]): string {
  const moves = path.filter((node) => node.move).map((node) => node.move!.san);
  const parts: string[] = [];
  for (let index = 0; index < moves.length; index += 2) {
    parts.push(`${index / 2 + 1}. ${moves[index]}`);
    if (moves[index + 1]) parts[parts.length - 1] += ` ${moves[index + 1]}`;
  }
  return parts.join(" ");
}

export function namedContinuations(
  tree: OpeningTree,
  nodeId: string,
): Array<{ node: OpeningNode; eco?: string; name?: string }> {
  const node = tree.nodes.get(nodeId);
  if (!node) return [];
  return node.childIds
    .map((id) => tree.nodes.get(id))
    .filter((child): child is OpeningNode => Boolean(child))
    .map((child) => ({
      node: child,
      eco: child.names[0]?.eco,
      name: child.names[0]?.name,
    }))
    .sort((left, right) => {
      if (left.name && right.name) return left.name.localeCompare(right.name);
      if (left.name) return -1;
      if (right.name) return 1;
      return (left.node.move?.san ?? "").localeCompare(
        right.node.move?.san ?? "",
      );
    });
}

function matchScore(query: string, value: string): number {
  const normalized = value.toLowerCase();
  if (normalized === query) return 3;
  if (normalized.startsWith(query)) return 2;
  if (normalized.includes(query)) return 1;
  return 0;
}

export function searchOpenings(
  tree: OpeningTree,
  rawQuery: string,
  limit = 50,
): Array<{ node: OpeningNode; eco: string; name: string }> {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];
  const results: Array<{
    node: OpeningNode;
    eco: string;
    name: string;
    score: number;
  }> = [];
  for (const node of tree.nodes.values()) {
    for (const name of node.names) {
      const score = Math.max(
        matchScore(query, name.name),
        matchScore(query, name.eco),
      );
      if (score > 0) {
        results.push({ node, eco: name.eco, name: name.name, score });
      }
    }
  }
  return results
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.eco.localeCompare(right.eco) ||
        left.name.localeCompare(right.name),
    )
    .slice(0, limit)
    .map(({ node, eco, name }) => ({ node, eco, name }));
}
