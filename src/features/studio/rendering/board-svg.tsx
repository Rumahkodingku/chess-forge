"use client";

import { Chess, type Color, type PieceSymbol } from "chess.js";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

const LIGHT_SQUARE = "#c9b28a";
const DARK_SQUARE = "#5f4b39";
const LAST_MOVE = "rgba(232, 180, 90, 0.22)";
const CHECK = "rgba(248, 113, 113, 0.35)";

export interface BoardMoveAnimation {
  from: string;
  to: string;
  color: Color;
  type: PieceSymbol;
  progress: number;
}

interface BoardSvgProps {
  fen: string;
  orientation?: "w" | "b";
  lastMove?: string;
  checkSquare?: string;
  animation?: BoardMoveAnimation;
  hideSquare?: string;
  className?: string;
  coordinates?: boolean;
  label?: string;
}

function squareToGrid(square: string, orientation: "w" | "b") {
  const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = RANKS.indexOf(square[1] as (typeof RANKS)[number]);
  if (file < 0 || rank < 0) return { column: 0, row: 0 };
  return orientation === "w"
    ? { column: file, row: rank }
    : { column: 7 - file, row: 7 - rank };
}

function pieceFile(color: Color, type: PieceSymbol) {
  return `/pieces/cburnett/${color}${type.toUpperCase()}.svg`;
}

export function BoardSvg({
  fen,
  orientation = "w",
  lastMove,
  checkSquare,
  animation,
  hideSquare,
  className,
  coordinates = false,
  label = "Chess position",
}: BoardSvgProps) {
  const board = useMemo(() => {
    try {
      return new Chess(fen).board();
    } catch {
      return new Chess().board();
    }
  }, [fen]);

  const lastMoveSquares = useMemo(() => {
    if (!lastMove || lastMove.length < 4) return new Set<string>();
    return new Set([lastMove.slice(0, 2), lastMove.slice(2, 4)]);
  }, [lastMove]);

  const hiddenSquare = hideSquare ?? (animation ? animation.to : undefined);
  const moving = animation
    ? squareToGrid(animation.from, orientation)
    : undefined;
  const target = animation
    ? squareToGrid(animation.to, orientation)
    : undefined;
  const progress = animation ? Math.min(Math.max(animation.progress, 0), 1) : 0;

  return (
    <svg
      viewBox="0 0 800 800"
      role="img"
      aria-label={label}
      className={cn("block h-auto w-full select-none", className)}
    >
      <rect width="800" height="800" rx="18" fill={DARK_SQUARE} />
      {board.map((rank, rankIndex) =>
        rank.map((piece, fileIndex) => {
          const square = `${FILES[fileIndex]}${RANKS[rankIndex]}`;
          const { column, row } =
            orientation === "w"
              ? { column: fileIndex, row: rankIndex }
              : { column: 7 - fileIndex, row: 7 - rankIndex };
          const isLight = (fileIndex + rankIndex) % 2 === 0;
          const x = column * 100;
          const y = row * 100;
          const isLastMove = lastMoveSquares.has(square);
          const isCheck = checkSquare === square;
          const isHidden = hiddenSquare === square && piece !== null;

          return (
            <g key={square}>
              <rect
                x={x}
                y={y}
                width="100"
                height="100"
                fill={isLight ? LIGHT_SQUARE : DARK_SQUARE}
              />
              {isLastMove ? (
                <rect x={x} y={y} width="100" height="100" fill={LAST_MOVE} />
              ) : null}
              {isCheck ? (
                <circle
                  cx={x + 50}
                  cy={y + 50}
                  r="42"
                  fill={CHECK}
                  stroke="rgba(248,113,113,0.7)"
                  strokeWidth="2"
                />
              ) : null}
              {piece && !isHidden ? (
                <image
                  href={pieceFile(piece.color, piece.type)}
                  x={x + 6}
                  y={y + 6}
                  width="88"
                  height="88"
                />
              ) : null}
              {coordinates && row === 7 ? (
                <text
                  x={x + 92}
                  y={y + 92}
                  textAnchor="end"
                  fontSize="13"
                  fill={isLight ? DARK_SQUARE : LIGHT_SQUARE}
                  opacity="0.8"
                >
                  {FILES[fileIndex]}
                </text>
              ) : null}
              {coordinates && column === 0 ? (
                <text
                  x={x + 8}
                  y={y + 20}
                  fontSize="13"
                  fill={isLight ? DARK_SQUARE : LIGHT_SQUARE}
                  opacity="0.8"
                >
                  {RANKS[rankIndex]}
                </text>
              ) : null}
            </g>
          );
        }),
      )}
      {animation && moving && target ? (
        <image
          href={pieceFile(animation.color, animation.type)}
          x={
            6 +
            (moving.column * 100 +
              (target.column - moving.column) * 100 * progress)
          }
          y={
            6 + (moving.row * 100 + (target.row - moving.row) * 100 * progress)
          }
          width="88"
          height="88"
        />
      ) : null}
      <rect
        x="1"
        y="1"
        width="798"
        height="798"
        rx="18"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="2"
      />
    </svg>
  );
}
