"use client";

import { Chess } from "chess.js";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import type { Config } from "chessground/config";
import type { Key } from "chessground/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AnalysisBoardTheme } from "@/features/chess/theme";
import { cn } from "@/lib/utils";

interface ChessgroundBoardProps {
  fen: string;
  orientation: "w" | "b";
  lastMove?: string;
  theme?: AnalysisBoardTheme;
  label?: string;
  className?: string;
  onMove?: (from: string, to: string) => void;
}

export function ChessgroundBoard({
  fen,
  orientation,
  lastMove,
  theme = "forge",
  label = "Chess position",
  className,
  onMove,
}: ChessgroundBoardProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const [failed, setFailed] = useState(false);

  const position = useMemo(() => {
    try {
      const chess = new Chess(fen);
      const dests = new Map<Key, Key[]>();
      for (const move of chess.moves({ verbose: true })) {
        const from = move.from as Key;
        const to = move.to as Key;
        const existing = dests.get(from) ?? [];
        if (!existing.includes(to)) existing.push(to);
        dests.set(from, existing);
      }
      return { valid: true, check: chess.inCheck(), dests };
    } catch {
      return { valid: false, check: false, dests: new Map<Key, Key[]>() };
    }
  }, [fen]);

  useEffect(() => {
    if (!elementRef.current || !position.valid || failed) return;

    const config: Config = {
      fen,
      orientation: orientation === "w" ? "white" : "black",
      lastMove: lastMove
        ? ([lastMove.slice(0, 2), lastMove.slice(2, 4)] as Key[])
        : undefined,
      check: position.check,
      coordinates: true,
      coordinatesOnSquares: true,
      viewOnly: false,
      ...(onMove
        ? {
            movable: {
              free: false,
              color: fen.split(" ")[1] === "b" ? "black" : "white",
              dests: position.dests,
              showDests: true,
            },
            events: {
              move: (from: Key, to: Key) => onMove(from, to),
            },
          }
        : {}),
      highlight: {
        lastMove: true,
        check: true,
      },
      animation: {
        enabled: true,
        duration: 180,
      },
      drawable: {
        enabled: true,
        visible: true,
        defaultSnapToValidMove: false,
        eraseOnClick: true,
      },
    };

    if (!apiRef.current) {
      try {
        apiRef.current = Chessground(elementRef.current, config);
      } catch {
        setFailed(true);
        return;
      }
    } else {
      apiRef.current.set(config);
      apiRef.current.setShapes([]);
    }
  }, [failed, fen, lastMove, onMove, orientation, position]);

  useEffect(() => {
    return () => {
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, []);

  if (!position.valid) {
    return (
      <div
        role="alert"
        className={cn(
          "flex aspect-square w-full items-center justify-center rounded-[10px] border border-destructive/40 bg-destructive/10 p-4 text-center text-[12px] leading-relaxed text-destructive",
          className,
        )}
      >
        This position cannot be displayed because its FEN is invalid.
      </div>
    );
  }

  if (failed) {
    return (
      <div
        role="alert"
        className={cn(
          "flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-[10px] border border-destructive/40 bg-destructive/10 p-4 text-center text-[12px] leading-relaxed text-destructive",
          className,
        )}
      >
        <p>The replay board could not load.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            apiRef.current?.destroy();
            apiRef.current = null;
            setFailed(false);
          }}
        >
          Retry board
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={elementRef}
      role="img"
      aria-label={label}
      className={cn(`cg-theme-${theme}`, "cg-replay", className)}
    />
  );
}
