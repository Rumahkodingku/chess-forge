import { LibraryShell } from "@/features/library/components/library-shell";
import { PracticeWorkspace } from "@/features/library/components/practice-workspace";

export default function LibraryPracticePage() {
  return (
    <LibraryShell
      title="Practice"
      description="Train tactics, rehearse your repertoire, and test opening recognition. Progress stays in this browser."
    >
      <PracticeWorkspace />
    </LibraryShell>
  );
}
