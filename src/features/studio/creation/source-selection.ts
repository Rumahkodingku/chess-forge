import type { Game } from "@/features/games/types";
import type {
  CriticalMomentReference,
  SourceSelection,
  TemplateSceneRules,
} from "@/features/studio/scene/scene.types";
import { ValidationError } from "@/lib/errors";

export interface SourceBlock {
  fromPly: number;
  toPly: number;
  moment?: CriticalMomentReference;
}

export function referenceFromMoment(moment: {
  ply: number;
  san: string;
  classification?: string;
  reason?: string;
}): CriticalMomentReference {
  return {
    ply: moment.ply,
    san: moment.san,
    classification: moment.classification,
    reason: moment.reason,
  };
}

function groupRange(
  fromPly: number,
  toPly: number,
  movesPerScene: number,
): SourceBlock[] {
  const blocks: SourceBlock[] = [];
  for (let start = fromPly; start <= toPly; start += movesPerScene) {
    blocks.push({
      fromPly: start,
      toPly: Math.min(toPly, start + movesPerScene - 1),
    });
  }
  return blocks;
}

export function momentBlocks(
  moveCount: number,
  moments: CriticalMomentReference[],
  leadInPlies: number,
  trailInPlies: number,
): SourceBlock[] {
  const blocks = moments
    .filter((moment) => moment.ply >= 1 && moment.ply <= moveCount)
    .map((moment) => ({
      fromPly: Math.max(1, moment.ply - leadInPlies),
      toPly: Math.min(moveCount, moment.ply + trailInPlies),
      moment,
    }))
    .sort((left, right) => left.fromPly - right.fromPly);

  const merged: SourceBlock[] = [];
  for (const block of blocks) {
    const previous = merged.at(-1);
    if (previous && block.fromPly <= previous.toPly + 1) {
      previous.toPly = Math.max(previous.toPly, block.toPly);
      if (block.moment && block.moment.ply > (previous.moment?.ply ?? 0)) {
        previous.moment = block.moment;
      }
    } else {
      merged.push({ ...block });
    }
  }
  return merged;
}

export function selectSourcePlies(
  game: Game,
  selection: SourceSelection,
  rules: TemplateSceneRules,
): SourceBlock[] {
  const moveCount = game.moves.length;
  if (selection.mode === "full") {
    if (!moveCount) return [];
    return groupRange(1, moveCount, rules.movesPerScene);
  }

  if (selection.mode === "range") {
    if (
      selection.fromPly < 1 ||
      selection.toPly > moveCount ||
      selection.fromPly > selection.toPly
    ) {
      throw new ValidationError(
        "The selected move range is outside the game.",
        "Choose a start and end move inside the game.",
      );
    }
    return groupRange(selection.fromPly, selection.toPly, rules.movesPerScene);
  }

  const blocks = momentBlocks(
    moveCount,
    selection.moments,
    selection.leadInPlies,
    selection.trailInPlies,
  );
  return blocks.length ? blocks : groupRange(1, moveCount, rules.movesPerScene);
}
