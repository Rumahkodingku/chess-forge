import { LibraryShell } from "@/features/library/components/library-shell";
import { ReferenceArticleReader } from "@/features/library/components/reference-article-reader";

export default async function LibraryReferenceArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <LibraryShell
      title="Reference article"
      description="Read the idea, study the diagram, and leave one note you can use."
    >
      <ReferenceArticleReader key={slug} slug={slug} />
    </LibraryShell>
  );
}
