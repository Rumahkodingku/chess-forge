import { describe, expect, it } from "vitest";
import { latestByUpdatedAt } from "@/features/dashboard/latest";

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
