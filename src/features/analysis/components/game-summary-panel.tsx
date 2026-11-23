"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClassificationBadge } from "@/features/analysis/components/classification-badge";
import type {
  GameSummary,
  MoveClassification,
} from "@/features/analysis/types";

const COUNT_ORDER: MoveClassification[] = [
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
];

interface GameSummaryPanelProps {
  summary: GameSummary;
  analysed: boolean;
  onJump: (ply: number) => void;
}

export function GameSummaryPanel({
  summary,
  analysed,
  onJump,
}: GameSummaryPanelProps) {
  return (
    <Card className="border-border/80 bg-surface-1">
      <CardHeader>
        <CardTitle className="text-[15px]">Game summary</CardTitle>
        <CardDescription>
          {analysed
            ? `${summary.limitLabel} · ${summary.engineVersion} · MultiPV ${summary.multiPv}`
            : "Run full-game analysis to build the summary."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COUNT_ORDER.map((classification) => (
            <div
              key={classification}
              className="rounded border border-border/70 bg-surface-2/60 px-2 py-2"
            >
              <p className="text-[10px] capitalize text-muted-foreground">
                {classification}
              </p>
              <p className="mt-1 font-mono text-[16px] text-foreground">
                {summary.classificationCounts[classification]}
              </p>
            </div>
          ))}
          <div className="rounded border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-2">
            <p className="text-[10px] text-fuchsia-200">Candidate Brilliant</p>
            <p className="mt-1 font-mono text-[16px] text-fuchsia-100">
              {summary.candidateBrilliantCount}
            </p>
          </div>
          <div className="rounded border border-fuchsia-400/40 bg-fuchsia-500/15 px-2 py-2">
            <p className="text-[10px] text-fuchsia-200">Accepted Brilliant</p>
            <p className="mt-1 font-mono text-[16px] text-fuchsia-100">
              {summary.acceptedBrilliantCount}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Opening and phases
          </p>
          <p className="text-[12px] text-foreground">
            {summary.opening
              ? `${summary.opening.name} (${summary.opening.eco})`
              : "Unknown opening"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {summary.phases.map((phase) => (
              <Button
                key={`${phase.phase}-${phase.startPly}`}
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-border/80 bg-transparent px-2.5 text-[10px] capitalize"
                onClick={() => onJump(phase.startPly)}
              >
                {phase.phase} · ply {phase.startPly}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">Critical moments</p>
          {summary.criticalMoments.length ? (
            <div className="space-y-1.5">
              {summary.criticalMoments.map((moment) => (
                <button
                  key={`${moment.ply}-${moment.san}`}
                  type="button"
                  onClick={() => onJump(moment.ply)}
                  className="flex w-full items-center justify-between gap-3 rounded border border-border/70 bg-surface-2/60 px-2.5 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[11px] text-foreground">
                      {moment.san}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                      {moment.reason}
                    </span>
                  </span>
                  <ClassificationBadge
                    classification={moment.classification}
                    compact
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No critical moment passed the threshold.
            </p>
          )}
        </div>

        {summary.notableThreats.length ? (
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground">Notable threats</p>
            {summary.notableThreats.map((threat) => (
              <p
                key={`${threat.ply}-${threat.uci}`}
                className="rounded border border-border/70 bg-surface-2/60 px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground"
              >
                <span className="font-mono text-foreground">{threat.san}</span>{" "}
                · {threat.forced ? "forced" : "heuristic"} ·{" "}
                {threat.description}
              </p>
            ))}
          </div>
        ) : null}

        <p className="rounded border border-border/70 bg-surface-2/60 p-3 text-[11px] leading-relaxed text-foreground">
          {summary.text}
        </p>

        <ul className="space-y-1 text-[10px] leading-relaxed text-muted-foreground">
          {summary.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
