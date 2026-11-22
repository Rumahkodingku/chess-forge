import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ImportWorkspace } from "@/features/games/import-workspace";

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analysis"
        description="Import one game, replay it, and choose the move worth turning into a video. Every source is previewed before it is saved."
      />
      <Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-xl border border-border/70 bg-surface-1" />
        }
      >
        <ImportWorkspace />
      </Suspense>
    </div>
  );
}
