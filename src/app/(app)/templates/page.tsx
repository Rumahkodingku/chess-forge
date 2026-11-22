import { ArrowUpRight, Layers } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { BoardSvg } from "@/features/studio/rendering/board-svg";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const templates = [
  {
    name: "Tactical Breakdown",
    description:
      "Arrows and square highlights lead the explanation. Built for a move-by-move read.",
    note: "Annotation heavy",
  },
  {
    name: "Brilliant Move",
    description:
      "A tight, dramatic beat around one candidate brilliant move and its consequence.",
    note: "Single moment",
  },
  {
    name: "Checkmate Sequence",
    description:
      "The final moves, checkmate emphasis, and a clean result card.",
    note: "Endgame focus",
  },
  {
    name: "Minimalist Analysis",
    description:
      "Quiet board, small captions, no music. The position carries the scene.",
    note: "Low decoration",
  },
  {
    name: "Opening Tutorial",
    description:
      "ECO and opening name, calm pacing, and a move list that stays readable.",
    note: "Study format",
  },
  {
    name: "Game Recap",
    description:
      "Metadata, critical moments, and the result in a short review arc.",
    note: "Summary format",
  },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        description="Seven built-in directions will ship in R5. Each one is a data-driven set of scene rules, not a fixed video."
        actions={
          <Button
            asChild
            variant="outline"
            className="h-10 border-border/80 bg-transparent px-4"
          >
            <Link href="/studio">Open studio</Link>
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border border-border/80 bg-surface-1">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(280px,1fr)] lg:items-center">
          <div className="order-2 lg:order-1">
            <div className="flex items-center gap-2">
              <span className="rounded border border-brand/30 bg-brand/10 px-2 py-1 text-[10px] font-medium text-brand">
                Featured direction
              </span>
              <span className="text-[10px] text-muted-foreground">R5</span>
            </div>
            <h2 className="mt-4 text-balance text-[30px] leading-[1.06] font-semibold tracking-[-0.04em] sm:text-[36px]">
              Cinematic Chess
            </h2>
            <p className="mt-3 max-w-lg text-pretty text-[13px] leading-relaxed text-muted-foreground">
              A dark stage, a board that holds the frame, and text that arrives
              only when it adds information. The template provides defaults; the
              project keeps its own overrides.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded border border-border/80 px-2 py-1 text-[10px] text-muted-foreground">
                Camera presets
              </span>
              <span className="rounded border border-border/80 px-2 py-1 text-[10px] text-muted-foreground">
                Title and end card
              </span>
              <span className="rounded border border-border/80 px-2 py-1 text-[10px] text-muted-foreground">
                Music slot
              </span>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              Template selection and project overrides are implemented in R5.
              This page is a preview of the direction, not a working apply
              control.
            </p>
          </div>
          <div className="order-1 mx-auto w-full max-w-[380px] rounded-xl border border-border/80 bg-surface-2 p-3 board-shadow lg:order-2 lg:ml-auto">
            <BoardSvg
              fen={START_FEN}
              coordinates
              label="Starting position in the Cinematic Chess direction"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="template-list-title">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2
              id="template-list-title"
              className="flex items-center gap-2 text-[15px] font-medium text-foreground"
            >
              <Layers aria-hidden className="size-4 text-brand" />
              The other six
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Planned for the R5 template engine. All seven share one versioned
              schema.
            </p>
          </div>
        </div>
        <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/80 bg-surface-1">
          {templates.map((template, index) => (
            <li
              key={template.name}
              className="grid gap-2 p-4 sm:grid-cols-[44px_minmax(0,1fr)_130px] sm:items-center"
            >
              <span className="font-mono text-[11px] text-muted-foreground">
                0{index + 1}
              </span>
              <div>
                <p className="text-[13px] font-medium text-foreground">
                  {template.name}
                </p>
                <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
                  {template.description}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <span className="rounded border border-border/80 px-2 py-1 text-[10px] text-muted-foreground">
                  {template.note}
                </span>
                <span className="text-[10px] text-muted-foreground">R5</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Built-in templates stay read-only. Applying one creates project-level
          overrides, so updating a template later does not silently rewrite an
          existing video.
        </p>
        <Link
          href="/studio"
          className="mt-3 inline-flex min-h-9 items-center gap-1 text-[12px] font-medium text-brand hover:underline"
        >
          See the studio dependency
          <ArrowUpRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
