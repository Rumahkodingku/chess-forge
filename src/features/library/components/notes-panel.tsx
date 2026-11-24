"use client";

import { Pin, PinOff, Plus, StickyNote, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  LibraryNote,
  LibraryNoteTargetType,
} from "@/features/library/schemas";
import {
  createLibraryNoteRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { toErrorMessage } from "@/lib/errors";

interface NotesPanelProps {
  targetType: LibraryNoteTargetType;
  targetId: string;
  targetLabel: string;
}

export function NotesPanel({
  targetType,
  targetId,
  targetLabel,
}: NotesPanelProps) {
  const [notes, setNotes] = useState<LibraryNote[]>([]);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<LibraryNote | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const db = await openChessForgeDatabase();
    setNotes(
      await createLibraryNoteRepository(db).listByTarget(targetType, targetId),
    );
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const next = await createLibraryNoteRepository(db).listByTarget(
          targetType,
          targetId,
        );
        if (!cancelled) setNotes(next);
      } catch (error) {
        if (!cancelled) toast.error(toErrorMessage(error));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [targetId, targetType]);

  async function save() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const db = await openChessForgeDatabase();
      const now = new Date().toISOString();
      await createLibraryNoteRepository(db).save({
        id: editing?.id ?? crypto.randomUUID(),
        targetType,
        targetId,
        targetLabel,
        body,
        tags: editing?.tags ?? [],
        pinned: editing?.pinned ?? false,
        createdAt: editing?.createdAt ?? now,
        updatedAt: now,
        schemaVersion: 1,
      });
      setBody("");
      setEditing(null);
      await reload();
      toast.success(editing ? "Note updated." : "Note saved.");
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function togglePin(note: LibraryNote) {
    try {
      const db = await openChessForgeDatabase();
      await createLibraryNoteRepository(db).save({
        ...note,
        pinned: !note.pinned,
        updatedAt: new Date().toISOString(),
      });
      await reload();
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  }

  async function remove(note: LibraryNote) {
    try {
      const db = await openChessForgeDatabase();
      await createLibraryNoteRepository(db).delete(note.id);
      await reload();
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  }

  return (
    <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
      <h2 className="flex items-center gap-2 text-[13px] font-medium text-foreground">
        <StickyNote aria-hidden className="size-4 text-brand" />
        Notes
      </h2>
      <div className="mt-3 space-y-2">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a study note"
          aria-label="New note"
          className="min-h-20 text-[12px]"
        />
        <Button
          type="button"
          size="sm"
          className="h-8 px-2.5"
          onClick={() => void save()}
          disabled={busy || !body.trim()}
        >
          <Plus aria-hidden className="size-3.5" />
          Add note
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        {notes.map((note) => (
          <div
            key={note.id}
            className="rounded-lg border border-border/70 bg-surface-2/60 p-2.5"
          >
            <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">
              {note.body}
            </p>
            <div className="mt-2 flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px]"
                onClick={() => void togglePin(note)}
              >
                {note.pinned ? (
                  <PinOff aria-hidden className="size-3" />
                ) : (
                  <Pin aria-hidden className="size-3" />
                )}
                {note.pinned ? "Unpin" : "Pin"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px]"
                onClick={() => {
                  setEditing(note);
                  setBody(note.body);
                }}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px] text-destructive"
                onClick={() => void remove(note)}
              >
                <Trash2 aria-hidden className="size-3" />
                Delete
              </Button>
            </div>
          </div>
        ))}
        {!notes.length ? (
          <p className="text-[11px] text-muted-foreground">No notes yet.</p>
        ) : null}
      </div>
    </div>
  );
}
