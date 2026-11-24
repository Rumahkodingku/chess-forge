import { describe, expect, it } from "vitest";
import {
  learningProgressSchema,
  libraryNoteSchema,
  repertoireLineSchema,
} from "@/features/library/schemas";

const now = "2026-11-24T00:00:00.000Z";

describe("library schemas", () => {
  it("parses a note with a stable target", () => {
    const note = libraryNoteSchema.parse({
      id: crypto.randomUUID(),
      targetType: "opening",
      targetId: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -",
      targetLabel: "King's Pawn (B00)",
      body: "Control the centre before developing.",
      tags: ["centre", "development"],
      pinned: false,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
    expect(note.targetType).toBe("opening");
  });

  it("rejects an empty note body", () => {
    expect(() =>
      libraryNoteSchema.parse({
        id: crypto.randomUUID(),
        targetType: "position",
        targetId: "fen",
        targetLabel: "Position",
        body: "   ",
        tags: [],
        pinned: false,
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1,
      }),
    ).toThrow();
  });

  it("parses a repertoire line", () => {
    const line = repertoireLineSchema.parse({
      id: crypto.randomUUID(),
      name: "Ruy Lopez main line",
      side: "white",
      eco: "C60",
      openingName: "Ruy Lopez",
      startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      moves: [
        { san: "e4", uci: "e2e4" },
        { san: "e5", uci: "e7e5" },
        { san: "Nf3", uci: "g1f3" },
      ],
      notes: "Build slowly.",
      priority: "core",
      tags: ["open game"],
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
    expect(line.moves).toHaveLength(3);
  });

  it("rejects a repertoire line without moves", () => {
    expect(() =>
      repertoireLineSchema.parse({
        id: crypto.randomUUID(),
        name: "Empty",
        side: "white",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        moves: [],
        notes: "",
        priority: "idea",
        tags: [],
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1,
      }),
    ).toThrow();
  });

  it("parses learning progress", () => {
    const progress = learningProgressSchema.parse({
      id: "puzzle:00sHx",
      itemType: "puzzle",
      itemId: "00sHx",
      attempts: 1,
      correct: 1,
      streak: 1,
      intervalDays: 1,
      nextReviewAt: now,
      lastResult: "correct",
      lastReviewedAt: now,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
    expect(progress.itemType).toBe("puzzle");
  });
});
