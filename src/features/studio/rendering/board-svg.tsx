"use client";

import { Chess, type Color, type PieceSymbol } from "chess.js";
import { useMemo } from "react";
import type {
  AnimatedBoardPiece,
  CapturedBoardPiece,
} from "@/features/studio/rendering/board-state";
import type {
  Annotation,
  BoardTheme,
} from "@/features/studio/scene/scene.types";
import { cn } from "@/lib/utils";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

const THEMES: Record<
  BoardTheme,
  { light: string; dark: string; lastMove: string; check: string }
> = {
  forge: {
    light: "#c9b28a",
    dark: "#5f4b39",
    lastMove: "rgba(232, 180, 90, 0.22)",
    check: "rgba(248, 113, 113, 0.38)",
  },
  classic: {
    light: "#f0d9b5",
    dark: "#b58863",
    lastMove: "rgba(232, 180, 90, 0.28)",
    check: "rgba(248, 113, 113, 0.38)",
  },
};

const ANNOTATION_COLORS: Record<Annotation["color"], string> = {
  brand: "#e8b45a",
  red: "#f87171",
  green: "#4ade80",
  blue: "#60a5fa",
  white: "#f4f4f5",
};

interface BoardSvgProps {
  fen: string;
  orientation?: "w" | "b";
  theme?: BoardTheme;
  lastMove?: string;
  checkSquare?: string;
  checkmate?: boolean;
  animations?: AnimatedBoardPiece[];
  captured?: CapturedBoardPiece;
  flashSquare?: string;
  moveProgress?: number;
  focus?: boolean;
  focusSquares?: string[];
  annotations?: Annotation[];
  frame?: number;
  coordinates?: boolean;
  label?: string;
  className?: string;
}

function squareToGrid(square: string, orientation: "w" | "b") {
  const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = RANKS.indexOf(square[1] as (typeof RANKS)[number]);
  if (file < 0 || rank < 0) return { column: 0, row: 0 };
  return orientation === "w"
    ? { column: file, row: rank }
    : { column: 7 - file, row: 7 - rank };
}

function isBoardSquare(square: string | undefined): square is string {
  return (
    square !== undefined &&
    square.length === 2 &&
    FILES.includes(square[0] as (typeof FILES)[number]) &&
    RANKS.includes(square[1] as (typeof RANKS)[number])
  );
}

function pieceFile(color: Color, type: PieceSymbol) {
  return `/pieces/cburnett/${color}${type.toUpperCase()}.svg`;
}

