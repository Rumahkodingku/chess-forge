import {
  type LibraryPuzzle,
  puzzleFileSchema,
} from "@/features/library/schemas";

let cached: LibraryPuzzle[] | null = null;

export async function loadLibraryPuzzles(): Promise<LibraryPuzzle[]> {
  if (cached) return cached;
  const module = await import("./puzzles.generated.json");
  const parsed = puzzleFileSchema.parse(module.default);
  cached = parsed.puzzles;
  return cached;
}
