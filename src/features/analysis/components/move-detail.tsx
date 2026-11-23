"use client";

import { Button } from "@/components/ui/button";
import { ClassificationBadge } from "@/features/analysis/components/classification-badge";
import { formatEvaluationForPerspective } from "@/features/analysis/evaluation";
import type {
  AnalysisPerspective,
  BrilliantDecision,
  MoveAssessment,
} from "@/features/analysis/types";
import { displayMoveClassification } from "@/features/analysis/types";
import { nagLabels } from "@/features/chess/nags";
import type { Move } from "@/features/games/types";

function moveLabel(move: Move) {
  return `${move.fullMoveNumber}${move.color === "w" ? "." : "..."} ${move.san}`;
}

function mateTransition(assessment: MoveAssessment): string | undefined {
  if (
    assessment.evaluationBefore.type !== "mate" &&
    assessment.evaluationAfter.type !== "mate"
  ) {
    return undefined;
  }
  return `${formatEvaluationForPerspective(assessment.evaluationBefore, "w", "white")} -> ${formatEvaluationForPerspective(assessment.evaluationAfter, "w", "white")}`;
}

interface MoveDetailProps {
  move?: Move;
  assessment?: MoveAssessment;
  sideToMove: "w" | "b";
  perspective: AnalysisPerspective;
  decisionBusy?: boolean;
  onDecision?: (decision: BrilliantDecision) => void;
}

