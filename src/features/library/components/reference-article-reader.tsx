"use client";

import { CheckCircle2, ChevronLeft, Loader2, StickyNote } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ChessgroundBoard } from "@/features/chess/chessground-board";
import {
  initialProgress,
  reviewProgress,
} from "@/features/library/practice/review";
import {
  getReferenceArticle,
  type ReferenceArticle,
} from "@/features/library/reference";
import type { LibraryNote } from "@/features/library/schemas";
import {
  createLearningProgressRepository,
  createLibraryNoteRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { toErrorMessage } from "@/lib/errors";

function ArticleBlock({
  block,
}: {
  block: ReferenceArticle["blocks"][number];
}) {
  if (block.type === "heading") {
    return (
      <h2 className="mt-6 text-[18px] font-semibold tracking-[-0.02em] text-foreground">
        {block.text}
      </h2>
    );
  }
  if (block.type === "paragraph") {
    return (
      <p className="text-[14px] leading-7 text-foreground/90">{block.text}</p>
    );
  }
  if (block.type === "list") {
    return (
      <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-foreground/90">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "callout") {
    return (
      <div className="rounded-lg border border-brand/30 bg-brand/10 p-3 text-[12px] leading-relaxed text-brand">
        {block.text}
      </div>
    );
  }
  return (
    <figure className="space-y-2">
      <div className="mx-auto max-w-[420px] overflow-hidden rounded-lg border border-border/80 bg-black p-2">
        <ChessgroundBoard
          fen={block.fen}
          orientation={block.orientation === "b" ? "b" : "w"}
          label={block.caption}
        />
      </div>
      <figcaption className="text-center text-[11px] text-muted-foreground">
        {block.caption}
      </figcaption>
    </figure>
  );
}

export function ReferenceArticleReader({ slug }: { slug: string }) {
  const currentArticle = getReferenceArticle(slug);
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState<LibraryNote | null>(null);
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!currentArticle) return;
      try {
        const db = await openChessForgeDatabase();
        const notes = await createLibraryNoteRepository(db).listByTarget(
          "article",
          currentArticle.slug,
        );
        const first = notes[0];
        if (!cancelled) {
          setNote(first?.body ?? "");
          setSavedNote(first ?? null);
          const progress = await createLearningProgressRepository(db).get(
            "reference",
            currentArticle.slug,
          );
          if (!cancelled) setComplete(Boolean(progress?.correct));
        }
      } catch (error) {
        if (!cancelled) toast.error(toErrorMessage(error));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [currentArticle]);

  if (!currentArticle) {
    return (
      <div className="rounded-xl border border-border/80 bg-surface-1 p-6 text-[12px] text-muted-foreground">
        Article not found.
      </div>
    );
  }

  const article = currentArticle;

  async function saveNote() {
    setSaving(true);
    try {
      const db = await openChessForgeDatabase();
      const now = new Date().toISOString();
      const record: LibraryNote = {
        id: savedNote?.id ?? crypto.randomUUID(),
        targetType: "article",
        targetId: article.slug,
        targetLabel: article.title,
        body: note,
        tags: savedNote?.tags ?? [],
        pinned: savedNote?.pinned ?? false,
        createdAt: savedNote?.createdAt ?? now,
        updatedAt: now,
        schemaVersion: 1,
      };
      await createLibraryNoteRepository(db).save(record);
      setSavedNote(record);
      toast.success("Article note saved.");
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function markComplete() {
    try {
      const db = await openChessForgeDatabase();
      const repository = createLearningProgressRepository(db);
      const existing = await repository.get("reference", article.slug);
      await repository.save(
        reviewProgress(
          existing ?? initialProgress("reference", article.slug),
          true,
        ),
      );
      setComplete(true);
      toast.success("Article marked complete.");
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
      <article className="space-y-4 rounded-xl border border-border/80 bg-surface-1 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{article.category}</Badge>
          <Badge variant="outline">{article.difficulty}</Badge>
          <span className="text-[11px] text-muted-foreground">
            {article.readingMinutes} min read
          </span>
        </div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em] text-foreground">
          {article.title}
        </h1>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          {article.summary}
        </p>
        <div className="space-y-4">
          {article.blocks.map((block, index) => (
            <ArticleBlock key={`${block.type}-${index}`} block={block} />
          ))}
        </div>
        <div className="rounded-lg border border-border/80 bg-surface-2/60 p-4">
          <h2 className="text-[13px] font-medium text-foreground">
            Key takeaways
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[12px] leading-relaxed text-muted-foreground">
            {article.keyTakeaways.map((takeaway) => (
              <li key={takeaway}>{takeaway}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            variant="outline"
            className="h-9 border-border/80 bg-transparent px-3"
          >
            <Link href="/library/reference">
              <ChevronLeft aria-hidden className="size-3.5" />
              All articles
            </Link>
          </Button>
          <Button
            type="button"
            className="h-9 px-3"
            onClick={() => void markComplete()}
            disabled={complete}
          >
            <CheckCircle2 aria-hidden className="size-3.5" />
            {complete ? "Completed" : "Mark complete"}
          </Button>
        </div>
      </article>

      <aside className="space-y-4">
        <Card className="border-border/80 bg-surface-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[14px]">
              <StickyNote aria-hidden className="size-4 text-brand" />
              Your note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What will you try in your next game?"
              aria-label="Article note"
              className="min-h-28"
            />
            <Button
              type="button"
              className="h-9 px-3"
              onClick={() => void saveNote()}
              disabled={saving || !note.trim()}
            >
              {saving ? (
                <Loader2 aria-hidden className="size-3.5 animate-spin" />
              ) : null}
              Save note
            </Button>
          </CardContent>
        </Card>
        {article.related.length ? (
          <Card className="border-border/80 bg-surface-1">
            <CardHeader>
              <CardTitle className="text-[14px]">Related</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {article.related.map((item) => (
                <p
                  key={`${item.type}-${item.id}`}
                  className="rounded-md border border-border/70 bg-surface-2/60 px-3 py-2 text-[11px] text-muted-foreground"
                >
                  <span className="text-foreground">{item.label}</span> ·{" "}
                  {item.type}
                </p>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}
