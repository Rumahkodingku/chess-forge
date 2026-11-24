import { GameInsightsWorkspace } from "@/features/library/components/game-insights-workspace";
import { LibraryShell } from "@/features/library/components/library-shell";

export default async function LibraryGameInsightsPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return (
    <LibraryShell
      title="Game insights"
      description="See what the engine found, then turn your own mistakes into a focused drill."
    >
      <GameInsightsWorkspace gameId={gameId} />
    </LibraryShell>
  );
}
