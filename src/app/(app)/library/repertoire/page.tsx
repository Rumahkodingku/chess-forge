import { LibraryShell } from "@/features/library/components/library-shell";
import { RepertoireWorkspace } from "@/features/library/components/repertoire-workspace";

export default function LibraryRepertoirePage() {
  return (
    <LibraryShell
      title="Repertoire"
      description="Save the lines you want to play, rank them by priority, and keep the reasons behind each choice."
    >
      <RepertoireWorkspace />
    </LibraryShell>
  );
}
