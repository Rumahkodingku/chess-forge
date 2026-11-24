"use client";

import { BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getReferenceArticles,
  searchReferenceArticles,
} from "@/features/library/reference";

const CATEGORIES = [
  ["all", "All"],
  ["strategy", "Strategy"],
  ["tactics", "Tactics"],
  ["middlegame", "Middlegame"],
  ["endgame", "Endgame"],
] as const;

export function ReferenceWorkspace() {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number][0]>("all");
  const [difficulty, setDifficulty] = useState("all");
  const deferred = useDeferredValue(query);
  const articles = deferred.trim()
    ? searchReferenceArticles(deferred)
    : getReferenceArticles();
  const visible = articles.filter(
    (article) =>
      (category === "all" || article.category === category) &&
      (difficulty === "all" || article.difficulty === difficulty),
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search reference articles"
          aria-label="Search reference articles"
          className="h-10 pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-1 rounded-xl border border-border/80 bg-surface-1 p-1">
        {CATEGORIES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setCategory(value)}
            aria-current={category === value ? "page" : undefined}
            className={`min-h-9 rounded-lg px-3 text-[12px] font-medium ${
              category === value
                ? "bg-brand/15 text-brand"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="max-w-48">
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger aria-label="Filter reference by difficulty">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any difficulty</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((article) => (
          <Link key={article.slug} href={`/library/reference/${article.slug}`}>
            <article className="h-full rounded-xl border border-border/80 bg-surface-1 p-4 transition-colors hover:border-border-strong">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline">{article.category}</Badge>
                <span className="text-[10px] text-muted-foreground">
                  {article.readingMinutes} min
                </span>
              </div>
              <h2 className="mt-3 text-[15px] font-medium text-foreground">
                {article.title}
              </h2>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                {article.summary}
              </p>
              <p className="mt-3 flex items-center gap-1 text-[11px] text-brand">
                <BookOpen aria-hidden className="size-3.5" />
                Read article
              </p>
            </article>
          </Link>
        ))}
      </div>
      {!visible.length ? (
        <div className="rounded-xl border border-border/80 bg-surface-1 p-6 text-center text-[12px] text-muted-foreground">
          No article matches this search.
        </div>
      ) : null}
    </div>
  );
}
