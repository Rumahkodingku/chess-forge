import {
  ArrowUpRight,
  Clapperboard,
  Layers,
  SlidersHorizontal,
  Type,
} from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

const panels = [
  {
    label: "Preview",
    detail: "The exact composition that will render.",
    icon: Clapperboard,
    phase: "R4",
  },
  {
    label: "Timeline",
    detail: "Scenes, duration, and tracks.",
    icon: Layers,
    phase: "R5",
  },
  {
    label: "Inspector",
    detail: "Camera, highlights, text, and audio.",
    icon: SlidersHorizontal,
    phase: "R5",
  },
  {
    label: "Type",
    detail: "Safe-area checked titles and captions.",
    icon: Type,
    phase: "R4",
  },
];

export default function StudioPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Studio"
        description="Turn a game or a selected moment into a timed chess scene. The studio is editor-first, not a one-click preset."
        actions={
          <Button
            asChild
            variant="outline"
            className="h-10 border-border/80 bg-transparent px-4"
          >
            <Link href="/templates">Browse directions</Link>
          </Button>
        }
      />

      <section className="rounded-xl border border-border/80 bg-surface-1 p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)] lg:items-center">
          <div>
            <p className="text-[11px] font-medium text-brand">
              Editor foundation
            </p>
            <h2 className="mt-3 max-w-lg text-balance text-[28px] leading-[1.08] font-semibold tracking-[-0.04em] sm:text-[32px]">
              A project needs a game before it can become a video.
            </h2>
            <p className="mt-3 max-w-xl text-pretty text-[13px] leading-relaxed text-muted-foreground">
              The studio route is intentionally empty in R0. It will consume the
              same scene model used by the export proof, so preview and export
              stay aligned.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild className="h-10 px-4">
                <Link href="/analysis">Start from analysis</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-10 border-border/80 bg-transparent px-4"
              >
                <Link href="/labs/export">Open export lab</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {panels.map((panel) => {
              const Icon = panel.icon;
              return (
                <div
                  key={panel.label}
                  className="rounded-lg border border-border/80 bg-surface-2 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Icon aria-hidden className="size-4 text-brand" />
                    <span className="text-[10px] text-muted-foreground">
                      {panel.phase}
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] font-medium text-foreground">
                    {panel.label}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {panel.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/80 bg-surface-1 p-4">
        <div className="mb-4">
          <h2 className="text-[14px] font-medium text-foreground">
            Scene sequence
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            No project open. Create one after a game is imported.
          </p>
        </div>
        <EmptyState
          title="Nothing to edit yet"
          description="A scene sequence is generated from a full game or selected moments in R5. Until then, the export proof renders one legal move to a real file."
          action={
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link href="/labs/export">
                See the export proof
                <ArrowUpRight aria-hidden className="size-3.5" />
              </Link>
            </Button>
          }
        />
      </section>
    </div>
  );
}
