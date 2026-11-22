import { describe, expect, it } from "vitest";
import {
  decodePgnFile,
  PGN_FILE_MAX_BYTES,
  PgnFileError,
} from "@/features/games/file-import";

function pgnFile(content: string | Uint8Array, name = "game.pgn") {
  return new File([content as BlobPart], name, { type: "text/plain" });
}

describe("decodePgnFile", () => {
  it("decodes UTF-8 text", async () => {
    const result = await decodePgnFile(pgnFile("1. e4 e5"));
    expect(result.text).toBe("1. e4 e5");
    expect(result.warnings).toEqual([]);
  });

  it("strips a UTF-8 BOM", async () => {
    const bytes = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode("1. e4"),
    ]);
    const result = await decodePgnFile(pgnFile(bytes));
    expect(result.text).toBe("1. e4");
  });

  it("falls back to Windows-1252 with a warning", async () => {
    const result = await decodePgnFile(
      pgnFile(new Uint8Array([0x31, 0x2e, 0x20, 0xe9])),
    );
    expect(result.text).toBe("1. é");
    expect(result.warnings[0]).toContain("Windows-1252");
  });

  it("rejects an empty file", async () => {
    await expect(decodePgnFile(pgnFile(""))).rejects.toBeInstanceOf(
      PgnFileError,
    );
  });

  it("rejects a file over the size limit", async () => {
    const oversized = new File(
      [new Uint8Array(PGN_FILE_MAX_BYTES + 1)],
      "big.pgn",
      {
        type: "text/plain",
      },
    );
    await expect(decodePgnFile(oversized)).rejects.toThrow(/too large/i);
  });

  it("rejects binary content", async () => {
    await expect(
      decodePgnFile(pgnFile(new Uint8Array([0x00, 0x01, 0x02]))),
    ).rejects.toBeInstanceOf(PgnFileError);
  });
});
