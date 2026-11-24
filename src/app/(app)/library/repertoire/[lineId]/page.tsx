import { LibraryShell } from "@/features/library/components/library-shell";
import { RepertoireDetail } from "@/features/library/components/repertoire-detail";

export default async function LibraryRepertoireDetailPage({
  params,
}: {
  params: Promise<{ lineId: string }>;
}) {
  const { lineId } = await params;
  return (
    <LibraryShell
      title="Repertoire line"
      description="Step through the line and review the reason behind it."
    >
      <RepertoireDetail key={lineId} lineId={lineId} />
    </LibraryShell>
  );
}
