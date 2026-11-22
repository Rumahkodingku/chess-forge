import { PageHeader } from "@/components/layout/page-header";
import { ImportGameForm } from "@/features/games/import-game-form";

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analysis"
        description="Import one game, replay it, and choose the move worth turning into a video. R1 keeps the path deliberately narrow."
      />
      <ImportGameForm />
    </div>
  );
}
