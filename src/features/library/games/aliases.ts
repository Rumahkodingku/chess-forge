import type { Game } from "@/features/games/types";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveUserSide(
  game: Pick<Game, "metadata">,
  playerNames: string[],
): "w" | "b" | null {
  const aliases = new Set(
    playerNames.map(normalize).filter((name) => name.length > 0),
  );
  const white = aliases.has(normalize(game.metadata.white));
  const black = aliases.has(normalize(game.metadata.black));
  if (white === black) return null;
  return white ? "w" : "b";
}
