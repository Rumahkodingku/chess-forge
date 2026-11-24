import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import {
  getReferenceArticle,
  getReferenceArticles,
  searchReferenceArticles,
} from "@/features/library/reference";

describe("reference library", () => {
  it("loads 30 articles with unique slugs and categories", () => {
    const articles = getReferenceArticles();
    expect(articles).toHaveLength(30);
    expect(new Set(articles.map((article) => article.slug)).size).toBe(30);
    expect(
      articles.filter((article) => article.category === "strategy"),
    ).toHaveLength(8);
    expect(
      articles.filter((article) => article.category === "tactics"),
    ).toHaveLength(8);
    expect(
      articles.filter((article) => article.category === "middlegame"),
    ).toHaveLength(7);
    expect(
      articles.filter((article) => article.category === "endgame"),
    ).toHaveLength(7);
  });

  it("has valid diagram FENs", () => {
    for (const article of getReferenceArticles()) {
      for (const block of article.blocks) {
        if (block.type === "diagram") {
          expect(() => new Chess(block.fen)).not.toThrow();
        }
      }
      expect(article.keyTakeaways.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps every article in the long-form word range", () => {
    for (const article of getReferenceArticles()) {
      const text = article.blocks
        .flatMap((block) =>
          block.type === "paragraph" ||
          block.type === "heading" ||
          block.type === "callout"
            ? [block.text]
            : block.type === "list"
              ? block.items
              : [],
        )
        .join(" ");
      const words = text.split(/\s+/).filter(Boolean).length;
      expect(words, article.slug).toBeGreaterThanOrEqual(700);
      expect(words, article.slug).toBeLessThanOrEqual(1000);
    }
  });

  it("finds an article by slug and search", () => {
    expect(getReferenceArticle("pins-absolute-and-relative")?.title).toBe(
      "Pins: Absolute and Relative",
    );
    expect(searchReferenceArticles("Lucena").length).toBeGreaterThanOrEqual(1);
  });
});