function annotationMarkerId(annotation: Annotation): string {
  return `r4-arrow-${annotation.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export function BoardSvg({
  fen,
  orientation = "w",
  theme = "forge",
  lastMove,
  checkSquare,
  checkmate = false,
  animations = [],
  captured,
  flashSquare,
  moveProgress = 0,
  focus = false,
  focusSquares = [],
  annotations = [],
  frame = 0,
  coordinates = false,
  label = "Chess position",
  className,
}: BoardSvgProps) {
  const colors = THEMES[theme];
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
  const movingSquares = useMemo(
    () => new Set(animations.map((animation) => animation.from)),
    [animations],
  );
  const focusSet = useMemo(() => new Set(focusSquares), [focusSquares]);
  const visibleAnnotations = useMemo(
    () =>
      annotations
        .filter(
          (annotation) =>
            frame >= annotation.startFrame &&
            frame < annotation.startFrame + annotation.durationInFrames,
        )
        .filter((annotation) => {
          if (annotation.type === "arrow") {
            return (
              isBoardSquare(annotation.from) && isBoardSquare(annotation.to)
            );
          }
          const square =
            annotation.square ??
            (annotation.type === "highlight" ? annotation.to : undefined);
          return isBoardSquare(square);
        }),
    [annotations, frame],
  );
  const flashOpacity =
    flashSquare && moveProgress >= 0.8 ? ((moveProgress - 0.8) / 0.2) * 0.4 : 0;
  const captureOpacity = captured
    ? Math.max(0, 1 - captured.progress / 0.4)
    : 0;
  const flashPosition = flashSquare
    ? squareToGrid(flashSquare, orientation)
    : undefined;

  return (
    <svg
      viewBox="0 0 800 800"
      role="img"
      aria-label={label}
      className={cn("block h-auto w-full select-none", className)}
    >
      <defs>
        {visibleAnnotations
          .filter((annotation) => annotation.type === "arrow")
          .map((annotation) => (
            <marker
              key={annotation.id}
              id={annotationMarkerId(annotation)}
              orient="auto"
              markerWidth="4"
              markerHeight="4"
              refX="2.1"
              refY="2"
            >
              <path
                d="M0,0 V4 L3,2 Z"
                fill={ANNOTATION_COLORS[annotation.color]}
              />
            </marker>
          ))}
      </defs>
      <rect width="800" height="800" rx="18" fill={colors.dark} />
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
          const isMoving = movingSquares.has(square);
          const isCaptured = captured?.square === square;
          const isFocus = !focus || focusSet.size === 0 || focusSet.has(square);

          return (
            <g key={square}>
              <rect
                x={x}
                y={y}
                width="100"
                height="100"
                fill={isLight ? colors.light : colors.dark}
              />
              {isLastMove ? (
                <rect
                  x={x}
                  y={y}
                  width="100"
                  height="100"
                  fill={colors.lastMove}
                />
              ) : null}
              {!isFocus ? (
                <rect
                  x={x}
                  y={y}
                  width="100"
                  height="100"
                  fill="rgba(0,0,0,0.45)"
                />
              ) : null}
              {focus && focusSet.has(square) ? (
                <rect
                  x={x + 4}
                  y={y + 4}
                  width="92"
                  height="92"
                  fill="none"
                  stroke="#e8b45a"
                  strokeWidth="4"
                />
              ) : null}
              {isCheck ? (
                <circle
                  cx={x + 50}
                  cy={y + 50}
                  r={checkmate ? 48 : 42}
                  fill={colors.check}
                  stroke={
                    checkmate
                      ? "rgba(232,180,90,0.95)"
                      : "rgba(248,113,113,0.7)"
                  }
                  strokeWidth={checkmate ? 5 : 2}
                />
              ) : null}
              {piece && !isMoving && !isCaptured ? (
                <image
                  href={pieceFile(piece.color, piece.type)}
                  x={x + 6}
                  y={y + 6}
                  width="88"
                  height="88"
                  opacity={isFocus ? 1 : 0.45}
                />
              ) : null}
              {isCaptured ? (
                <image
                  href={pieceFile(captured.color, captured.type)}
                  x={x + 6}
                  y={y + 6}
                  width="88"
                  height="88"
                  opacity={captureOpacity * (isFocus ? 1 : 0.45)}
                />
              ) : null}
              {coordinates && row === 7 ? (
                <text
                  x={x + 92}
                  y={y + 92}
                  textAnchor="end"
                  fontSize="13"
                  fill={isLight ? colors.dark : colors.light}
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
                  fill={isLight ? colors.dark : colors.light}
                  opacity="0.8"
                >
                  {RANKS[rankIndex]}
                </text>
              ) : null}
            </g>
          );
        }),
      )}
      {animations.map((animation) => {
        const moving = squareToGrid(animation.from, orientation);
        const target = squareToGrid(animation.to, orientation);
        const progress = Math.min(Math.max(animation.progress, 0), 1);
        return (
          <image
            key={`${animation.from}-${animation.to}`}
            data-moving-piece
            href={pieceFile(animation.color, animation.type)}
            x={
              6 +
              (moving.column * 100 +
                (target.column - moving.column) * 100 * progress)
            }
            y={
              6 +
              (moving.row * 100 + (target.row - moving.row) * 100 * progress)
            }
            width="88"
            height="88"
          />
        );
      })}
      {flashPosition && flashOpacity > 0 ? (
        <rect
          x={flashPosition.column * 100}
          y={flashPosition.row * 100}
          width="100"
          height="100"
          fill="rgba(255,255,255,0.8)"
          opacity={flashOpacity}
        />
      ) : null}
      {visibleAnnotations.map((annotation) => {
        const opacity = annotation.opacity ?? 1;
        if (annotation.type === "arrow" && annotation.from && annotation.to) {
          const from = squareToGrid(annotation.from, orientation);
          const to = squareToGrid(annotation.to, orientation);
          return (
            <line
              key={annotation.id}
              x1={from.column * 100 + 50}
              y1={from.row * 100 + 50}
              x2={to.column * 100 + 50}
              y2={to.row * 100 + 50}
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              markerEnd={`url(#${annotationMarkerId(annotation)})`}
              opacity={opacity}
              style={{ color: ANNOTATION_COLORS[annotation.color] }}
            />
          );
        }
        const square =
          annotation.square ??
          (annotation.type === "highlight" ? annotation.to : undefined);
        if (!square) return null;
        const { column, row } = squareToGrid(square, orientation);
        if (annotation.type === "square") {
          return (
            <rect
              key={annotation.id}
              x={column * 100 + 6}
              y={row * 100 + 6}
              width="88"
              height="88"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              opacity={opacity}
              style={{ color: ANNOTATION_COLORS[annotation.color] }}
            />
          );
        }
        return (
          <rect
            key={annotation.id}
            x={column * 100}
            y={row * 100}
            width="100"
            height="100"
            fill="currentColor"
            opacity={opacity * 0.32}
            style={{ color: ANNOTATION_COLORS[annotation.color] }}
          />
        );
      })}
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
