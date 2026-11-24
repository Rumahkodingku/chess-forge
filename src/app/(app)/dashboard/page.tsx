import { ArrowUpRight, Database } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StoragePanel } from "@/components/shared/storage-panel";
import { Button } from "@/components/ui/button";
import { LibraryDashboardCard } from "@/features/dashboard/library-dashboard-card";
import { RecentWork } from "@/features/dashboard/recent-work";
import { BoardSvg } from "@/features/studio/rendering/board-svg";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const pipeline = [
  {
    label: "Import",
    detail: "PGN, Chess.com, Lichess",
    phase: "R2",
  },
  {
    label: "Analyse",
    detail: "Stockfish in a worker",
    phase: "R3",
  },
  {
    label: "Studio",
    detail: "Templates, timeline, scene editor",
    phase: "R5",
  },
  {
    label: "Export",
    detail: "Configured browser render",
    phase: "R6",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="One local workspace for the games you study and the videos you make from them. No account, no cloud project, no upload."
        actions={
          <Button asChild className="h-10 px-4">
            <Link href="/analysis">
              Open analysis
              <ArrowUpRight aria-hidden className="size-4" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]">
        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-surface-1">
          <div className="forge-rule h-px w-full" />
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)] lg:items-center">
            <div>
              <p className="text-[11px] font-medium text-brand">
                Start from the game
              </p>
              <h2 className="mt-3 max-w-lg text-balance text-[28px] leading-[1.08] font-semibold tracking-[-0.04em] text-foreground sm:text-[34px]">
                The board is the source of truth.
              </h2>
              <p className="mt-3 max-w-xl text-pretty text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
                ChessForge keeps the position, the move, and the exported frame
                connected. Import a game once, then study it and build scenes
                from the same local record.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild className="h-10 px-4">
                  <Link href="/analysis">Open analysis workspace</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 border-border/80 bg-transparent px-4"
                >
                  <Link href="/templates">See video directions</Link>
                </Button>
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                R2 imports paste, file, Chess.com, and Lichess games. R3 adds
                full game analysis. R4 renders deterministic scenes with camera,
                text, effects, and audio.
              </p>
            </div>
            <div className="mx-auto w-full max-w-[260px] rounded-xl border border-border/80 bg-surface-2 p-2.5 board-shadow lg:mx-0 lg:ml-auto">
              <BoardSvg
                fen={START_FEN}
                coordinates
                label="Starting chess position"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <StoragePanel />
          <LibraryDashboardCard />
          <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-surface-2 text-brand">
                <Database aria-hidden className="size-4" />
              </span>
              <div>
                <p className="text-[13px] font-medium text-foreground">
                  Local by design
                </p>
                <p className="text-[11px] text-muted-foreground">
                  The browser is the backend
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-3 text-[12px] leading-relaxed text-muted-foreground">
              <li>
                Games, projects, and templates live in IndexedDB on this device.
              </li>
              <li>
                Stockfish runs in a worker, never on the main interface thread.
              </li>
              <li>
                Video export uses the browser media stack and a local download.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="pipeline-title">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2
              id="pipeline-title"
              className="text-[15px] font-medium tracking-[-0.01em] text-foreground"
            >
              The working path
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Four stages, one local record. Phase labels show where each stage
              is built.
            </p>
          </div>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-xl border border-border/80 bg-border/80 sm:grid-cols-2 lg:grid-cols-4">
          {pipeline.map((step, index) => (
            <li key={step.label} className="bg-surface-1 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] text-muted-foreground">
                  0{index + 1}
                </span>
                <span className="rounded border border-border/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {step.phase}
                </span>
              </div>
              <p className="mt-3 text-[14px] font-medium text-foreground">
                {step.label}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {step.detail}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <RecentWork />
    </div>
  );
}
