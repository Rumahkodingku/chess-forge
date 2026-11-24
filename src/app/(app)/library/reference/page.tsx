import { LibraryShell } from "@/features/library/components/library-shell";
import { ReferenceWorkspace } from "@/features/library/components/reference-workspace";

export default function LibraryReferencePage() {
  return (
    <LibraryShell
      title="Reference"
      description="Original study notes on strategy, tactics, middlegames, and endgames. Read one idea at a time and connect it to practice."
    >
      <ReferenceWorkspace />
    </LibraryShell>
  );
}
