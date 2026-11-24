"use client";

import { BookOpen, Brain, StickyNote } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createLearningProgressRepository,
  createLibraryNoteRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";

export function LibraryOverview() {
  const [due, setDue] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [completed, setCompleted] = useState(0);
  const [continueSlug, setContinueSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const [progress, notes] = await Promise.all([
          createLearningProgressRepository(db).listAll(),
          createLibraryNoteRepository(db).listAll(),
        ]);
        if (cancelled) return;
        setDue(
          progress.filter(
            (item) => item.nextReviewAt <= new Date().toISOString(),
          ).length,
        );
        setCompleted(
          progress.filter(
            (item) => item.itemType === "reference" && item.correct > 0,
          ).length,
        );
        setNote(notes[0]?.body ?? null);
        const lastReference = [...progress]
          .filter((item) => item.itemType === "reference")
          .sort((left, right) =>
            (right.lastReviewedAt ?? "").localeCompare(
              left.lastReviewedAt ?? "",
            ),
          )[0];
        setContinueSlug(lastReference?.itemId ?? null);
      } catch {
        // Overview is optional; the rest of the Library still works.
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Brain aria-hidden className="size-3.5" />
          Due reviews
        </p>
        <p className="mt-1 text-[24px] font-semibold text-foreground">{due}</p>
      </div>
      <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <BookOpen aria-hidden className="size-3.5" />
          Articles completed
        </p>
        <p className="mt-1 text-[24px] font-semibold text-foreground">
          {completed}
        </p>
      </div>
      <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <StickyNote aria-hidden className="size-3.5" />
          Latest note
        </p>
        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-foreground">
          {note ?? "No notes yet"}
        </p>
      </div>
      <Link
        href={
          continueSlug
            ? `/library/reference/${continueSlug}`
            : "/library/reference"
        }
        className="rounded-xl border border-border/80 bg-surface-1 p-4 transition-colors hover:border-border-strong"
      >
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <BookOpen aria-hidden className="size-3.5" />
          Continue reading
        </p>
        <p className="mt-1 text-[12px] font-medium text-foreground">
          {continueSlug ? "Resume the last article" : "Open the reference"}
        </p>
      </Link>
    </div>
  );
}
