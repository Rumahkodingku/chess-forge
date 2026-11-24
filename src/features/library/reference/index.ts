import { endgameArticles } from "@/features/library/reference/articles/endgame";
import { middlegameArticles } from "@/features/library/reference/articles/middlegame";
import { strategyArticles } from "@/features/library/reference/articles/strategy";
import { tacticsArticles } from "@/features/library/reference/articles/tactics";
import {
  type ReferenceArticle,
  referenceArticleListSchema,
} from "@/features/library/reference/schema";

export type { ReferenceArticle } from "@/features/library/reference/schema";

export const REFERENCE_ARTICLES: ReferenceArticle[] =
  referenceArticleListSchema.parse([
    ...strategyArticles,
    ...tacticsArticles,
    ...middlegameArticles,
    ...endgameArticles,
  ]);

let cached: ReferenceArticle[] | null = null;

export function getReferenceArticles(): ReferenceArticle[] {
  if (!cached) cached = REFERENCE_ARTICLES;
  return cached;
}

export function getReferenceArticle(
  slug: string,
): ReferenceArticle | undefined {
  return getReferenceArticles().find((article) => article.slug === slug);
}

export function searchReferenceArticles(query: string): ReferenceArticle[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return getReferenceArticles();
  return getReferenceArticles().filter((article) => {
    const text = [
      article.title,
      article.summary,
      ...article.blocks.map((block) =>
        block.type === "paragraph" ||
        block.type === "heading" ||
        block.type === "callout"
          ? block.text
          : block.type === "list"
            ? block.items.join(" ")
            : block.caption,
      ),
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(normalized);
  });
}
