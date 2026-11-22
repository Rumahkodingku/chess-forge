import { ArrowUpRight, Cpu, FileText, ListTree } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { BoardSvg } from "@/features/studio/rendering/board-svg";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analysis"
        description="Replay a game, inspect the engine line, and mark the moments worth forging. This workspace is intentionally empty until a game is imported."
        actions={
          <Button
            asChild
            variant="outline"
            className="h-10 border-border/80 bg-transparent px-4"
          >
            <Link href="/labs/pgn">Test PGN parser</Link>
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        <section className="rounded-xl border border-border/80 bg-surface-1 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-medium text-foreground">
                Position
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                No game loaded. Showing the standard starting position.
              </p>
            </div>
            <span className="rounded border border-border/80 px-2 py-1 text-[10px] text-muted-foreground">
              Preview only
            </span>
          </div>
          <div className="mx-auto max-w-[560px] rounded-xl border border-border/80 bg-surface-2 p-3 board-shadow">
            <BoardSvg
              fen={START_FEN}
              coordinates
              label="Starting chess position"
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {["First", "Previous", "Next"].map((label) => (
              <button
                key={label}
                type="button"
                disabled
                className="h-10 rounded-md border border-border/70 bg-surface-2/60 text-[12px] text-muted-foreground"
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Navigation controls unlock after R2 imports a game. They are shown
            here as disabled controls, not as working buttons.
          </p>
        </section>

        <div className="space-y-5">
          <section className="rounded-xl border border-border/80 bg-surface-1 p-4">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-surface-2 text-brand">
                <Cpu aria-hidden className="size-4" />
              </span>
              <div>
                <h2 className="text-[13px] font-medium text-foreground">
                  Engine panel
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Stockfish runs in a worker
                </p>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              The full evaluation bar, best move, and principal variation arrive
              in R3. A working engine proof is available in the technical lab.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 h-9">
              <Link href="/labs/engine">Open engine lab</Link>
            </Button>
          </section>

          <section className="rounded-xl border border-border/80 bg-surface-1 p-4">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-surface-2 text-brand">
                <ListTree aria-hidden className="size-4" />
              </span>
              <div>
                <h2 className="text-[13px] font-medium text-foreground">
                  Move list
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Waiting for a game
                </p>
              </div>
            </div>
            <div className="mt-3">
              <EmptyState
                title="No moves to list"
                description="Import a PGN in R2 to populate the move list, classifications, and critical moments."
              />
            </div>
          </section>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
            <FileText aria-hidden className="size-4 text-brand" />
            Import path
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            Manual PGN, PGN files, Chess.com, and Lichess are planned for R2.
            The PGN parser proof already runs locally in the lab.
          </p>
          <Link
            href="/labs/pgn"
            className="mt-3 inline-flex min-h-9 items-center gap-1 text-[12px] font-medium text-brand hover:underline"
          >
            Run the parser
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        </div>
        <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
            <Cpu aria-hidden className="size-4 text-brand" />
            Engine path
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            The Stockfish worker proof checks UCI loading, MultiPV, mate scores,
            and stop behaviour before the full analysis workspace is built.
          </p>
          <Link
            href="/labs/engine"
            className="mt-3 inline-flex min-h-9 items-center gap-1 text-[12px] font-medium text-brand hover:underline"
          >
            Run the engine
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
