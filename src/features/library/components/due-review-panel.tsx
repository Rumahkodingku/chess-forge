"use client";

import { Clock3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { LearningProgress } from "@/features/library/schemas";
import {
  createLearningProgressRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";

const LABELS: Record<LearningProgress["itemType"], string> = {
  puzzle: "Puzzle",
  "repertoire-line": "Repertoire line",
  "opening-recall": "Opening recall",
  reference: "Reference article",
  "game-mistake": "Game mistake",
};

function hrefFor(item: LearningProgress): string {
  if (item.itemType === "repertoire-line") {
    return `/library/repertoire/${item.itemId}`;
  }
  if (item.itemType === "reference") {
    return `/library/reference/${item.itemId}`;
  }
  return "/library/practice";
}

export function DueReviewPanel() {
  const [items, setItems] = useState<LearningProgress[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const due = await createLearningProgressRepository(db).listDue();
        if (!cancelled) setItems(due);
      } catch {
        // The practice modes remain usable if the due list cannot load.
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
      <p className="flex items-center gap-2 text-[12px] font-medium text-foreground">
        <Clock3 aria-hidden className="size-4 text-brand" />
        Due review
        <span className="rounded-full border border-border/80 px-2 py-0.5 text-[10px] text-muted-foreground">
          {items.length}
        </span>
      </p>
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {items.slice(0, 10).map((item) => (
          <Link
            key={item.id}
            href={hrefFor(item)}
            className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-surface-2/60 px-3 py-2 text-[11px] transition-colors hover:border-border-strong"
          >
            <span className="text-foreground">{LABELS[item.itemType]}</span>
            <span className="truncate text-muted-foreground">
              {item.itemId}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
