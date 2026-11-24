import { GamesWorkspace } from "@/features/library/components/games-workspace";
import { LibraryShell } from "@/features/library/components/library-shell";

export default function LibraryGamesPage() {
  return (
    <LibraryShell
      title="My Games"
      description="Browse every game in this workspace, then turn your own mistakes into focused practice."
    >
      <GamesWorkspace />
    </LibraryShell>
  );
}
