import { Chess } from "chess.js";
import { pieceValue } from "@/features/analysis/brilliant";
import { parseUciMove } from "@/features/analysis/engine/uci";
import type { Threat } from "@/features/analysis/types";

export interface ThreatInput {
  fen: string;
  pv: string[];
  ply: number;
  mover: "w" | "b";
}

interface CaptureGain {
  san: string;
  uci: string;
  net: number;
}

function captureGain(
  fen: string,
  uci: string,
  capturedBy: "w" | "b",
): CaptureGain | null {
  const move = parseUciMove(uci);
  if (!move) return null;
  const chess = new Chess(fen);
  if (chess.turn() !== capturedBy) return null;
  let played: ReturnType<Chess["move"]>;
  try {
    played = chess.move(move);
  } catch {
    return null;
  }
  if (!played.captured) return null;
  const canRecapture = chess
    .moves({ verbose: true })
    .some((reply) => reply.to === played.to && reply.captured);
  return {
    san: played.san,
    uci,
    net:
      pieceValue(played.captured) -
      (canRecapture ? pieceValue(played.piece) : 0),
  };
}

function sanLine(fen: string, pv: string[], limit = 2): string[] {
  const chess = new Chess(fen);
  const line: string[] = [];
  for (const uci of pv.slice(0, limit)) {
    const move = parseUciMove(uci);
    if (!move) break;
    try {
      line.push(chess.move(move).san);
    } catch {
      break;
    }
  }
  return line;
}

function materialLabel(centipawns: number): string {
  if (centipawns >= 900) return "a queen";
  if (centipawns >= 500) return "a rook";
  if (centipawns >= 300) return "a minor piece";
  return "material";
}

export function detectThreats(input: ThreatInput): Threat[] {
  const opponent = input.mover === "w" ? "b" : "w";
  const chess = new Chess(input.fen);
  if (chess.turn() !== opponent) return [];

  const threats: Threat[] = [];
  const first = input.pv[0];
  if (first) {
    const forced = captureGain(input.fen, first, opponent);
    const line = sanLine(input.fen, input.pv);
    if (line.length) {
      try {
        const mateCheck = new Chess(input.fen);
        const move = parseUciMove(first);
        if (move && mateCheck.move(move) && mateCheck.isCheckmate()) {
          threats.push({
            kind: "mate",
            forced: true,
            ply: input.ply,
            san: mateCheck.history().at(-1) ?? line[0],
            uci: first,
            line,
            description: `Forced mate: ${line[0]}.`,
            confidence: "high",
          });
        }
      } catch {
        // Invalid PV moves are ignored; heuristic threats still apply.
      }
    }
    if (forced && forced.net >= 300) {
      threats.push({
        kind: "material",
        forced: true,
        ply: input.ply,
        san: forced.san,
        uci: forced.uci,
        line,
        materialDelta: forced.net,
        description: `Forced material threat: ${forced.san} wins ${materialLabel(forced.net)}.`,
        confidence: "high",
      });
    }
  }

  for (const move of chess.moves({ verbose: true })) {
    if (!move.captured) continue;
    const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
    if (uci === first) continue;
    const gain = captureGain(input.fen, uci, opponent);
    if (!gain || gain.net < 300) continue;
    threats.push({
      kind: "hanging",
      forced: false,
      ply: input.ply,
      san: gain.san,
      uci,
      line: [gain.san],
      materialDelta: gain.net,
      description: `Heuristic warning: ${gain.san} wins ${materialLabel(gain.net)}.`,
      confidence: "medium",
    });
  }

  const unique = new Map<string, Threat>();
  for (const threat of threats.sort(
    (left, right) =>
      Number(right.kind === "mate") - Number(left.kind === "mate") ||
      (right.materialDelta ?? 0) - (left.materialDelta ?? 0) ||
      Number(right.forced) - Number(left.forced) ||
      left.ply - right.ply,
  )) {
    if (!unique.has(threat.uci)) unique.set(threat.uci, threat);
  }
  return [...unique.values()].slice(0, 3);
}