export function MoveDetail({
  move,
  assessment,
  sideToMove,
  perspective,
  decisionBusy = false,
  onDecision,
}: MoveDetailProps) {
  if (!move) {
    return (
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Starting position selected. Choose a move to see its classification,
        comment, NAGs, threats, and variations.
      </p>
    );
  }

  const nags = nagLabels(move.nags);
  const transition = assessment ? mateTransition(assessment) : undefined;
  const afterSideToMove: "w" | "b" = sideToMove === "w" ? "b" : "w";
  const displayClassification = assessment
    ? displayMoveClassification(assessment)
    : undefined;

  return (
    <dl className="space-y-3 text-[11px]">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Move</dt>
        <dd className="font-mono text-[14px] font-medium text-foreground">
          {moveLabel(move)}
        </dd>
        <dd className="font-mono text-[10px] text-muted-foreground">
          {move.uci}
        </dd>
        {displayClassification ? (
          <ClassificationBadge classification={displayClassification} />
        ) : null}
        {assessment &&
        displayClassification &&
        displayClassification !== assessment.classification ? (
          <span className="rounded border border-border/70 px-1.5 py-0.5 text-[9px] text-muted-foreground">
            Base: {assessment.classification}
          </span>
        ) : null}
      </div>

      {assessment ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded border border-border/70 bg-surface-2/60 px-2 py-1.5">
            <dt className="text-muted-foreground">Evaluation before</dt>
            <dd className="mt-1 font-mono text-[13px] text-foreground">
              {formatEvaluationForPerspective(
                assessment.evaluationBefore,
                sideToMove,
                perspective,
              )}
            </dd>
          </div>
          <div className="rounded border border-border/70 bg-surface-2/60 px-2 py-1.5">
            <dt className="text-muted-foreground">Evaluation after</dt>
            <dd className="mt-1 font-mono text-[13px] text-foreground">
              {formatEvaluationForPerspective(
                assessment.evaluationAfter,
                afterSideToMove,
                perspective,
              )}
            </dd>
          </div>
          <div className="rounded border border-border/70 bg-surface-2/60 px-2 py-1.5">
            <dt className="text-muted-foreground">
              {transition ? "Mate transition" : "Centipawn loss"}
            </dt>
            <dd className="mt-1 font-mono text-[12px] text-foreground">
              {transition ?? assessment.centipawnLoss ?? "n/a"}
            </dd>
          </div>
          <div className="rounded border border-border/70 bg-surface-2/60 px-2 py-1.5">
            <dt className="text-muted-foreground">Confidence</dt>
            <dd className="mt-1 text-[12px] text-foreground">
              {assessment.confidence}
            </dd>
          </div>
        </div>
      ) : null}

      {assessment?.caveat ? (
        <p className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 leading-relaxed text-amber-200">
          {assessment.caveat}
        </p>
      ) : null}

      {assessment ? (
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {assessment.engineVersion} · depth {assessment.depth} ·{" "}
          {assessment.engineConfiguration.movetimeMs
            ? `${assessment.engineConfiguration.movetimeMs} ms`
            : `depth ${assessment.engineConfiguration.depth ?? 14}`}
        </p>
      ) : null}

      {assessment?.candidateBrilliant ? (
        <div className="rounded border border-fuchsia-500/30 bg-fuchsia-500/10 p-3">
          <p className="text-[11px] leading-relaxed text-fuchsia-100">
            Candidate Brilliant. This is a conservative heuristic, not an
            official classification.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 px-3"
              disabled={decisionBusy || !onDecision}
              onClick={() => onDecision?.("accepted")}
            >
              Accept brilliant
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-border/80 bg-transparent px-3"
              disabled={decisionBusy || !onDecision}
              onClick={() => onDecision?.("rejected")}
            >
              Reject
            </Button>
            {assessment.brilliantDecision &&
            assessment.brilliantDecision !== "pending" ? (
              <span className="self-center text-[10px] text-muted-foreground">
                Current: {assessment.brilliantDecision}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {assessment?.threats?.length ? (
        <div>
          <dt className="text-muted-foreground">Threats</dt>
          <dd className="mt-1 space-y-1.5">
            {assessment.threats.map((threat) => (
              <div
                key={`${threat.ply}-${threat.uci}-${threat.kind}`}
                className="rounded border border-border/70 bg-surface-2/60 px-2 py-1.5"
              >
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    {threat.san}
                  </span>
                  <span className="rounded border border-border/70 px-1 py-0.5 text-[9px] text-muted-foreground">
                    {threat.forced
                      ? "Forced by engine line"
                      : "Heuristic warning"}
                  </span>
                </p>
                <p className="mt-1 leading-relaxed text-muted-foreground">
                  {threat.description}
                </p>
                {threat.line.length > 1 ? (
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {threat.line.join(" ")}
                  </p>
                ) : null}
              </div>
            ))}
          </dd>
        </div>
      ) : null}

      {nags.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <dt className="text-muted-foreground">NAG</dt>
          <dd className="flex flex-wrap gap-1">
            {nags.map((nag, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: labels repeat, index keeps duplicates distinct.
                key={`${nag}-${index}`}
                className="rounded border border-brand/30 bg-brand/10 px-1.5 py-0.5 font-mono text-[10px] text-brand"
              >
                {nag}
              </span>
            ))}
          </dd>
        </div>
      ) : null}

      {move.comment ? (
        <div>
          <dt className="text-muted-foreground">Comment</dt>
          <dd className="mt-1 leading-relaxed text-foreground">
            {move.comment}
          </dd>
        </div>
      ) : null}

      {move.variations?.length ? (
        <div>
          <dt className="text-muted-foreground">Variations</dt>
          <dd className="mt-1 space-y-1">
            {move.variations.map((variation, index) => (
              <p
                // biome-ignore lint/suspicious/noArrayIndexKey: variation lines are read-only text.
                key={`${variation}-${index}`}
                className="rounded border border-border/70 bg-surface-2/60 px-2 py-1.5 font-mono leading-relaxed text-muted-foreground"
              >
                {variation}
              </p>
            ))}
          </dd>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded border border-border/70 bg-surface-2/60 px-2 py-1.5">
          <dt className="text-muted-foreground">FEN before</dt>
          <dd className="mt-1 break-all font-mono text-[10px] leading-relaxed text-foreground">
            {move.fenBefore}
          </dd>
        </div>
        <div className="rounded border border-border/70 bg-surface-2/60 px-2 py-1.5">
          <dt className="text-muted-foreground">FEN after</dt>
          <dd className="mt-1 break-all font-mono text-[10px] leading-relaxed text-foreground">
            {move.fenAfter}
          </dd>
        </div>
      </div>
    </dl>
  );
}
