export function projectFileName(
  name: string,
  extension: "webm" | "mp4",
): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "chessforge-project"}.${extension}`;
}
