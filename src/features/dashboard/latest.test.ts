import { describe, expect, it } from "vitest";
import {
  latestByUpdatedAt,
  recentByUpdatedAt,
} from "@/features/dashboard/latest";

describe("latestByUpdatedAt", () => {
  it("returns the most recently updated record", () => {
    const items = [
      { id: "older", updatedAt: "2024-01-01T00:00:00.000Z" },
      { id: "newer", updatedAt: "2024-01-02T00:00:00.000Z" },
    ];
    expect(latestByUpdatedAt(items)?.id).toBe("newer");
  });

  it("returns undefined for an empty list", () => {
    expect(latestByUpdatedAt([])).toBeUndefined();
  });
});

describe("recentByUpdatedAt", () => {
  it("sorts newest first and caps the list", () => {
    const items = Array.from({ length: 7 }, (_, index) => ({
      id: index,
      updatedAt: `2024-01-0${index + 1}T00:00:00.000Z`,
    }));
    expect(recentByUpdatedAt(items, 5).map((item) => item.id)).toEqual([
      6, 5, 4, 3, 2,
    ]);
  });
});
