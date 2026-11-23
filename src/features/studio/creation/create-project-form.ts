import type { GameSummary } from "@/features/analysis/types";
import type { Game } from "@/features/games/types";
import { referenceFromMoment } from "@/features/studio/creation/source-selection";
import type {
  CriticalMomentReference,
  SourceSelection,
} from "@/features/studio/scene/scene.types";

export type ProjectSourceMode = "full" | "moments" | "range";

export interface CreateProjectFormState {
  sourceMode: ProjectSourceMode;
  moments: CriticalMomentReference[];
  leadInPlies: number;
  trailInPlies: number;
  fromPly: number;
  toPly: number;
}

export function initialFormState(
  summary: GameSummary | null,
  moveCount: number,
  defaults: {
    sourceMode: ProjectSourceMode;
    leadInPlies: number;
    trailInPlies: number;
  },
): CreateProjectFormState {
  const sourceMode =
    defaults.sourceMode === "moments" && !summary?.criticalMoments.length
      ? "full"
      : defaults.sourceMode;
  return {
    sourceMode,
    moments: (summary?.criticalMoments ?? [])
      .slice(0, 3)
      .map((moment) => referenceFromMoment(moment)),
    leadInPlies: defaults.leadInPlies,
    trailInPlies: defaults.trailInPlies,
    fromPly: 1,
    toPly: Math.max(1, Math.min(moveCount, 6)),
  };
}

export function buildSourceSelection(
  form: CreateProjectFormState,
  game: Game,
): SourceSelection {
  if (form.sourceMode === "moments" && form.moments.length) {
    return {
      mode: "moments",
      moments: form.moments,
      leadInPlies: Math.max(0, Math.floor(form.leadInPlies)),
      trailInPlies: Math.max(0, Math.floor(form.trailInPlies)),
    };
  }
  if (form.sourceMode === "range") {
    return {
      mode: "range",
      fromPly: Math.max(1, Math.floor(form.fromPly)),
      toPly: Math.min(game.moves.length, Math.floor(form.toPly)),
    };
  }
  return { mode: "full" };
}
