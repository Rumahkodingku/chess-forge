import type { DisplayMoveClassification } from "@/features/analysis/types";
import { cn } from "@/lib/utils";

const LABELS: Record<DisplayMoveClassification, string> = {
  best: "Best",
  excellent: "Excellent",
  good: "Good",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
  "candidate-brilliant": "Candidate Brilliant",
  brilliant: "Brilliant",
};

// Text stays visible so colour is never the only quality signal.
const TONES: Record<DisplayMoveClassification, string> = {
  best: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  excellent: "border-teal-500/40 bg-teal-500/10 text-teal-300",
  good: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  inaccuracy: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  mistake: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  blunder: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  "candidate-brilliant":
    "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300",
  brilliant: "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200",
};

interface ClassificationBadgeProps {
  classification: DisplayMoveClassification;
  compact?: boolean;
  className?: string;
}

export function ClassificationBadge({
  classification,
  compact = false,
  className,
}: ClassificationBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] leading-4 font-medium whitespace-nowrap",
        TONES[classification],
        compact && "px-1 text-[8px]",
        className,
      )}
      title={LABELS[classification]}
    >
      <span aria-hidden className="size-1 rounded-full bg-current" />
      {LABELS[classification]}
    </span>
  );
}
