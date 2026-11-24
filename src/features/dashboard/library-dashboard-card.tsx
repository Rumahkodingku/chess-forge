"use client";

import { BookOpen, Brain, StickyNote } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createLearningProgressRepository,
  createLibraryNoteRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";

export function LibraryDashboardCard() {
  const [due, setDue] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const [progress, notes] = await Promise.all([
          createLearningProgressRepository(db).listDue(),
          createLibraryNoteRepository(db).listAll(),
        ]);
        if (!cancelled) {
          setDue(progress.length);
          setNote(notes[0]?.body ?? null);
        }
      } catch {
        // The dashboard card is optional; keep the rest of the page usable.
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-surface-2 text-brand">
          <BookOpen aria-hidden className="size-4" />
        </span>
        <div>
          <p className="text-[13px] font-medium text-foreground">
            Chess Library
          </p>
          <p className="text-[11px] text-muted-foreground">
            Study, repertoire, and practice
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Brain aria-hidden className="size-3" />
            Due reviews
          </p>
          <p className="mt-1 text-[20px] font-semibold text-foreground">
            {due}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <StickyNote aria-hidden className="size-3" />
            Latest note
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-foreground">
            {note ?? "No notes yet"}
          </p>
        </div>
      </div>
      <Button
        asChild
        variant="outline"
        className="mt-4 h-9 border-border/80 bg-transparent px-3"
      >
        <Link href="/library">Open Library</Link>
      </Button>
    </div>
  );
}
