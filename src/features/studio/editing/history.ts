import type { VideoProject } from "@/features/studio/scene/scene.types";

export const HISTORY_LIMIT = 20;

export interface ProjectHistory {
  past: VideoProject[];
  present: VideoProject;
  future: VideoProject[];
}

export function createHistory(project: VideoProject): ProjectHistory {
  return { past: [], present: project, future: [] };
}

export function pushHistory(
  history: ProjectHistory,
  next: VideoProject,
  limit = HISTORY_LIMIT,
): ProjectHistory {
  if (next === history.present) return history;
  return {
    past: [...history.past, history.present].slice(-limit),
    present: next,
    future: [],
  };
}

export function undoHistory(history: ProjectHistory): ProjectHistory {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoHistory(history: ProjectHistory): ProjectHistory {
  const next = history.future[0];
  if (!next) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}
