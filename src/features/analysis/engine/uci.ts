import { Chess } from "chess.js";
import type { Evaluation } from "@/features/analysis/types";
import { ValidationError } from "@/lib/errors";

export interface UciInfo {
  depth?: number;
  seldepth?: number;
  multipv?: number;
  score?: Evaluation;
  pv?: string[];
  nodes?: number;
  nps?: number;
}

function sideToMove(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

export function assertValidFen(fen: string): void {
  try {
    new Chess(fen);
  } catch {
    throw new ValidationError(
      "The position FEN is invalid.",
      "Check the FEN and analyse again.",
    );
  }
}

export function normalizeScore(
  fen: string,
  type: "cp" | "mate",
  value: number,
): Evaluation {
  const normalized = sideToMove(fen) === "b" ? -value : value;
  return { type, value: normalized, perspective: "white" };
}

export function parseUciInfo(line: string, fen: string): UciInfo | null {
  if (!line.startsWith("info ")) return null;
  const tokens = line.split(/\s+/);
  const info: UciInfo = {};

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    switch (token) {
      case "depth":
        info.depth = Number(tokens[index + 1]);
        break;
      case "seldepth":
        info.seldepth = Number(tokens[index + 1]);
        break;
      case "multipv":
        info.multipv = Number(tokens[index + 1]);
        break;
      case "nodes":
        info.nodes = Number(tokens[index + 1]);
        break;
      case "nps":
        info.nps = Number(tokens[index + 1]);
        break;
      case "score": {
        const kind = tokens[index + 1];
        const raw = Number(tokens[index + 2]);
        if ((kind === "cp" || kind === "mate") && Number.isFinite(raw)) {
          info.score = normalizeScore(fen, kind, raw);
        }
        break;
      }
      case "pv":
        info.pv = tokens.slice(index + 1);
        return info;
      default:
        break;
    }
  }

  return info;
}

export function isBestMoveLine(line: string): boolean {
  return line.startsWith("bestmove ");
}

export function parseBestMove(line: string): string | null {
  if (!line.startsWith("bestmove ")) return null;
  const [, move] = line.split(/\s+/);
  return move && move !== "(none)" ? move : null;
}

export function parseUciMove(uci: string): {
  from: string;
  to: string;
  promotion?: string;
} | null {
  const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(uci);
  if (!match) return null;
  const [, from, to, promotion] = match;
  return promotion ? { from, to, promotion } : { from, to };
}

export function formatEvaluation(evaluation: Evaluation): string {
  if (evaluation.type === "mate") {
    if (evaluation.value === 0) return "#";
    return `${evaluation.value > 0 ? "+" : "-"}M${Math.abs(evaluation.value)}`;
  }
  const pawns = evaluation.value / 100;
  return `${pawns >= 0 ? "+" : ""}${pawns.toFixed(2)}`;
}

export function analysisCacheKey(input: {
  fen: string;
  engineVersion: string;
  depth?: number;
  movetimeMs?: number;
  multiPv: number;
  threads: number;
  hashMb: number;
}): string {
  const limit =
    input.movetimeMs !== undefined
      ? `t${input.movetimeMs}`
      : `d${input.depth ?? 0}`;
  return [
    input.engineVersion,
    input.fen,
    limit,
    input.multiPv,
    input.threads,
    input.hashMb,
  ].join("|");
}
