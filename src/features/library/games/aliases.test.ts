import { describe, expect, it } from "vitest";
import { resolveUserSide } from "@/features/library/games/aliases";

const game = {
  metadata: {
    white: "Riot",
    black: "Opponent",
    result: "1-0",
  },
};

describe("player side aliases", () => {
  it("matches White", () => {
    expect(resolveUserSide(game, ["riot"])).toBe("w");
  });

  it("matches Black", () => {
    expect(resolveUserSide(game, ["  OPPONENT  "])).toBe("b");
  });

  it("returns null when both players match", () => {
    expect(resolveUserSide(game, ["Riot", "Opponent"])).toBeNull();
  });

  it("returns null when nobody matches", () => {
    expect(resolveUserSide(game, ["Someone"])).toBeNull();
  });

  it("collapses repeated whitespace", () => {
    expect(
      resolveUserSide({ metadata: { ...game.metadata, white: "Riot  User" } }, [
        "riot user",
      ]),
    ).toBe("w");
  });
});
