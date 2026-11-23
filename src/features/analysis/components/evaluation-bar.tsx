"use client";

import {
  evaluationBarShare,
  formatEvaluationForPerspective,
} from "@/features/analysis/evaluation";
import type {
  AnalysisPerspective,
  Evaluation,
} from "@/features/analysis/types";
import { cn } from "@/lib/utils";

interface EvaluationBarProps {
  evaluation: Evaluation;
  sideToMove: "w" | "b";
  perspective: AnalysisPerspective;
  className?: string;
}

export function EvaluationBar({
  evaluation,
  sideToMove,
  perspective,
  className,
}: EvaluationBarProps) {
  const share = evaluationBarShare(evaluation);
  const numeric = formatEvaluationForPerspective(
    evaluation,
    sideToMove,
    perspective,
  );
  const flip = perspective === "side-to-move" && sideToMove === "b";
  const perspectiveLabel =
    perspective === "white" ? "White perspective" : "Side-to-move perspective";

  return (
    <div
      role="img"
      aria-label={`${perspectiveLabel}, ${numeric}, White share ${Math.round(share * 100)} percent`}
      className={cn("flex w-7 shrink-0 flex-col items-center gap-1", className)}
    >
      <span className="font-mono text-[10px] leading-none text-foreground">
        {numeric}
      </span>
      <div className="relative w-3 flex-1 overflow-hidden rounded-sm border border-border/70 bg-zinc-800">
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-zinc-100 transition-[height] duration-300",
            flip && "rotate-180",
          )}
          style={{ height: `${share * 100}%` }}
        />
      </div>
      <span className="text-center text-[8px] leading-tight text-muted-foreground">
        {perspective === "white" ? "White" : "STM"}
      </span>
    </div>
  );
}
