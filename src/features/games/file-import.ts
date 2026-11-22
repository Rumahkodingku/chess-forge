import { ValidationError } from "@/lib/errors";

export const PGN_FILE_MAX_BYTES = 5 * 1024 * 1024;

const ACCEPTED_TYPES = new Set([
  "",
  "text/plain",
  "application/x-chess-pgn",
  "application/pgn",
]);

export class PgnFileError extends ValidationError {
  constructor(
    message: string,
    recovery = "Choose a valid UTF-8 or Windows-1252 PGN file.",
  ) {
    super(message, recovery);
    this.name = "PgnFileError";
  }
}

export interface DecodedPgnFile {
  text: string;
  warnings: string[];
}

function fileExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

export async function decodePgnFile(file: File): Promise<DecodedPgnFile> {
  if (file.size === 0) {
    throw new PgnFileError("The selected file is empty.");
  }
  if (file.size > PGN_FILE_MAX_BYTES) {
    throw new PgnFileError(
      `The selected file is too large. The limit is ${(PGN_FILE_MAX_BYTES / 1024 / 1024).toFixed(0)} MB.`,
      "Choose a smaller PGN file or split it before importing.",
    );
  }
  if (!ACCEPTED_TYPES.has(file.type) && fileExtension(file.name) !== ".pgn") {
    throw new PgnFileError(
      "The selected file is not a PGN file.",
      "Choose a .pgn or plain-text file.",
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let text: string;
  const warnings: string[] = [];

  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      text = new TextDecoder("windows-1252", { fatal: true }).decode(bytes);
      warnings.push(
        "The file was decoded as Windows-1252 because it is not valid UTF-8.",
      );
    } catch {
      throw new PgnFileError(
        "The file encoding could not be decoded.",
        "Save the PGN as UTF-8 and try again.",
      );
    }
  }

  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  if (text.includes("\u0000")) {
    throw new PgnFileError(
      "The selected file contains binary data, not PGN text.",
      "Choose a plain-text PGN file.",
    );
  }
  if (!text.trim()) {
    throw new PgnFileError("The selected file contains no PGN text.");
  }

  return { text, warnings };
}
