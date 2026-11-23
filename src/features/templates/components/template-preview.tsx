"use client";

import { BoardSvg } from "@/features/studio/rendering/board-svg";
import type { Template } from "@/features/templates/types";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const SOURCE_LABEL: Record<
  Template["sceneRules"]["defaultSourceMode"],
  string
> = {
  full: "Full game",
  moments: "Critical moments",
  range: "Selected range",
};

export function TemplatePreview({ template }: { template: Template }) {
  return (
    <div className="grid gap-4 rounded-xl border border-border/80 bg-surface-1 p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div className="rounded-lg border border-border/70 bg-surface-2 p-2">
        <BoardSvg
          fen={START_FEN}
          theme={template.style.boardTheme}
          coordinates={template.style.coordinates}
          label={`${template.name} representative frame`}
        />
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[18px] font-semibold tracking-[-0.02em]">
            {template.name}
          </h3>
          <span className="rounded border border-border/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {template.isBuiltIn ? "Built-in" : `Custom v${template.version}`}
          </span>
          <span className="rounded border border-brand/30 bg-brand/10 px-1.5 py-0.5 text-[10px] text-brand">
            {SOURCE_LABEL[template.sceneRules.defaultSourceMode]}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
          {template.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
          <span className="rounded border border-border/70 px-2 py-1">
            {template.sceneRules.movesPerScene} ply/scene
          </span>
          <span className="rounded border border-border/70 px-2 py-1">
            {template.defaultCanvas.aspectRatio}
          </span>
          <span className="rounded border border-border/70 px-2 py-1 capitalize">
            {template.style.boardTheme}
          </span>
          <span className="rounded border border-border/70 px-2 py-1">
            {template.style.audio.sceneSfx.length} scene SFX
          </span>
        </div>
      </div>
    </div>
  );
}
