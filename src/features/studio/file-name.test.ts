import { describe, expect, it } from "vitest";
import { projectFileName } from "@/features/studio/file-name";

describe("projectFileName", () => {
  it("sanitises a project name", () => {
    expect(projectFileName("White vs Black", "webm")).toBe(
      "white-vs-black.webm",
    );
  });

  it("falls back when the name has no usable characters", () => {
    expect(projectFileName("!!!", "mp4")).toBe("chessforge-project.mp4");
  });
});
