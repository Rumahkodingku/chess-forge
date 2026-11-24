import { LibraryShell } from "@/features/library/components/library-shell";
import { OpeningExplorer } from "@/features/library/components/opening-explorer";

export default function LibraryOpeningsPage() {
  return (
    <LibraryShell
      title="Opening Explorer"
      description="Explore named opening lines, documented continuations, and the positions behind them. Everything is bundled and works offline."
    >
      <OpeningExplorer />
    </LibraryShell>
  );
}
