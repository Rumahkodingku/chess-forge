import { describe, expect, it } from "vitest";
import { isUuid } from "@/lib/validation";

describe("isUuid", () => {
  it("accepts a generated UUID", () => {
    expect(isUuid(crypto.randomUUID())).toBe(true);
  });

  it("rejects malformed route IDs", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});
