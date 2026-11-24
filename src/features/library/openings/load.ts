import {
  loadOpeningEntries,
  type OpeningEntry,
} from "@/features/analysis/openings/lookup";
import {
  buildOpeningTree,
  type OpeningTree,
} from "@/features/library/openings/tree";

let cachedEntries: OpeningEntry[] | null = null;
let cachedTree: OpeningTree | null = null;

export async function loadLibraryOpenings(): Promise<{
  entries: OpeningEntry[];
  tree: OpeningTree;
}> {
  if (cachedEntries && cachedTree) {
    return { entries: cachedEntries, tree: cachedTree };
  }
  const entries = await loadOpeningEntries();
  cachedEntries = entries;
  cachedTree = buildOpeningTree(entries);
  return { entries, tree: cachedTree };
}
